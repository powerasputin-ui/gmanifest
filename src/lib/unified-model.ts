/**
 * Unified Project Data Model — maps extracted document data to structured entity types.
 */

import { db } from '@/lib/db';
import { llmExtract } from '@/lib/llm/provider';

// ==================== TYPE DEFINITIONS ====================

export const ENTITY_TYPES = [
  'Company', 'Vessel', 'Personnel', 'Well', 'Operation', 'FinancialData',
  'Permit', 'Incident', 'Weather', 'Equipment', 'Location',
  'Port', 'Rig', 'Campaign', 'Task', 'Risk', 'WorkOrder',
  'Checklist', 'Contract', 'OrganizationRole',
] as const;
export type EntityType = typeof ENTITY_TYPES[number];

export interface EntityFieldDef {
  field: string;
  label: string;
  type: string;
}

export const ENTITY_FIELDS: Record<EntityType, EntityFieldDef[]> = {
  Company: [
    { field: 'name', label: 'Название', type: 'string' },
    { field: 'inn', label: 'ИНН', type: 'string' },
    { field: 'kpp', label: 'КПП', type: 'string' },
    { field: 'ogrn', label: 'ОГРН', type: 'string' },
    { field: 'address', label: 'Адрес', type: 'string' },
    { field: 'contacts', label: 'Контакты', type: 'string' },
  ],
  Vessel: [
    { field: 'name', label: 'Название', type: 'string' },
    { field: 'imo', label: 'IMO', type: 'string' },
    { field: 'type', label: 'Тип', type: 'string' },
    { field: 'operator', label: 'Оператор', type: 'string' },
    { field: 'status', label: 'Статус', type: 'string' },
  ],
  Personnel: [
    { field: 'fullName', label: 'ФИО', type: 'string' },
    { field: 'position', label: 'Должность', type: 'string' },
    { field: 'organization', label: 'Организация', type: 'string' },
    { field: 'rotation', label: 'Ротация', type: 'string' },
  ],
  Well: [
    { field: 'name', label: 'Название', type: 'string' },
    { field: 'field', label: 'Месторождение', type: 'string' },
    { field: 'stage', label: 'Стадия', type: 'string' },
  ],
  Operation: [
    { field: 'type', label: 'Тип', type: 'string' },
    { field: 'date', label: 'Дата', type: 'string' },
    { field: 'startTime', label: 'Время начала', type: 'string' },
    { field: 'endTime', label: 'Время окончания', type: 'string' },
    { field: 'executor', label: 'Исполнитель', type: 'string' },
    { field: 'comments', label: 'Комментарии', type: 'string' },
  ],
  FinancialData: [
    { field: 'amount', label: 'Сумма', type: 'string' },
    { field: 'currency', label: 'Валюта', type: 'string' },
    { field: 'contractNumber', label: 'Номер договора', type: 'string' },
    { field: 'period', label: 'Сроки', type: 'string' },
  ],
  Permit: [
    { field: 'type', label: 'Тип разрешения', type: 'string' },
    { field: 'number', label: 'Номер', type: 'string' },
    { field: 'validFrom', label: 'Действует с', type: 'string' },
    { field: 'validTo', label: 'Действует до', type: 'string' },
    { field: 'issuingAuthority', label: 'Орган выдачи', type: 'string' },
    { field: 'scopeOfWork', label: 'Объём работ', type: 'string' },
    { field: 'riskLevel', label: 'Уровень риска', type: 'string' },
  ],
  Incident: [
    { field: 'type', label: 'Тип инцидента', type: 'string' },
    { field: 'date', label: 'Дата', type: 'string' },
    { field: 'time', label: 'Время', type: 'string' },
    { field: 'location', label: 'Место', type: 'string' },
    { field: 'severity', label: 'Тяжесть', type: 'string' },
    { field: 'description', label: 'Описание', type: 'string' },
    { field: 'correctiveAction', label: 'Корректирующее действие', type: 'string' },
    { field: 'status', label: 'Статус', type: 'string' },
  ],
  Weather: [
    { field: 'date', label: 'Дата', type: 'string' },
    { field: 'windSpeed', label: 'Скорость ветра', type: 'string' },
    { field: 'windDirection', label: 'Направление ветра', type: 'string' },
    { field: 'waveHeight', label: 'Высота волны', type: 'string' },
    { field: 'visibility', label: 'Видимость', type: 'string' },
    { field: 'temperature', label: 'Температура', type: 'string' },
    { field: 'seaState', label: 'Состояние моря', type: 'string' },
    { field: 'precipitation', label: 'Осадки', type: 'string' },
  ],
  Equipment: [
    { field: 'name', label: 'Название', type: 'string' },
    { field: 'serialNumber', label: 'Серийный номер', type: 'string' },
    { field: 'type', label: 'Тип', type: 'string' },
    { field: 'certification', label: 'Сертификация', type: 'string' },
    { field: 'lastInspection', label: 'Последняя проверка', type: 'string' },
    { field: 'nextInspection', label: 'Следующая проверка', type: 'string' },
    { field: 'status', label: 'Статус', type: 'string' },
    { field: 'location', label: 'Местоположение', type: 'string' },
  ],
  Location: [
    { field: 'name', label: 'Название', type: 'string' },
    { field: 'coordinates', label: 'Координаты', type: 'string' },
    { field: 'zone', label: 'Зона', type: 'string' },
    { field: 'waterDepth', label: 'Глубина воды', type: 'string' },
    { field: 'proximity', label: 'Близость', type: 'string' },
  ],
  Port: [
    { field: 'name', label: 'Название', type: 'string' },
    { field: 'country', label: 'Страна', type: 'string' },
    { field: 'arrivalDate', label: 'Дата прибытия', type: 'string' },
    { field: 'departureDate', label: 'Дата отправления', type: 'string' },
    { field: 'purpose', label: 'Цель визита', type: 'string' },
  ],
  Rig: [
    { field: 'name', label: 'Название', type: 'string' },
    { field: 'type', label: 'Тип', type: 'string' },
    { field: 'operator', label: 'Оператор', type: 'string' },
    { field: 'location', label: 'Местоположение', type: 'string' },
    { field: 'status', label: 'Статус', type: 'string' },
    { field: 'drillingPhase', label: 'Фаза бурения', type: 'string' },
  ],
  Campaign: [
    { field: 'name', label: 'Название', type: 'string' },
    { field: 'startDate', label: 'Дата начала', type: 'string' },
    { field: 'endDate', label: 'Дата окончания', type: 'string' },
    { field: 'projectScope', label: 'Объём проекта', type: 'string' },
    { field: 'status', label: 'Статус', type: 'string' },
    { field: 'vessel', label: 'Судно', type: 'string' },
    { field: 'rig', label: 'Платформа', type: 'string' },
  ],
  Task: [
    { field: 'title', label: 'Название', type: 'string' },
    { field: 'description', label: 'Описание', type: 'string' },
    { field: 'assignee', label: 'Ответственный', type: 'string' },
    { field: 'status', label: 'Статус', type: 'string' },
    { field: 'priority', label: 'Приоритет', type: 'string' },
    { field: 'dueDate', label: 'Срок', type: 'string' },
    { field: 'dependencies', label: 'Зависимости', type: 'string' },
  ],
  Risk: [
    { field: 'description', label: 'Описание', type: 'string' },
    { field: 'category', label: 'Категория', type: 'string' },
    { field: 'likelihood', label: 'Вероятность', type: 'string' },
    { field: 'impact', label: 'Влияние', type: 'string' },
    { field: 'mitigation', label: 'Меры снижения', type: 'string' },
    { field: 'status', label: 'Статус', type: 'string' },
    { field: 'owner', label: 'Ответственный', type: 'string' },
  ],
  WorkOrder: [
    { field: 'number', label: 'Номер', type: 'string' },
    { field: 'type', label: 'Тип', type: 'string' },
    { field: 'description', label: 'Описание', type: 'string' },
    { field: 'requestedBy', label: 'Заявитель', type: 'string' },
    { field: 'priority', label: 'Приоритет', type: 'string' },
    { field: 'status', label: 'Статус', type: 'string' },
    { field: 'dueDate', label: 'Срок', type: 'string' },
  ],
  Checklist: [
    { field: 'name', label: 'Название', type: 'string' },
    { field: 'items', label: 'Пункты', type: 'json' },
    { field: 'completedItems', label: 'Выполненные пункты', type: 'json' },
    { field: 'completionPercent', label: 'Процент выполнения', type: 'string' },
    { field: 'completedBy', label: 'Выполнено кем', type: 'string' },
    { field: 'date', label: 'Дата', type: 'string' },
  ],
  Contract: [
    { field: 'number', label: 'Номер', type: 'string' },
    { field: 'parties', label: 'Стороны', type: 'string' },
    { field: 'subject', label: 'Предмет', type: 'string' },
    { field: 'value', label: 'Стоимость', type: 'string' },
    { field: 'currency', label: 'Валюта', type: 'string' },
    { field: 'startDate', label: 'Дата начала', type: 'string' },
    { field: 'endDate', label: 'Дата окончания', type: 'string' },
    { field: 'status', label: 'Статус', type: 'string' },
  ],
  OrganizationRole: [
    { field: 'roleName', label: 'Роль', type: 'string' },
    { field: 'personName', label: 'ФИО', type: 'string' },
    { field: 'organization', label: 'Организация', type: 'string' },
    { field: 'contactInfo', label: 'Контактная информация', type: 'string' },
    { field: 'startDate', label: 'Дата начала', type: 'string' },
    { field: 'endDate', label: 'Дата окончания', type: 'string' },
    { field: 'responsibilities', label: 'Обязанности', type: 'string' },
  ],
};

