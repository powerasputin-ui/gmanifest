/**
 * Business Rules Engine — evaluates business rules for workflows.
 * When X happens, require Y, extract Z.
 */

import { db } from '@/lib/db';
import { ENTITY_FIELDS, type EntityType } from '@/lib/unified-model';

export interface RuleEvaluationResult {
  ruleId: string;
  ruleName: string;
  triggerMatched: boolean;
  requiredEntities: string[];
  requiredDocuments: string[];
  autoExtractEntities: string[];
  validationLogic: any[];
}

export interface CompletenessCheck {
  entity: string;
  required: boolean;
  found: boolean;
  completeness: number; // 0-100%
  missingFields: string[];
  sources: string[]; // document names that contributed
}

export interface AutoExtractionPlan {
  entityType: string;
  profileId: string;
  profileName: string;
}

/**
 * Evaluate all active business rules for a workflow.
 */
export async function evaluateRulesForWorkflow(workflowId: string): Promise<RuleEvaluationResult[]> {
  const workflow = await db.workflow.findUnique({
    where: { id: workflowId },
    include: { template: true },
  });

  if (!workflow) {
    throw new Error(`Workflow not found: ${workflowId}`);
  }

  // Get rules: template-specific + global rules (no workflowTemplateId)
  const rules = await db.businessRule.findMany({
    where: {
      isActive: true,
      OR: [
        { workflowTemplateId: workflow.templateId },
        { workflowTemplateId: null },
      ],
    },
    orderBy: { priority: 'desc' },
  });

  // Build context for trigger evaluation
  const context: Record<string, unknown> = {
    workflowId: workflow.id,
    workflowStatus: workflow.status,
    projectId: workflow.projectId,
    templateId: workflow.templateId,
    templateCategory: workflow.template?.category || null,
  };

  // If project exists, get document types present
  if (workflow.projectId) {
    const projectDocs = await db.projectDocument.findMany({
      where: { projectId: workflow.projectId },
      include: { document: true },
    });
    const docTypes = projectDocs.map((pd) => pd.document.classificationType).filter(Boolean);
    context.projectDocumentTypes = docTypes;

    // Get entity types present
    const entities = await db.projectEntity.findMany({
      where: { projectId: workflow.projectId },
      distinct: ['entityType'],
    });
    context.projectEntityTypes = entities.map((e) => e.entityType);
  }

  return rules.map((rule) => evaluateRule(rule, context));
}

/**
 * Find and evaluate rules that trigger based on document type.
 */
export async function evaluateRulesForDocument(
  projectId: string,
  documentType: string
): Promise<RuleEvaluationResult[]> {
  const rules = await db.businessRule.findMany({
    where: { isActive: true },
    orderBy: { priority: 'desc' },
  });

  const context: Record<string, unknown> = {
    projectId,
    documentType,
  };

  // Get existing entity types in project
  const entities = await db.projectEntity.findMany({
    where: { projectId },
    distinct: ['entityType'],
  });
  context.projectEntityTypes = entities.map((e) => e.entityType);

  return rules
    .map((rule) => evaluateRule(rule, context))
    .filter((r) => r.triggerMatched);
}

/**
 * Check data completeness for required entity types in a project.
 */
export async function checkDataCompleteness(
  projectId: string,
  requiredEntities: string[]
): Promise<CompletenessCheck[]> {
  const results: CompletenessCheck[] = [];

  for (const entityType of requiredEntities) {
    const entities = await db.projectEntity.findMany({
      where: { projectId, entityType },
    });

    const fields = ENTITY_FIELDS[entityType as EntityType] || [];
    const totalFields = fields.length;
    const foundFieldNames = new Set(entities.map((e) => e.fieldName));
    const foundFields = foundFieldNames.size;
    const completeness = totalFields > 0 ? Math.round((foundFields / totalFields) * 100) : 0;

    const missingFields = fields
      .map((f) => f.field)
      .filter((f) => !foundFieldNames.has(f));

    // Collect source document IDs
    const sourceDocIds = [...new Set(entities.map((e) => e.sourceDocumentId).filter(Boolean) as string[])];
    const sourceDocs = sourceDocIds.length > 0
      ? await db.document.findMany({
          where: { id: { in: sourceDocIds } },
          select: { id: true, fileName: true },
        })
      : [];

    results.push({
      entity: entityType,
      required: true,
      found: entities.length > 0,
      completeness,
      missingFields,
      sources: sourceDocs.map((d) => d.fileName),
    });
  }

  return results;
}

