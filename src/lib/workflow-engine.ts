/**
 * Workflow Orchestrator — manages workflow lifecycle from templates.
 * Creates workflows from templates, starts them with business rule evaluation,
 * advances steps with dependency checking.
 */

import { db } from '@/lib/db';
import { evaluateRulesForWorkflow, type RuleEvaluationResult } from '@/lib/business-rules-engine';
import { checkWorkflowDependencies, computeWorkflowCompleteness, type DependencyReport } from '@/lib/dependency-checker';

export type StepType =
  | 'define_goal'
  | 'identify_data'
  | 'find_documents'
  | 'extract'
  | 'check_completeness'
  | 'fill_template'
  | 'user_review'
  | 'export';

export interface WorkflowStepInput {
  name: string;
  description?: string;
  stepType: StepType;
  requiredEntities?: string[];
  requiredDocuments?: string[];
  requiredTemplates?: string[];
  templateId?: string;
}

export interface CreateWorkflowInput {
  name: string;
  description?: string;
  steps: WorkflowStepInput[];
  templateId?: string;
  projectId?: string;
}

// ==================== TEMPLATE-BASED CREATION ====================

/**
 * Create a workflow instance from a WorkflowTemplate with its defaultSteps.
 */
export async function createWorkflowFromTemplate(
  templateId: string,
  projectId?: string,
  name?: string
) {
  const template = await db.workflowTemplate.findUnique({
    where: { id: templateId },
  });

  if (!template) {
    throw new Error(`Шаблон процесса не найден: ${templateId}`);
  }

  const defaultSteps: Array<{
    stepType: string;
    name: string;
    description?: string;
    requiredEntities?: string[];
    requiredDocuments?: string[];
  }> = template.defaultSteps ? safeParse(template.defaultSteps) : [];

  const workflowName = name || template.name;

  const workflow = await db.workflow.create({
    data: {
      name: workflowName,
      description: template.description,
      templateId: template.id,
      projectId: projectId || null,
      status: 'draft',
      currentStep: 0,
      dataRequirements: template.requiredEntityTypes
        ? JSON.stringify({
            requiredEntities: safeParse(template.requiredEntityTypes),
            requiredDocuments: safeParse(template.requiredDocumentTypes || '[]'),
          })
        : null,
      steps: {
        create: defaultSteps.map((step, index) => ({
          stepOrder: index + 1,
          name: step.name,
          description: step.description || null,
          stepType: step.stepType,
          requiredEntities: step.requiredEntities ? JSON.stringify(step.requiredEntities) : null,
          requiredDocuments: step.requiredDocuments ? JSON.stringify(step.requiredDocuments) : null,
          status: 'pending',
        })),
      },
    },
    include: { steps: { orderBy: { stepOrder: 'asc' } }, template: true },
  });

  return workflow;
}

// ==================== WORKFLOW LIFECYCLE ====================

/**
 * Create a new workflow with steps (manual, no template).
 */
export async function createWorkflow(data: CreateWorkflowInput) {
  const workflow = await db.workflow.create({
    data: {
      name: data.name,
      description: data.description,
      templateId: data.templateId || null,
      projectId: data.projectId || null,
      status: 'draft',
      currentStep: 0,
      steps: {
        create: data.steps.map((step, index) => ({
          stepOrder: index + 1,
          name: step.name,
          description: step.description || null,
          stepType: step.stepType,
          requiredEntities: step.requiredEntities ? JSON.stringify(step.requiredEntities) : null,
          requiredDocuments: step.requiredDocuments ? JSON.stringify(step.requiredDocuments) : null,
          requiredTemplates: step.requiredTemplates ? JSON.stringify(step.requiredTemplates) : null,
          templateId: step.templateId || null,
          status: 'pending',
        })),
      },
    },
    include: { steps: { orderBy: { stepOrder: 'asc' } }, template: true },
  });

  return workflow;
}

/**
 * Start a workflow: set in_progress, evaluate business rules, compute data requirements.
 */
export async function startWorkflow(workflowId: string, projectId?: string): Promise<void> {
  const workflow = await db.workflow.findUnique({
    where: { id: workflowId },
    include: { template: true },
  });

  if (!workflow) {
    throw new Error(`Процесс не найден: ${workflowId}`);
  }

  const effectiveProjectId = projectId || workflow.projectId;
  if (!effectiveProjectId) {
    throw new Error('Необходимо указать projectId для запуска процесса');
  }

  // Evaluate business rules
  let ruleResults: RuleEvaluationResult[] = [];
  try {
    ruleResults = await evaluateRulesForWorkflow(workflowId);
  } catch (err) {
    console.warn('Failed to evaluate business rules:', err);
  }

  // Aggregate data requirements from rules + template
  const allRequiredEntities = new Set<string>();
  const allRequiredDocuments = new Set<string>();

  // From template
  if (workflow.template) {
    const tmplEntities = safeParse<string[]>(workflow.template.requiredEntityTypes || '[]');
    const tmplDocs = safeParse<string[]>(workflow.template.requiredDocumentTypes || '[]');
    tmplEntities.forEach((e) => allRequiredEntities.add(e));
    tmplDocs.forEach((d) => allRequiredDocuments.add(d));
  }

  // From matching rules
  for (const result of ruleResults) {
    if (result.triggerMatched) {
      result.requiredEntities.forEach((e) => allRequiredEntities.add(e));
      result.requiredDocuments.forEach((d) => allRequiredDocuments.add(d));
    }
  }

  const dataRequirements = {
    requiredEntities: [...allRequiredEntities],
    requiredDocuments: [...allRequiredDocuments],
    triggeredRules: ruleResults.filter((r) => r.triggerMatched).map((r) => ({
      ruleId: r.ruleId,
      ruleName: r.ruleName,
    })),
  };

  // Update workflow
  await db.workflow.update({
    where: { id: workflowId },
    data: {
      projectId: effectiveProjectId,
      status: 'in_progress',
      currentStep: 1,
      dataRequirements: JSON.stringify(dataRequirements),
    },
  });

  // Mark first step as in_progress
  const firstStep = await db.workflowStep.findFirst({
    where: { workflowId, stepOrder: 1 },
  });
  if (firstStep) {
    await db.workflowStep.update({
      where: { id: firstStep.id },
      data: { status: 'in_progress' },
    });
  }

  // Compute initial completeness
  await computeWorkflowCompleteness(workflowId);
}