// ==================== FIELD-TO-ENTITY CLASSIFICATION ====================

/**
 * Heuristic mapping of common extracted field names to entity types and field names.
 */
const FIELD_CLASSIFICATION_MAP: Record<string, { entityType: EntityType; field: string; instanceId?: string }> = {
  // Company fields
  organizationName: { entityType: 'Company', field: 'name', instanceId: 'company_1' },
  companyName: { entityType: 'Company', field: 'name', instanceId: 'company_1' },
  inn: { entityType: 'Company', field: 'inn', instanceId: 'company_1' },
  kpp: { entityType: 'Company', field: 'kpp', instanceId: 'company_1' },
  ogrn: { entityType: 'Company', field: 'ogrn', instanceId: 'company_1' },
  companyAddress: { entityType: 'Company', field: 'address', instanceId: 'company_1' },
  address: { entityType: 'Company', field: 'address', instanceId: 'company_1' },
  companyContacts: { entityType: 'Company', field: 'contacts', instanceId: 'company_1' },
  contacts: { entityType: 'Company', field: 'contacts', instanceId: 'company_1' },

  // Vessel fields
  vesselName: { entityType: 'Vessel', field: 'name', instanceId: 'vessel_1' },
  vesselImo: { entityType: 'Vessel', field: 'imo', instanceId: 'vessel_1' },
  imo: { entityType: 'Vessel', field: 'imo', instanceId: 'vessel_1' },
  vesselType: { entityType: 'Vessel', field: 'type', instanceId: 'vessel_1' },
  vesselOperator: { entityType: 'Vessel', field: 'operator', instanceId: 'vessel_1' },
  vesselStatus: { entityType: 'Vessel', field: 'status', instanceId: 'vessel_1' },

  // Personnel fields
  fullName: { entityType: 'Personnel', field: 'fullName', instanceId: 'personnel_1' },
  name: { entityType: 'Personnel', field: 'fullName', instanceId: 'personnel_1' },
  position: { entityType: 'Personnel', field: 'position', instanceId: 'personnel_1' },
  organization: { entityType: 'Personnel', field: 'organization', instanceId: 'personnel_1' },
  rotation: { entityType: 'Personnel', field: 'rotation', instanceId: 'personnel_1' },

  // Well fields
  wellName: { entityType: 'Well', field: 'name', instanceId: 'well_1' },
  field: { entityType: 'Well', field: 'field', instanceId: 'well_1' },
  wellField: { entityType: 'Well', field: 'field', instanceId: 'well_1' },
  wellStage: { entityType: 'Well', field: 'stage', instanceId: 'well_1' },
  stage: { entityType: 'Well', field: 'stage', instanceId: 'well_1' },

  // Operation fields
  operationType: { entityType: 'Operation', field: 'type', instanceId: 'operation_1' },
  type: { entityType: 'Operation', field: 'type', instanceId: 'operation_1' },
  operationDate: { entityType: 'Operation', field: 'date', instanceId: 'operation_1' },
  date: { entityType: 'Operation', field: 'date', instanceId: 'operation_1' },
  startTime: { entityType: 'Operation', field: 'startTime', instanceId: 'operation_1' },
  endTime: { entityType: 'Operation', field: 'endTime', instanceId: 'operation_1' },
  executor: { entityType: 'Operation', field: 'executor', instanceId: 'operation_1' },
  comments: { entityType: 'Operation', field: 'comments', instanceId: 'operation_1' },

  // Financial fields
  amount: { entityType: 'FinancialData', field: 'amount', instanceId: 'financial_1' },
  totalAmount: { entityType: 'FinancialData', field: 'amount', instanceId: 'financial_1' },
  currency: { entityType: 'FinancialData', field: 'currency', instanceId: 'financial_1' },
  contractNumber: { entityType: 'FinancialData', field: 'contractNumber', instanceId: 'financial_1' },
  contractNo: { entityType: 'FinancialData', field: 'contractNumber', instanceId: 'financial_1' },
  period: { entityType: 'FinancialData', field: 'period', instanceId: 'financial_1' },
  contractPeriod: { entityType: 'FinancialData', field: 'period', instanceId: 'financial_1' },

  // Permit fields
  permitType: { entityType: 'Permit', field: 'type', instanceId: 'permit_1' },
  permitNumber: { entityType: 'Permit', field: 'number', instanceId: 'permit_1' },
  validFrom: { entityType: 'Permit', field: 'validFrom', instanceId: 'permit_1' },
  validTo: { entityType: 'Permit', field: 'validTo', instanceId: 'permit_1' },
  issuingAuthority: { entityType: 'Permit', field: 'issuingAuthority', instanceId: 'permit_1' },
  scopeOfWork: { entityType: 'Permit', field: 'scopeOfWork', instanceId: 'permit_1' },
  riskLevel: { entityType: 'Permit', field: 'riskLevel', instanceId: 'permit_1' },

  // Incident fields
  incidentType: { entityType: 'Incident', field: 'type', instanceId: 'incident_1' },
  incidentDate: { entityType: 'Incident', field: 'date', instanceId: 'incident_1' },
  incidentTime: { entityType: 'Incident', field: 'time', instanceId: 'incident_1' },
  incidentLocation: { entityType: 'Incident', field: 'location', instanceId: 'incident_1' },
  severity: { entityType: 'Incident', field: 'severity', instanceId: 'incident_1' },
  correctiveAction: { entityType: 'Incident', field: 'correctiveAction', instanceId: 'incident_1' },

  // Weather fields
  weatherDate: { entityType: 'Weather', field: 'date', instanceId: 'weather_1' },
  windSpeed: { entityType: 'Weather', field: 'windSpeed', instanceId: 'weather_1' },
  windDirection: { entityType: 'Weather', field: 'windDirection', instanceId: 'weather_1' },
  waveHeight: { entityType: 'Weather', field: 'waveHeight', instanceId: 'weather_1' },
  visibility: { entityType: 'Weather', field: 'visibility', instanceId: 'weather_1' },
  temperature: { entityType: 'Weather', field: 'temperature', instanceId: 'weather_1' },
  seaState: { entityType: 'Weather', field: 'seaState', instanceId: 'weather_1' },
  precipitation: { entityType: 'Weather', field: 'precipitation', instanceId: 'weather_1' },

  // Equipment fields
  equipmentName: { entityType: 'Equipment', field: 'name', instanceId: 'equipment_1' },
  serialNumber: { entityType: 'Equipment', field: 'serialNumber', instanceId: 'equipment_1' },
  equipmentType: { entityType: 'Equipment', field: 'type', instanceId: 'equipment_1' },
  certification: { entityType: 'Equipment', field: 'certification', instanceId: 'equipment_1' },
  lastInspection: { entityType: 'Equipment', field: 'lastInspection', instanceId: 'equipment_1' },
  nextInspection: { entityType: 'Equipment', field: 'nextInspection', instanceId: 'equipment_1' },
  equipmentLocation: { entityType: 'Equipment', field: 'location', instanceId: 'equipment_1' },

  // Location fields
  locationName: { entityType: 'Location', field: 'name', instanceId: 'location_1' },
  coordinates: { entityType: 'Location', field: 'coordinates', instanceId: 'location_1' },
  zone: { entityType: 'Location', field: 'zone', instanceId: 'location_1' },
  waterDepth: { entityType: 'Location', field: 'waterDepth', instanceId: 'location_1' },

  // Port fields
  portName: { entityType: 'Port', field: 'name', instanceId: 'port_1' },
  portCountry: { entityType: 'Port', field: 'country', instanceId: 'port_1' },
  arrivalDate: { entityType: 'Port', field: 'arrivalDate', instanceId: 'port_1' },
  departureDate: { entityType: 'Port', field: 'departureDate', instanceId: 'port_1' },

  // Rig fields
  rigName: { entityType: 'Rig', field: 'name', instanceId: 'rig_1' },
  rigType: { entityType: 'Rig', field: 'type', instanceId: 'rig_1' },
  rigOperator: { entityType: 'Rig', field: 'operator', instanceId: 'rig_1' },
  rigLocation: { entityType: 'Rig', field: 'location', instanceId: 'rig_1' },
  drillingPhase: { entityType: 'Rig', field: 'drillingPhase', instanceId: 'rig_1' },

  // Campaign fields
  campaignName: { entityType: 'Campaign', field: 'name', instanceId: 'campaign_1' },
  campaignStart: { entityType: 'Campaign', field: 'startDate', instanceId: 'campaign_1' },
  campaignEnd: { entityType: 'Campaign', field: 'endDate', instanceId: 'campaign_1' },
  projectScope: { entityType: 'Campaign', field: 'projectScope', instanceId: 'campaign_1' },

  // Task fields
  taskTitle: { entityType: 'Task', field: 'title', instanceId: 'task_1' },
  taskDescription: { entityType: 'Task', field: 'description', instanceId: 'task_1' },
  assignee: { entityType: 'Task', field: 'assignee', instanceId: 'task_1' },
  taskPriority: { entityType: 'Task', field: 'priority', instanceId: 'task_1' },
  dueDate: { entityType: 'Task', field: 'dueDate', instanceId: 'task_1' },

  // Risk fields
  riskDescription: { entityType: 'Risk', field: 'description', instanceId: 'risk_1' },
  riskCategory: { entityType: 'Risk', field: 'category', instanceId: 'risk_1' },
  likelihood: { entityType: 'Risk', field: 'likelihood', instanceId: 'risk_1' },
  riskImpact: { entityType: 'Risk', field: 'impact', instanceId: 'risk_1' },
  mitigation: { entityType: 'Risk', field: 'mitigation', instanceId: 'risk_1' },
  riskOwner: { entityType: 'Risk', field: 'owner', instanceId: 'risk_1' },

  // WorkOrder fields
  workOrderNumber: { entityType: 'WorkOrder', field: 'number', instanceId: 'workorder_1' },
  workOrderType: { entityType: 'WorkOrder', field: 'type', instanceId: 'workorder_1' },
  requestedBy: { entityType: 'WorkOrder', field: 'requestedBy', instanceId: 'workorder_1' },

  // Contract fields
  contractParties: { entityType: 'Contract', field: 'parties', instanceId: 'contract_1' },
  contractSubject: { entityType: 'Contract', field: 'subject', instanceId: 'contract_1' },
  contractValue: { entityType: 'Contract', field: 'value', instanceId: 'contract_1' },

  // OrganizationRole fields
  roleName: { entityType: 'OrganizationRole', field: 'roleName', instanceId: 'orgrole_1' },
  personName: { entityType: 'OrganizationRole', field: 'personName', instanceId: 'orgrole_1' },
  contactInfo: { entityType: 'OrganizationRole', field: 'contactInfo', instanceId: 'orgrole_1' },
  responsibilities: { entityType: 'OrganizationRole', field: 'responsibilities', instanceId: 'orgrole_1' },
};

