const BASE = '/api';

// ── Types ──────────────────────────────────────────────

export interface Document {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  status: 'uploaded' | 'processing' | 'completed' | 'review' | 'error';
  markdown: string | null;
  pageCount: number | null;
  metadata: string | null;
  classificationType: string | null;
  classificationConfidence: number | null;
  projectId?: string | null;
  projectName?: string | null;
  createdAt: string;
  updatedAt: string;
  extractionRuns?: ExtractionRun[];
  _count?: { extractionRuns: number };
}

export interface ExtractionRun {
  id: string;
  documentId: string;
  profileId: string;
  status: 'processing' | 'completed' | 'review' | 'error';
  rawLlmResponse: string | null;
  processedResult: string | null;
  processingTime: number | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  document?: Document;
  profile?: ExtractionProfile;
  fields?: ExtractedField[];
  corrections?: Correction[];
}

export interface ExtractedField {
  id: string;
  runId: string;
  fieldName: string;
  value: string | null;
  confidence: number | null;
  isValid: boolean;
  validationError: string | null;
  createdAt: string;
}

export interface Correction {
  id: string;
  runId: string;
  fieldName: string;
  originalValue: string | null;
  correctedValue: string;
  originalMarkdown: string | null;
  correctedBy: string;
  createdAt: string;
}

export interface ExtractionProfile {
  id: string;
  name: string;
  description: string | null;
  entityType: string;
  jsonSchema: string;
  promptTemplate: string;
  validationRules: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { extractionRuns: number };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DashboardStats {
  totalDocuments: number;
  documentsByStatus: Array<{ status: string; count: number }>;
  averageProcessingTime: number;
  successRate: number;
  documentsInReview: number;
  totalRuns: number;
  completedRuns: number;
  errorRuns: number;
  runsByProfile: Array<{ profileId: string; profileName: string; count: number }>;
  recentDocuments: Document[];
}

export interface SettingItem {
  id: string;
  key: string;
  value: string;
  description: string | null;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export interface SettingsResponse {
  settings: SettingItem[];
  grouped: Record<string, Array<{ id: string; key: string; value: string; description: string | null }>>;
}

export interface HistoryResponse {
  document: Document;
  runs: (ExtractionRun & { profile: ExtractionProfile; fields: ExtractedField[]; corrections: Correction[] })[];
}

// ── V2 Types ───────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  clientName: string | null;
  contractorName: string | null;
  stage: string | null;
  createdAt: string;
  updatedAt: string;
  documentCount?: number;
  entityCount?: number;
}

export interface ProjectEntity {
  id: string;
  projectId: string;
  entityType: string;
  instanceId: string;
  fieldName: string;
  value: string | null;
  sourceDocumentId: string | null;
  confidence: number | null;
  isVerified: boolean;
  isPreferred: boolean;
}

export interface ProjectDetail extends Project {
  entities: ProjectEntity[];
  documents: Document[];
}

export interface ModelTree {
  [entityType: string]: {
    [instanceId: string]: {
      [fieldName: string]: ProjectEntity;
    };
  };
}

export interface Conflict {
  entityId: string;
  entityType: string;
  instanceId: string;
  fieldName: string;
  values: Array<{
    value: string;
    sourceDocumentId: string | null;
    confidence: number | null;
    documentName?: string;
  }>;
}

export interface Template {
  id: string;
  name: string;
  fileType: string;
  fileSize: number;
  variables: string[];
  createdAt: string;
  updatedAt: string;
  mappings?: TemplateMapping[];
  _count?: { mappings: number };
}

export interface TemplateMapping {
  id: string;
  templateId: string;
  templateVariable: string;
  modelPath: string | null;
  autoDetected: boolean;
  confirmed: boolean;
  createdAt: string;
}

export interface EntityTypeDefinition {
  name: string;
  label: string;
  fields: Array<{ name: string; label: string; type: string }>;
}

/** Русские лейблы типов сущностей (ключи — значения из ENTITY_TYPES на сервере). */
const ENTITY_TYPE_LABELS: Record<string, string> = {
  Company: 'Компания',
  Vessel: 'Судно',
  Personnel: 'Персонал',
  Well: 'Скважина',
  Operation: 'Операция',
  FinancialData: 'Финансовые данные',
  Permit: 'Разрешение',
  Incident: 'Инцидент',
  Weather: 'Погода',
  Equipment: 'Оборудование',
  Location: 'Локация',
  Port: 'Порт',
  Rig: 'Буровая установка',
  Campaign: 'Кампания',
  Task: 'Задача',
  Risk: 'Риск',
  WorkOrder: 'Наряд-заказ',
  Checklist: 'Чек-лист',
  Contract: 'Контракт',
  OrganizationRole: 'Роль в организации',
};

export interface Generation {
  id: string;
  projectId: string;
  templateId: string;
  status: string;
  outputFilePath: string | null;
  createdAt: string;
  template?: Template;
  project?: Project;
  sourceDocuments?: Document[];
}

// ── Workflow Templates ──────────────────────────────────

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  icon: string | null;
  color: string | null;
  requiredEntityTypes: string[];
  requiredDocumentTypes: string[];
  outputTemplates: string[];
  defaultSteps: WorkflowStepDef[];
  isActive: boolean;
  _count?: { workflows: number; rules: number };
  createdAt: string;
}

