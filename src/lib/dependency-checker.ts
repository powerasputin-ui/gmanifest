/**
 * Dependency Checker — tells the system and user what's missing for a workflow step.
 * "Система говорит: мне нужны X, Y. Двух нет. Показывает."
 */

import { db } from '@/lib/db';
import { ENTITY_FIELDS, type EntityType } from '@/lib/unified-model';
import { checkDataCompleteness, getMissingDocuments } from './business-rules-engine';

export { checkDataCompleteness } from './business-rules-engine';

export interface DependencyReport {
  stepName: string;
  canProceed: boolean;
  completenessPercent: number;
  entities: Array<{
    type: string;
    status: 'complete' | 'partial' | 'missing';
    foundFields: number;
    totalFields: number;
    sources: string[];
  }>;
  documents: Array<{
    type: string;
    status: 'present' | 'missing';
    documentIds: string[];
    documentNames: string[];
  }>;
  actions: Array<{
    type: 'upload_document' | 'extract_entity' | 'fill_manually' | 'resolve_conflict';
    description: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

/**
 * Check dependencies for a specific workflow step by order.
 */
export async function checkStepDependencies(
  workflowId: string,
  stepOrder: number
): Promise<DependencyReport> {
  const workflow = await db.workflow.findUnique({
    where: { id: workflowId },
    include: {
      steps: { orderBy: { stepOrder: 'asc' } },
      project: true,
      template: true,
    },
  });

  if (!workflow) throw new Error(`Workflow not found: ${workflowId}`);

  const step = workflow.steps.find((s) => s.stepOrder === stepOrder);
  if (!step) throw new Error(`Step ${stepOrder} not found in workflow`);

  return buildDependencyReport(step, workflow.projectId ?? null, workflow.template?.category ?? null);
}

/**
 * Check dependencies for the current step of a workflow.
 */
export async function checkWorkflowDependencies(
  workflowId: string
): Promise<DependencyReport> {
  const workflow = await db.workflow.findUnique({
    where: { id: workflowId },
    include: {
      steps: { orderBy: { stepOrder: 'asc' } },
      project: true,
      template: true,
    },
  });

  if (!workflow) throw new Error(`Workflow not found: ${workflowId}`);

  const currentStep = workflow.steps.find((s) => s.stepOrder === workflow.currentStep);
  if (!currentStep) {
    return {
      stepName: '(нет текущего шага)',
      canProceed: false,
      completenessPercent: 0,
      entities: [],
      documents: [],
      actions: [],
    };
  }

  return buildDependencyReport(currentStep, workflow.projectId ?? null, workflow.template?.category ?? null);
}

/**
 * Compute overall workflow completeness (0-100%) and update the workflow record.
 */
export async function computeWorkflowCompleteness(workflowId: string): Promise<number> {
  const workflow = await db.workflow.findUnique({
    where: { id: workflowId },
    include: {
      steps: { orderBy: { stepOrder: 'asc' } },
      project: true,
      template: true,
    },
  });

  if (!workflow || !workflow.projectId) {
    await db.workflow.update({
      where: { id: workflowId },
      data: { dataCompleteness: 0 },
    });
    return 0;
  }

  const requiredEntityTypes: string[] = workflow.template?.requiredEntityTypes
    ? safeParse<string[]>(workflow.template.requiredEntityTypes)
    : [];

  // If no template, gather required entities from all steps
  let allRequiredEntities: string[] = [];
  if (requiredEntityTypes.length > 0) {
    allRequiredEntities = requiredEntityTypes;
  } else {
    for (const step of workflow.steps) {
      const stepEntities: string[] = step.requiredEntities ? safeParse<string[]>(step.requiredEntities) : [];
      allRequiredEntities = [...allRequiredEntities, ...stepEntities];
    }
    allRequiredEntities = [...new Set(allRequiredEntities)];
  }

  if (allRequiredEntities.length === 0) {
    await db.workflow.update({
      where: { id: workflowId },
      data: { dataCompleteness: 100 },
    });
    return 100;
  }

  const completenessChecks = await checkDataCompleteness(workflow.projectId, allRequiredEntities);
  const avgCompleteness = completenessChecks.length > 0
    ? Math.round(completenessChecks.reduce((sum, c) => sum + c.completeness, 0) / completenessChecks.length)
    : 0;

  await db.workflow.update({
    where: { id: workflowId },
    data: { dataCompleteness: avgCompleteness },
  });

  return avgCompleteness;
}

// ==================== INTERNAL ====================

async function buildDependencyReport(
  step: {
    name: string;
    requiredEntities: string | null;
    requiredDocuments: string | null;
    requiredTemplates: string | null;
    stepType: string;
  },
  projectId: string | null,
  _templateCategory: string | null
): Promise<DependencyReport> {
  const requiredEntities: string[] = step.requiredEntities ? safeParse(step.requiredEntities) : [];
  const requiredDocuments: string[] = step.requiredDocuments ? safeParse(step.requiredDocuments) : [];

  const report: DependencyReport = {
    stepName: step.name,
    canProceed: true,
    completenessPercent: 100,
    entities: [],
    documents: [],
    actions: [],
  };

  // If no project assigned yet
  if (!projectId) {
    if (requiredEntities.length > 0 || requiredDocuments.length > 0) {
      report.canProceed = false;
      report.actions.push({
        type: 'fill_manually',
        description: 'Необходимо привязать проект к процессу',
        priority: 'high',
      });
    }
    return report;
  }

  // Check entity completeness
  if (requiredEntities.length > 0) {
    const entityChecks = await checkDataCompleteness(projectId, requiredEntities);

    for (const check of entityChecks) {
      const fields = ENTITY_FIELDS[check.entity as EntityType] || [];
      let status: 'complete' | 'partial' | 'missing';
      if (check.completeness >= 100) {
        status = 'complete';
      } else if (check.completeness > 0) {
        status = 'partial';
      } else {
        status = 'missing';
      }

      report.entities.push({
        type: check.entity,
        status,
        foundFields: fields.length - check.missingFields.length,
        totalFields: fields.length,
        sources: check.sources,
      });

      if (status === 'missing') {
        report.canProceed = false;
        report.actions.push({
          type: 'extract_entity',
          description: `Отсутствуют данные типа «${check.entity}». Загрузите документ или заполните вручную.`,
          priority: 'high',
        });
      } else if (status === 'partial') {
        report.actions.push({
          type: 'fill_manually',
          description: `«${check.entity}» заполнено на ${check.completeness}%. Отсутствуют: ${check.missingFields.join(', ') || 'часть данных'}.`,
          priority: 'medium',
        });
      }
    }
  }

  // Check document availability
  if (requiredDocuments.length > 0) {
    const docChecks = await getMissingDocuments(projectId, requiredDocuments);

    for (const docCheck of docChecks) {
      const docIds: string[] = [];
      const docNames: string[] = [];

      if (docCheck.status === 'present') {
        const projectDocs = await db.projectDocument.findMany({
          where: { projectId },
          include: { document: true },
        });
        for (const pd of projectDocs) {
          if (pd.document.classificationType === docCheck.type) {
            docIds.push(pd.document.id);
            docNames.push(pd.document.fileName);
          }
        }
      }

      report.documents.push({
        type: docCheck.type,
        status: docCheck.status,
        documentIds: docIds,
        documentNames: docNames,
      });

      if (docCheck.status === 'missing') {
        report.canProceed = false;
        report.actions.push({
          type: 'upload_document',
          description: `Отсутствует документ типа «${docCheck.type}». Пожалуйста, загрузите.`,
          priority: 'high',
        });
      }
    }
  }

  // Compute overall completeness
  const entityScores = report.entities.map((e) =>
    e.totalFields > 0 ? (e.foundFields / e.totalFields) * 100 : 0
  );
  const docScores = report.documents.map((d) =>
    d.status === 'present' ? 100 : 0
  );
  const allScores = [...entityScores, ...docScores];

  report.completenessPercent = allScores.length > 0
    ? Math.round(allScores.reduce((s, v) => s + v, 0) / allScores.length)
    : 100;

  // Sort actions by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  report.actions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return report;
}

function safeParse<T>(str: string | null, fallback: T = [] as unknown as T): T {
  if (!str) return fallback;
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}