// ==================== MAIN FUNCTIONS ====================

/**
 * Build the unified model from extracted data.
 * Takes a flat key-value map and maps each field to an entity type.
 */
export async function buildModelFromExtraction(
  projectId: string,
  documentId: string,
  runId: string,
  extractedData: Record<string, any>
): Promise<void> {
  // Try LLM classification first, fall back to heuristic
  let classified: Array<{
    entityType: EntityType;
    field: string;
    instanceId: string;
    value: string;
    confidence: number;
  }> = [];

  try {
    classified = await classifyFieldsWithLLM(extractedData);
  } catch (error) {
    console.warn('LLM classification failed, using heuristic fallback:', error);
    classified = classifyFieldsHeuristic(extractedData);
  }

  // Save to ProjectEntity table
  for (const item of classified) {
    await db.projectEntity.create({
      data: {
        projectId,
        entityType: item.entityType,
        instanceId: item.instanceId,
        fieldName: item.field,
        value: item.value,
        sourceDocumentId: documentId,
        sourceRunId: runId,
        confidence: item.confidence,
        isVerified: false,
        isPreferred: false,
      },
    });
  }
}

/**
 * Use LLM to classify extracted fields into entity types.
 */
async function classifyFieldsWithLLM(
  extractedData: Record<string, any>
): Promise<Array<{ entityType: EntityType; field: string; instanceId: string; value: string; confidence: number }>> {
  const fieldsJson = JSON.stringify(Object.entries(extractedData).map(([k, v]) => ({ key: k, value: v })), null, 2);

  const entityDefs = Object.entries(ENTITY_FIELDS)
    .map(([type, fields]) => `${type}: ${fields.map(f => f.field).join(', ')}`)
    .join('\n');

  const systemPrompt = `You are a document data classifier. Given extracted fields from a document, classify each field into the appropriate entity type and field name.

Available entity types and their fields:
${entityDefs}

Return a JSON array of classifications. Each item must have:
- "key": the original field key from input
- "entityType": one of ${ENTITY_TYPES.join(', ')}
- "field": the corresponding field name in the entity
- "instanceId": a unique instance identifier (e.g. "company_1", "vessel_1")
- "value": the value to store

If a field doesn't clearly fit, use the best match. Only respond with the JSON array, no explanation.`;

  const { content } = await llmExtract(systemPrompt, `Classify these extracted fields:\n${fieldsJson}`);

  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
  const jsonStr = (jsonMatch[1] || content).trim();
  const parsed = JSON.parse(jsonStr) as Array<{
    key: string;
    entityType: string;
    field: string;
    instanceId: string;
    value: string;
  }>;

  return parsed.map((item) => ({
    entityType: item.entityType as EntityType,
    field: item.field,
    instanceId: item.instanceId || `${item.entityType.toLowerCase()}_1`,
    value: item.value || String(extractedData[item.key] ?? ''),
    confidence: 0.85,
  }));
}