/**
 * Advance workflow to the next step.
 * Runs dependency check before advancing. If blocked, returns dependency report.
 */
export async function advanceWorkflow(
  workflowId: string
): Promise<{
  canAdvance: boolean;
  nextStep: { stepOrder: number; name: string; stepType: string } | null;
  missingRequirements: string[];
  dependencyReport: DependencyReport | null;
}> {
  const workflow = await db.workflow.findUnique({
    where: { id: workflowId },
    include: {
      steps: { orderBy: { stepOrder: 'asc' } },
      project: true,
      template: true,
    },
  });

  if (!workflow) {
    throw new Error(`Процесс не найден: ${workflowId}`);
  }

  if (workflow.status === 'completed') {
    return { canAdvance: false, nextStep: null, missingRequirements: ['Процесс уже завершён'], dependencyReport: null };
  }

  if (workflow.status === 'cancelled') {
    return { canAdvance: false, nextStep: null, missingRequirements: ['Процесс отменён'], dependencyReport: null };
  }

  if (workflow.status === 'draft') {
    return { canAdvance: false, nextStep: null, missingRequirements: ['Процесс не запущен'], dependencyReport: null };
  }

  const currentStep = workflow.steps.find((s) => s.stepOrder === workflow.currentStep);
  if (!currentStep) {
    return { canAdvance: false, nextStep: null, missingRequirements: ['Текущий шаг не найден'], dependencyReport: null };
  }

  // Skip dependency check for steps that don't require data (define_goal, user_review, export)
 const skipCheckTypes = ['define_goal', 'user_review', 'export'];
  if (!skipCheckTypes.includes(currentStep.stepType)) {
    // Run dependency check
    const depReport = await checkWorkflowDependencies(workflowId);

    if (!depReport.canProceed) {
      // Mark step as blocked
      await db.workflowStep.update({
        where: { id: currentStep.id },
        data: {
          status: 'blocked',
          missingItems: JSON.stringify(depReport.actions.map((a) => a.description)),
        },
      });

      // Save errors to workflow
      await db.workflow.update({
        where: { id: workflowId },
        data: {
          errors: JSON.stringify(depReport.actions.map((a) => a.description)),
        },
      });

      return {
        canAdvance: false,
        nextStep: null,
        missingRequirements: depReport.actions.map((a) => a.description),
        dependencyReport: depReport,
      };
    }
  }

  // Mark current step as completed
  await db.workflowStep.update({
    where: { id: currentStep.id },
    data: { status: 'completed' },
  });

  // Find next step
  const nextStep = workflow.steps.find((s) => s.stepOrder === workflow.currentStep + 1);

  if (!nextStep) {
    // No more steps — workflow completed
    await db.workflow.update({
      where: { id: workflowId },
      data: { status: 'completed' },
    });
    await computeWorkflowCompleteness(workflowId);
    return { canAdvance: true, nextStep: null, missingRequirements: [], dependencyReport: null };
  }

  // Advance to next step
  await db.workflow.update({
    where: { id: workflowId },
    data: { currentStep: nextStep.stepOrder, errors: null },
  });

  await db.workflowStep.update({
    where: { id: nextStep.id },
    data: { status: 'in_progress' },
  });

  // Update completeness
  await computeWorkflowCompleteness(workflowId);

  return {
    canAdvance: true,
    nextStep: { stepOrder: nextStep.stepOrder, name: nextStep.name, stepType: nextStep.stepType },
    missingRequirements: [],
    dependencyReport: null,
  };
}

/**
 * Get full workflow status with steps, completeness, project entities summary.
 */
export async function getWorkflowStatus(workflowId: string) {
  const workflow = await db.workflow.findUnique({
    where: { id: workflowId },
    include: {
      steps: { orderBy: { stepOrder: 'asc' } },
      project: {
        include: {
          entities: { distinct: ['entityType'], select: { entityType: true } },
          documents: { include: { document: true } },
        },
      },
      template: true,
    },
  });

  return workflow;
}

/**
 * Cancel a workflow.
 */
export async function cancelWorkflow(workflowId: string): Promise<void> {
  const workflow = await db.workflow.findUnique({ where: { id: workflowId } });
  if (!workflow) {
    throw new Error(`Процесс не найден: ${workflowId}`);
  }

  // Mark current in_progress step as skipped
  if (workflow.currentStep > 0) {
    await db.workflowStep.updateMany({
      where: { workflowId, stepOrder: workflow.currentStep, status: 'in_progress' },
      data: { status: 'skipped' },
    });
  }

  await db.workflow.update({
    where: { id: workflowId },
    data: { status: 'cancelled' },
  });
}

// ==================== HELPERS ====================

function safeParse<T>(str: string | null, fallback: T = [] as unknown as T): T {
  if (!str) return fallback;
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}