export interface WorkflowStepDef {
  name: string;
  stepType: string;
  description?: string;
  requiredEntities?: string[];
  requiredDocuments?: string[];
  requiredTemplates?: string[];
}

// ── Business Rules ──────────────────────────────────────

export interface BusinessRule {
  id: string;
  name: string;
  description: string | null;
  workflowTemplateId: string | null;
  triggerType: string;
  triggerCondition: Record<string, unknown> | null;
  requiredEntities: string[];
  requiredDocuments: string[];
  autoExtractEntities: string[];
  validationLogic: unknown[];
  priority: number;
  isActive: boolean;
  createdAt: string;
}

// ── Workflow Detail ─────────────────────────────────────

export interface WorkflowStepDetail {
  id: string;
  workflowId: string;
  stepOrder: number;
  name: string;
  description: string | null;
  stepType: string; // define_goal, identify_data, find_documents, extract, check_completeness, fill_template, user_review, export
  status: string; // pending, in_progress, completed, skipped, blocked
  requiredEntities: string[];
  requiredDocuments: string[];
  requiredTemplates: string[];
  outputData: string | null;
  missingItems: string[];
  templateId: string | null;
}

export interface WorkflowDetail {
  id: string;
  name: string;
  description: string | null;
  templateId: string | null;
  projectId: string | null;
  status: string; // draft, planning, in_progress, review, completed, cancelled
  currentStep: number;
  dataRequirements: {
    requiredEntities: string[];
    requiredDocuments: string[];
    triggeredRules: string[];
  } | null;
  dataCompleteness: number | null;
  errors: string[];
  steps: WorkflowStepDetail[];
  template?: WorkflowTemplate | null;
  project?: { id: string; name: string; status: string; entities?: ProjectEntity[]; documents?: Document[] } | null;
  createdAt: string;
  updatedAt: string;
}

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

// Keep legacy Workflow for listing (compat)
export interface Workflow {
  id: string;
  name: string;
  description: string | null;
  status: string;
  projectId: string | null;
  templateId: string | null;
  currentStep: number | null;
  dataCompleteness: number | null;
  steps?: WorkflowStepDetail[];
  template?: { id: string; name: string; category: string; color: string } | null;
  project?: { id: string; name: string; status: string } | null;
  _count?: { steps: number };
  createdAt: string;
  updatedAt: string;
}

// ── Helpers ────────────────────────────────────────────

/** Safely parse a JSON string, returning fallback on failure */
function safeJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function request<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Upload ─────────────────────────────────────────────

export async function uploadDocument(file: File): Promise<Document> {
  const form = new FormData();
  form.append('file', file);
  return request<Document>(`${BASE}/upload`, { method: 'POST', body: form });
}

// ── Documents ──────────────────────────────────────────

export async function getDocuments(params?: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}): Promise<PaginatedResponse<Document>> {
  const sp = new URLSearchParams();
  if (params?.page) sp.set('page', String(params.page));
  if (params?.limit) sp.set('limit', String(params.limit));
  if (params?.status) sp.set('status', params.status);
  if (params?.search) sp.set('search', params.search);
  const qs = sp.toString() ? `?${sp.toString()}` : '';
  return request<PaginatedResponse<Document>>(`${BASE}/documents${qs}`);
}

export async function getDocument(id: string): Promise<Document> {
  return request<Document>(`${BASE}/documents/${id}`);
}

export async function deleteDocument(id: string): Promise<void> {
  await request<void>(`${BASE}/documents/${id}`, { method: 'DELETE' });
}