/**
 * Heuristic fallback classification.
 */
function classifyFieldsHeuristic(
  extractedData: Record<string, any>
): Array<{ entityType: EntityType; field: string; instanceId: string; value: string; confidence: number }> {
  const results: Array<{ entityType: EntityType; field: string; instanceId: string; value: string; confidence: number }> = [];

  for (const [key, value] of Object.entries(extractedData)) {
    const classification = FIELD_CLASSIFICATION_MAP[key];
    if (classification) {
      results.push({
        entityType: classification.entityType,
        field: classification.field,
        instanceId: classification.instanceId || `${classification.entityType.toLowerCase()}_1`,
        value: value === null || value === undefined ? '' : String(value),
        confidence: 0.6,
      });
    }
  }

  return results;
}

/**
 * Get the full unified model for a project.
 * Returns data grouped by entity type and instance.
 */
export async function getProjectModel(
  projectId: string
): Promise<Record<EntityType, Record<string, Record<string, any>>>> {
  const entities = await db.projectEntity.findMany({
    where: { projectId },
    orderBy: [{ entityType: 'asc' }, { instanceId: 'asc' }],
  });

  const model: Record<string, Record<string, Record<string, any>>> = {};

  for (const entity of entities) {
    if (!model[entity.entityType]) {
      model[entity.entityType] = {};
    }
    if (!model[entity.entityType][entity.instanceId]) {
      model[entity.entityType][entity.instanceId] = {};
    }

    const existing = model[entity.entityType][entity.instanceId][entity.fieldName];
    // Prefer verified/preferred values
    if (!existing || entity.isVerified || entity.isPreferred) {
      model[entity.entityType][entity.instanceId][entity.fieldName] = {
        value: entity.value,
        confidence: entity.confidence,
        isVerified: entity.isVerified,
        isPreferred: entity.isPreferred,
        source: entity.sourceDocumentId,
        entityId: entity.id,
      };
    }
  }

  return model as Record<EntityType, Record<string, Record<string, any>>>;
}