/**
 * Check which required document types are missing from a project.
 */
export async function getMissingDocuments(
  projectId: string,
  requiredDocTypes: string[]
): Promise<Array<{ type: string; status: 'present' | 'missing'; count: number }>> {
  const projectDocs = await db.projectDocument.findMany({
    where: { projectId },
    include: { document: true },
  });

  const presentTypes = new Map<string, number>();
  for (const pd of projectDocs) {
    const docType = pd.document.classificationType || 'unknown';
    presentTypes.set(docType, (presentTypes.get(docType) || 0) + 1);
  }

  return requiredDocTypes.map((docType) => ({
    type: docType,
    status: presentTypes.has(docType) ? 'present' as const : 'missing' as const,
    count: presentTypes.get(docType) || 0,
  }));
}

/**
 * Return which entity profiles should be used to extract which entities.
 */
export async function getAutoExtractionPlan(
  requiredEntities: string[]
): Promise<AutoExtractionPlan[]> {
  const profiles = await db.extractionProfile.findMany({
    where: {
      isActive: true,
      entityType: { in: requiredEntities },
    },
  });

  return profiles.map((p) => ({
    entityType: p.entityType,
    profileId: p.id,
    profileName: p.name,
  }));
}

// ==================== INTERNAL HELPERS ====================

function evaluateRule(
  rule: {
    id: string;
    name: string;
    triggerType: string;
    triggerCondition: string | null;
    requiredEntities: string | null;
    requiredDocuments: string | null;
    autoExtractEntities: string | null;
    validationLogic: string | null;
  },
  context: Record<string, unknown>
): RuleEvaluationResult {
  const triggerMatched = checkTrigger(rule.triggerType, rule.triggerCondition, context);

  return {
    ruleId: rule.id,
    ruleName: rule.name,
    triggerMatched,
    requiredEntities: triggerMatched ? safeParseJson(rule.requiredEntities, []) : [],
    requiredDocuments: triggerMatched ? safeParseJson(rule.requiredDocuments, []) : [],
    autoExtractEntities: triggerMatched ? safeParseJson(rule.autoExtractEntities, []) : [],
    validationLogic: triggerMatched ? safeParseJson(rule.validationLogic, []) : [],
  };
}

function checkTrigger(
  triggerType: string,
  triggerCondition: string | null,
  context: Record<string, unknown>
): boolean {
  const condition = safeParseJson(triggerCondition, {});

  switch (triggerType) {
    case 'document_type': {
      const docType = (condition as Record<string, unknown>).documentType as string | undefined;
      const projectDocTypes = (context.projectDocumentTypes as string[]) || [];
      if (!docType) return false;
      return projectDocTypes.includes(docType) || context.documentType === docType;
    }
    case 'entity_present': {
      const entityType = (condition as Record<string, unknown>).entityType as string | undefined;
      const projectEntityTypes = (context.projectEntityTypes as string[]) || [];
      if (!entityType) return false;
      return projectEntityTypes.includes(entityType);
    }
    case 'workflow_category': {
      const category = (condition as Record<string, unknown>).category as string | undefined;
      if (!category) return false;
      return context.templateCategory === category;
    }
    case 'workflow_step': {
      const stepType = (condition as Record<string, unknown>).stepType as string | undefined;
      if (!stepType) return false;
      return context.currentStepType === stepType;
    }
    case 'always':
      return true;
    default:
      return false;
  }
}

function safeParseJson<T>(str: string | null, fallback: T): T {
  if (!str) return fallback;
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}