export async function bulkDeleteDocuments(ids: string[]): Promise<{ count: number }> {
  return request<{ count: number }>(`${BASE}/documents/bulk-delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
}

export async function processDocument(id: string, profileId: string): Promise<ExtractionRun> {
  return request<ExtractionRun>(`${BASE}/documents/${id}/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profileId }),
  });
}

// ── Profiles ──────────────────────────────────────────

export async function getProfiles(entityType?: string): Promise<ExtractionProfile[]> {
  const qs = entityType ? `?entityType=${entityType}` : '';
  return request<ExtractionProfile[]>(`${BASE}/profiles${qs}`);
}

export async function getProfile(id: string): Promise<ExtractionProfile> {
  return request<ExtractionProfile>(`${BASE}/profiles/${id}`);
}

export async function createProfile(data: {
  name: string;
  description?: string;
  entityType: string;
  jsonSchema: string;
  promptTemplate: string;
  validationRules?: string;
  isActive?: boolean;
}): Promise<ExtractionProfile> {
  return request<ExtractionProfile>(`${BASE}/profiles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function updateProfile(
  id: string,
  data: Partial<{
    name: string;
    description: string;
    entityType: string;
    jsonSchema: string;
    promptTemplate: string;
    validationRules: string;
    isActive: boolean;
  }>,
): Promise<ExtractionProfile> {
  return request<ExtractionProfile>(`${BASE}/profiles/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function deleteProfile(id: string): Promise<void> {
  await request<void>(`${BASE}/profiles/${id}`, { method: 'DELETE' });
}

// ── Runs ──────────────────────────────────────────────

export async function getRun(id: string): Promise<ExtractionRun> {
  return request<ExtractionRun>(`${BASE}/runs/${id}`);
}

export async function submitReview(
  id: string,
  fields: Array<{ fieldName: string; correctedValue: string }>,
): Promise<ExtractionRun> {
  return request<ExtractionRun>(`${BASE}/runs/${id}/review`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
}

// ── History ──────────────────────────────────────────

export async function getHistory(documentId: string): Promise<HistoryResponse> {
  return request<HistoryResponse>(`${BASE}/history/${documentId}`);
}

// ── Dashboard ─────────────────────────────────────────

export async function getDashboardStats(): Promise<DashboardStats> {
  return request<DashboardStats>(`${BASE}/dashboard`);
}

// ── Settings ─────────────────────────────────────────

export async function getSettings(): Promise<SettingsResponse> {
  return request<SettingsResponse>(`${BASE}/settings`);
}

export async function updateSettings(items: Array<{ key: string; value: string }>): Promise<SettingItem[]> {
  return request<SettingItem[]>(`${BASE}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(items),
  });
}

export interface LlmTestResult {
  ok: boolean;
  provider?: string;
  model?: string;
  latencyMs?: number;
  error?: string;
}

export async function testLlmConnection(): Promise<LlmTestResult> {
  return request<LlmTestResult>(`${BASE}/settings/test-llm`, { method: 'POST' });
}

// ── Seed ─────────────────────────────────────────────

export async function seedData(): Promise<{ message: string }> {
  return request<{ message: string }>(`${BASE}/seed`, { method: 'POST' });
}

// ── V2: Projects ──────────────────────────────────────

export async function getProjects(): Promise<PaginatedResponse<Project>> {
  return request<PaginatedResponse<Project>>(`${BASE}/projects`);
}

export async function createProject(data: {
  name: string;
  description?: string;
  clientName?: string;
  contractorName?: string;
  stage?: string;
}): Promise<Project> {
  return request<Project>(`${BASE}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function getProject(id: string): Promise<ProjectDetail> {
  return request<ProjectDetail>(`${BASE}/projects/${id}`);
}

export async function deleteProject(id: string): Promise<void> {
  await request<void>(`${BASE}/projects/${id}`, { method: 'DELETE' });
}

export async function bulkDeleteProjects(ids: string[]): Promise<{ count: number }> {
  return request<{ count: number }>(`${BASE}/projects/bulk-delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
}

export async function getProjectModel(id: string): Promise<{ model: ModelTree; entities: ProjectEntity[] }> {
  return request<{ model: ModelTree; entities: ProjectEntity[] }>(`${BASE}/projects/${id}/model`);
}

export async function updateProjectEntity(
  projectId: string,
  data: { entityType: string; instanceId: string; fieldName: string; value: string },
): Promise<ProjectEntity> {
  return request<ProjectEntity>(`${BASE}/projects/${projectId}/model`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function getConflicts(projectId: string): Promise<Conflict[]> {
  return request<Conflict[]>(`${BASE}/projects/${projectId}/conflicts`);
}

export async function resolveConflict(
  projectId: string,
  data: { entityId: string; fieldName: string; preferredValue: string },
): Promise<void> {
  await request<void>(`${BASE}/projects/${projectId}/conflicts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function batchProcess(
  projectId: string,
  data: { documentIds: string[]; profileIds: Record<string, string> },
): Promise<{ message: string }> {
  return request<{ message: string }>(`${BASE}/projects/${projectId}/batch-process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

// ── V2: Templates ──────────────────────────────────────

export async function getTemplates(): Promise<{ data: Template[] }> {
  return request<{ data: Template[] }>(`${BASE}/templates`);
}

export async function uploadTemplate(file: File): Promise<Template> {
  const form = new FormData();
  form.append('file', file);
  return request<Template>(`${BASE}/templates`, { method: 'POST', body: form });
}

export async function getTemplate(id: string): Promise<Template> {
  return request<Template>(`${BASE}/templates/${id}`);
}

export async function deleteTemplate(id: string): Promise<void> {
  await request<void>(`${BASE}/templates/${id}`, { method: 'DELETE' });
}

export async function getTemplateMappings(templateId: string): Promise<TemplateMapping[]> {
  return request<TemplateMapping[]>(`${BASE}/templates/${templateId}/mappings`);
}

export async function createMapping(
  templateId: string,
  data: { templateVariable: string; modelPath: string },
): Promise<TemplateMapping> {
  return request<TemplateMapping>(`${BASE}/templates/${templateId}/mappings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function confirmMapping(
  templateId: string,
  data: { id: string; confirmed: boolean },
): Promise<TemplateMapping> {
  return request<TemplateMapping>(`${BASE}/templates/${templateId}/mappings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function aiMapTemplate(templateId: string): Promise<TemplateMapping[]> {
  return request<TemplateMapping[]>(`${BASE}/templates/${templateId}/ai-map`, {
    method: 'POST',
  });
}

// ── V2: Entity Types ──────────────────────────────────

export async function getEntityTypes(): Promise<EntityTypeDefinition[]> {
  // Сервер отдаёт { entityTypes: string[], entityFields: Record<type, {field,label,type}[]> } —
  // приводим к EntityTypeDefinition[].
  const raw = await request<{
    entityTypes: string[];
    entityFields: Record<string, Array<{ field: string; label: string; type: string }>>;
  }>(`${BASE}/entity-types`);
  return (raw.entityTypes || []).map((name) => ({
    name,
    label: ENTITY_TYPE_LABELS[name] || name,
    fields: (raw.entityFields?.[name] || []).map((f) => ({
      name: f.field,
      label: f.label,
      type: f.type,
    })),
  }));
}

// ── V2: Generation ────────────────────────────────────

export async function generateDocument(data: {
  projectId: string;
  templateId: string;
}): Promise<Generation> {
  return request<Generation>(`${BASE}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function getGeneration(id: string): Promise<Generation> {
  return request<Generation>(`${BASE}/generate/${id}`);
}

export async function downloadGeneration(id: string): Promise<Blob> {
  const res = await fetch(`${BASE}/generate/${id}/download`);
  if (!res.ok) throw new Error('Ошибка скачивания файла');
  return res.blob();
}

// ── Workflow Templates ────────────────────────────────

export async function getWorkflowTemplates(): Promise<{ data: WorkflowTemplate[] }> {
  const res = await request<{
    data: Array<{
      id: string;
      name: string;
      description: string | null;
      category: string;
      icon: string | null;
      color: string | null;
      requiredEntityTypes: string | null;
      requiredDocumentTypes: string | null;
      outputTemplates: string | null;
      defaultSteps: string | null;
      isActive: boolean;
      _count?: { workflows: number; rules: number };
      createdAt: string;
    }>;
  }>(`${BASE}/workflow-templates`);
  return {
    data: res.data.map((t) => ({
      ...t,
      requiredEntityTypes: safeJson<string[]>(t.requiredEntityTypes, []),
      requiredDocumentTypes: safeJson<string[]>(t.requiredDocumentTypes, []),
      outputTemplates: safeJson<string[]>(t.outputTemplates, []),
      defaultSteps: safeJson<WorkflowStepDef[]>(t.defaultSteps, []),
    })),
  };
}

export async function getWorkflowTemplate(id: string): Promise<WorkflowTemplate> {
  const res = await request<{
    id: string;
    name: string;
    description: string | null;
    category: string;
    icon: string | null;
    color: string | null;
    requiredEntityTypes: string | null;
    requiredDocumentTypes: string | null;
    outputTemplates: string | null;
    defaultSteps: string | null;
    isActive: boolean;
    _count?: { workflows: number; rules: number };
    createdAt: string;
  }>(`${BASE}/workflow-templates/${id}`);
  return {
    ...res,
    requiredEntityTypes: safeJson<string[]>(res.requiredEntityTypes, []),
    requiredDocumentTypes: safeJson<string[]>(res.requiredDocumentTypes, []),
    outputTemplates: safeJson<string[]>(res.outputTemplates, []),
    defaultSteps: safeJson<WorkflowStepDef[]>(res.defaultSteps, []),
  };
}

// ── Business Rules ────────────────────────────────────

export async function getBusinessRules(workflowTemplateId?: string): Promise<{ data: BusinessRule[] }> {
  const qs = workflowTemplateId ? `?workflowTemplateId=${workflowTemplateId}` : '';
  const res = await request<{
    data: Array<{
      id: string;
      name: string;
      description: string | null;
      workflowTemplateId: string | null;
      triggerType: string;
      triggerCondition: string | null;
      requiredEntities: string | null;
      requiredDocuments: string | null;
      autoExtractEntities: string | null;
      validationLogic: string | null;
      priority: number;
      isActive: boolean;
      createdAt: string;
    }>;
  }>(`${BASE}/business-rules${qs}`);
  return {
    data: res.data.map((r) => ({
      ...r,
      triggerCondition: safeJson<Record<string, unknown> | null>(r.triggerCondition, null),
      requiredEntities: safeJson<string[]>(r.requiredEntities, []),
      requiredDocuments: safeJson<string[]>(r.requiredDocuments, []),
      autoExtractEntities: safeJson<string[]>(r.autoExtractEntities, []),
      validationLogic: safeJson<unknown[]>(r.validationLogic, []),
    })),
  };
}

export async function getBusinessRule(id: string): Promise<BusinessRule> {
  const res = await request<{
    id: string;
    name: string;
    description: string | null;
    workflowTemplateId: string | null;
    triggerType: string;
    triggerCondition: string | null;
    requiredEntities: string | null;
    requiredDocuments: string | null;
    autoExtractEntities: string | null;
    validationLogic: string | null;
    priority: number;
    isActive: boolean;
    createdAt: string;
  }>(`${BASE}/business-rules/${id}`);
  return {
    ...res,
    triggerCondition: safeJson<Record<string, unknown> | null>(res.triggerCondition, null),
    requiredEntities: safeJson<string[]>(res.requiredEntities, []),
    requiredDocuments: safeJson<string[]>(res.requiredDocuments, []),
    autoExtractEntities: safeJson<string[]>(res.autoExtractEntities, []),
    validationLogic: safeJson<unknown[]>(res.validationLogic, []),
  };
}

// ── Workflows ──────────────────────────────────────────

export async function getWorkflows(): Promise<{ data: Workflow[] }> {
  const res = await request<{
    data: Array<{
      id: string;
      name: string;
      description: string | null;
      status: string;
      projectId: string | null;
      templateId: string | null;
      currentStep: number | null;
      dataCompleteness: number | null;
      steps?: Array<{
        id: string;
        workflowId: string;
        stepOrder: number;
        name: string;
        description: string | null;
        stepType: string;
        status: string;
        requiredEntities: string | null;
        requiredDocuments: string | null;
        requiredTemplates: string | null;
        outputData: string | null;
        missingItems: string | null;
        templateId: string | null;
      }>;
      template?: { id: string; name: string; category: string; color: string } | null;
      project?: { id: string; name: string; status: string } | null;
      _count?: { steps: number };
      createdAt: string;
      updatedAt: string;
    }>;
  }>(`${BASE}/workflows`);
  return {
    data: res.data.map((w) => ({
      ...w,
      steps: w.steps?.map((s) => ({
        ...s,
        requiredEntities: safeJson<string[]>(s.requiredEntities, []),
        requiredDocuments: safeJson<string[]>(s.requiredDocuments, []),
        requiredTemplates: safeJson<string[]>(s.requiredTemplates, []),
        missingItems: safeJson<string[]>(s.missingItems, []),
      })),
    })),
  };
}

export async function createWorkflow(data: {
  templateId: string;
  projectId?: string;
  name?: string;
}): Promise<WorkflowDetail> {
  return request<WorkflowDetail>(`${BASE}/workflows`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function getWorkflowDetail(id: string): Promise<{
  workflow: WorkflowDetail;
  dependencyReport: DependencyReport | null;
}> {
  const res = await request<{
    workflow: {
      id: string;
      name: string;
      description: string | null;
      templateId: string | null;
      projectId: string | null;
      status: string;
      currentStep: number;
      dataRequirements: string | null;
      dataCompleteness: number | null;
      errors: string | null;
      steps: Array<{
        id: string;
        workflowId: string;
        stepOrder: number;
        name: string;
        description: string | null;
        stepType: string;
        status: string;
        requiredEntities: string | null;
        requiredDocuments: string | null;
        requiredTemplates: string | null;
        outputData: string | null;
        missingItems: string | null;
        templateId: string | null;
      }>;
      template?: {
        id: string;
        name: string;
        description: string | null;
        category: string;
        icon: string | null;
        color: string | null;
        requiredEntityTypes: string | null;
        requiredDocumentTypes: string | null;
        outputTemplates: string | null;
        defaultSteps: string | null;
        isActive: boolean;
      } | null;
      project?: { id: string; name: string; status: string } | null;
      createdAt: string;
      updatedAt: string;
    };
    dependencyReport: DependencyReport | null;
  }>(`${BASE}/workflows/${id}`);

  const wf = res.workflow;
  const parsedTemplate: WorkflowTemplate | null = wf.template
    ? {
        id: wf.template.id,
        name: wf.template.name,
        description: wf.template.description,
        category: wf.template.category,
        icon: wf.template.icon,
        color: wf.template.color,
        requiredEntityTypes: safeJson<string[]>(wf.template.requiredEntityTypes, []),
        requiredDocumentTypes: safeJson<string[]>(wf.template.requiredDocumentTypes, []),
        outputTemplates: safeJson<string[]>(wf.template.outputTemplates, []),
        defaultSteps: safeJson<WorkflowStepDef[]>(wf.template.defaultSteps, []),
        isActive: wf.template.isActive,
        createdAt: '', // not returned from detail endpoint
      }
    : null;

  return {
    workflow: {
      ...wf,
      dataRequirements: safeJson<{
        requiredEntities: string[];
        requiredDocuments: string[];
        triggeredRules: string[];
      } | null>(wf.dataRequirements, null),
      errors: safeJson<string[]>(wf.errors, []),
      steps: wf.steps.map((s) => ({
        ...s,
        requiredEntities: safeJson<string[]>(s.requiredEntities, []),
        requiredDocuments: safeJson<string[]>(s.requiredDocuments, []),
        requiredTemplates: safeJson<string[]>(s.requiredTemplates, []),
        missingItems: safeJson<string[]>(s.missingItems, []),
      })),
      template: parsedTemplate,
    },
    dependencyReport: res.dependencyReport,
  };
}

export async function deleteWorkflow(id: string): Promise<void> {
  await request<void>(`${BASE}/workflows/${id}`, { method: 'DELETE' });
}

export async function advanceWorkflow(id: string): Promise<WorkflowDetail> {
  return request<WorkflowDetail>(`${BASE}/workflows/${id}/advance`, { method: 'POST' });
}

export async function cancelWorkflow(id: string): Promise<void> {
  await request<void>(`${BASE}/workflows/${id}`, { method: 'DELETE' });
}

// ── Workflow Dependencies & Completeness ──────────────

export async function getWorkflowDependencies(id: string): Promise<DependencyReport> {
  return request<DependencyReport>(`${BASE}/workflows/${id}/dependencies`);
}

export async function getWorkflowCompleteness(
  id: string,
): Promise<{ workflowId: string; completenessPercent: number; breakdown: unknown }> {
  return request<{ workflowId: string; completenessPercent: number; breakdown: unknown }>(
    `${BASE}/workflows/${id}/completeness`,
  );
}

// ── V2: Seed ──────────────────────────────────────────

export async function seedV2Data(): Promise<{ message: string }> {
  return request<{ message: string }>(`${BASE}/seed-v2`, { method: 'POST' });
}