/**
 * Get data conflicts — fields with multiple values from different sources.
 */
export async function getConflicts(
  projectId: string
): Promise<Array<{
  entityType: string;
  instanceId: string;
  fieldName: string;
  values: Array<{
    entityId: string;
    value: string | null;
    confidence: number | null;
    sourceDocumentId: string | null;
    sourceRunId: string | null;
    isVerified: boolean;
    isPreferred: boolean;
    page: number | null;
  }>;
}>> {
  const entities = await db.projectEntity.findMany({
    where: { projectId },
    orderBy: [{ entityType: 'asc' }, { instanceId: 'asc' }, { fieldName: 'asc' }],
  });

  // Group by (entityType, instanceId, fieldName)
  const groups = new Map<string, typeof entities>();

  for (const entity of entities) {
    const groupKey = `${entity.entityType}:${entity.instanceId}:${entity.fieldName}`;
    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey)!.push(entity);
  }

  // Only return groups with more than 1 value
  const conflicts: Array<{
    entityType: string;
    instanceId: string;
    fieldName: string;
    values: Array<{
      entityId: string;
      value: string | null;
      confidence: number | null;
      sourceDocumentId: string | null;
      sourceRunId: string | null;
      isVerified: boolean;
      isPreferred: boolean;
      page: number | null;
    }>;
  }> = [];

  for (const [key, values] of groups) {
    if (values.length <= 1) continue;

    const [entityType, instanceId, fieldName] = key.split(':');
    conflicts.push({
      entityType,
      instanceId,
      fieldName,
      values: values.map((v) => ({
        entityId: v.id,
        value: v.value,
        confidence: v.confidence,
        sourceDocumentId: v.sourceDocumentId,
        sourceRunId: v.sourceRunId,
        isVerified: v.isVerified,
        isPreferred: v.isPreferred,
        page: v.page,
      })),
    });
  }

  return conflicts;
}

/**
 * Resolve a conflict by setting the preferred value.
 */
export async function resolveConflict(
  entityId: string,
  fieldName: string,
  preferredValue: string
): Promise<void> {
  // Clear isPreferred on all other entities with same field in same group
  const entity = await db.projectEntity.findUnique({
    where: { id: entityId },
  });

  if (!entity) {
    throw new Error(`Entity not found: ${entityId}`);
  }

  // Find all entities in the same group
  const siblings = await db.projectEntity.findMany({
    where: {
      projectId: entity.projectId,
      entityType: entity.entityType,
      instanceId: entity.instanceId,
      fieldName: entity.fieldName,
      id: { not: entityId },
    },
  });

  // Clear isPreferred on siblings
  for (const sibling of siblings) {
    await db.projectEntity.update({
      where: { id: sibling.id },
      data: { isPreferred: false },
    });
  }

  // Set preferred on the chosen entity
  await db.projectEntity.update({
    where: { id: entityId },
    data: {
      isPreferred: true,
      isVerified: true,
      value: preferredValue,
    },
  });
}

/**
 * Resolve template variable mappings to actual values from the project model.
 */
export async function mapToTemplateValues(
  projectId: string,
  mappings: Array<{ templateVariable: string; modelPath: string }>
): Promise<Record<string, string>> {
  // modelPath format: "EntityType.instanceId.fieldName" (e.g., "Company.company_1.name")
  const values: Record<string, string> = {};

  // Get all entities for the project
  const entities = await db.projectEntity.findMany({
    where: { projectId },
  });

  // Build a lookup map
  const entityMap = new Map<string, { value: string | null; isPreferred: boolean; isVerified: boolean }>();
  for (const entity of entities) {
    const key = `${entity.entityType}.${entity.instanceId}.${entity.fieldName}`;
    const existing = entityMap.get(key);
    // Prefer preferred/verified values
    if (!existing || entity.isPreferred || entity.isVerified) {
      entityMap.set(key, {
        value: entity.value,
        isPreferred: entity.isPreferred,
        isVerified: entity.isVerified,
      });
    }
  }

  for (const mapping of mappings) {
    const resolved = entityMap.get(mapping.modelPath);
    // Strip {{ }} from template variable name
    const varName = mapping.templateVariable.replace(/\{\{|\}\}/g, '').trim();
    values[varName] = resolved?.value || '';
  }

  return values;
}
