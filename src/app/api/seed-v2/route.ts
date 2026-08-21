import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ==================== EXTRACTION PROFILES ====================

const EXTRACTION_PROFILES = [
  {
    name: 'Извлечение данных компании',
    description: 'Извлечение данных о компании: название, ИНН, КПП, ОГРН, адрес, контакты',
    entityType: 'Company',
    jsonSchema: JSON.stringify({
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Название компании' },
        inn: { type: 'string', description: 'ИНН', pattern: '^\\d{10}$|^\\d{12}$' },
        kpp: { type: 'string', description: 'КПП', pattern: '^\\d{9}$' },
        ogrn: { type: 'string', description: 'ОГРН' },
        address: { type: 'string', description: 'Юридический адрес' },
        contacts: { type: 'string', description: 'Контактная информация' },
      },
    }),
    promptTemplate: `Извлеки данные о компании из документа. Верни JSON с полями: name, inn, kpp, ogrn, address, contacts.
Если поле не найдено, оставь пустую строку. ИНН должен содержать только цифры (10 или 12).`,
    validationRules: JSON.stringify([
      { field: 'inn', rule: 'regex', pattern: '^\\d{10}$|^\\d{12}$', message: 'ИНН должен содержать 10 или 12 цифр' },
      { field: 'name', rule: 'required', message: 'Название компании обязательно' },
    ]),
  },
  {
    name: 'Извлечение данных судна',
    description: 'Извлечение данных о судне: название, IMO, тип, оператор, статус',
    entityType: 'Vessel',
    jsonSchema: JSON.stringify({
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Название судна' },
        imo: { type: 'string', description: 'IMO номер' },
        type: { type: 'string', description: 'Тип судна' },
        operator: { type: 'string', description: 'Оператор' },
        status: { type: 'string', description: 'Текущий статус' },
      },
    }),
    promptTemplate: `Извлеки данные о судне из документа. Верни JSON с полями: name, imo, type, operator, status.
Если поле не найдено, оставь пустую строку.`,
    validationRules: JSON.stringify([
      { field: 'name', rule: 'required', message: 'Название судна обязательно' },
    ]),
  },
  {
    name: 'Извлечение данных персонала',
    description: 'Извлечение данных о персонале: ФИО, должность, организация, ротация',
    entityType: 'Personnel',
    jsonSchema: JSON.stringify({
      type: 'object',
      properties: {
        fullName: { type: 'string', description: 'ФИО полностью' },
        position: { type: 'string', description: 'Должность' },
        organization: { type: 'string', description: 'Организация' },
        rotation: { type: 'string', description: 'Ротация (дата заезда/выезда)' },
      },
    }),
    promptTemplate: `Извлеки данные о персонале из документа. Верни JSON с полями: fullName, position, organization, rotation.
Если в документе несколько человек, верни массив объектов.`,
    validationRules: JSON.stringify([
      { field: 'fullName', rule: 'required', message: 'ФИО обязательно' },
    ]),
  },
  {
    name: 'Извлечение данных об операции',
    description: 'Извлечение данных об операции: тип, дата, время, исполнитель',
    entityType: 'Operation',
    jsonSchema: JSON.stringify({
      type: 'object',
      properties: {
        type: { type: 'string', description: 'Тип операции' },
        date: { type: 'string', description: 'Дата операции' },
        startTime: { type: 'string', description: 'Время начала' },
        endTime: { type: 'string', description: 'Время окончания' },
        executor: { type: 'string', description: 'Исполнитель' },
        comments: { type: 'string', description: 'Комментарии' },
      },
    }),
    promptTemplate: `Извлеки данные об операциях из документа. Верни JSON с полями: type, date, startTime, endTime, executor, comments.
Формат дат: ДД.ММ.ГГГГ. Формат времени: ЧЧ:ММ.`,
    validationRules: JSON.stringify([
      { field: 'type', rule: 'required', message: 'Тип операции обязателен' },
      { field: 'date', rule: 'required', message: 'Дата операции обязательна' },
    ]),
  },
  {
    name: 'Извлечение данных об оборудовании',
    description: 'Извлечение данных об оборудовании: название, серийный номер, сертификация, проверки',
    entityType: 'Equipment',
    jsonSchema: JSON.stringify({
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Название оборудования' },
        serialNumber: { type: 'string', description: 'Серийный номер' },
        type: { type: 'string', description: 'Тип оборудования' },
        certification: { type: 'string', description: 'Сертификация' },
        lastInspection: { type: 'string', description: 'Дата последней проверки' },
        nextInspection: { type: 'string', description: 'Дата следующей проверки' },
        status: { type: 'string', description: 'Текущий статус' },
        location: { type: 'string', description: 'Местоположение' },
      },
    }),
    promptTemplate: `Извлеки данные об оборудовании из документа. Верни JSON с полями: name, serialNumber, type, certification, lastInspection, nextInspection, status, location.
Если несколько единиц оборудования — верни массив.`,
    validationRules: JSON.stringify([
      { field: 'name', rule: 'required', message: 'Название оборудования обязательно' },
      { field: 'certification', rule: 'required', message: 'Сертификация обязательна для оборудования' },
    ]),
  },
  {
    name: 'Извлечение данных о разрешениях',
    description: 'Извлечение данных о разрешениях и нарядах-допусках',
    entityType: 'Permit',
    jsonSchema: JSON.stringify({
      type: 'object',
      properties: {
        type: { type: 'string', description: 'Тип разрешения' },
        number: { type: 'string', description: 'Номер разрешения' },
        validFrom: { type: 'string', description: 'Действует с' },
        validTo: { type: 'string', description: 'Действует до' },
        issuingAuthority: { type: 'string', description: 'Орган выдачи' },
        scopeOfWork: { type: 'string', description: 'Объём работ' },
        riskLevel: { type: 'string', description: 'Уровень риска' },
      },
    }),
    promptTemplate: `Извлеки данные о разрешении/наряде-допуске. Верни JSON с полями: type, number, validFrom, validTo, issuingAuthority, scopeOfWork, riskLevel.`,
    validationRules: JSON.stringify([
      { field: 'type', rule: 'required', message: 'Тип разрешения обязателен' },
      { field: 'number', rule: 'required', message: 'Номер разрешения обязателен' },
    ]),
  },
  {
    name: 'Извлечение метеоданных',
    description: 'Извлечение метеорологических данных: ветер, волны, видимость, температура',
    entityType: 'Weather',
    jsonSchema: JSON.stringify({
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Дата наблюдения' },
        windSpeed: { type: 'string', description: 'Скорость ветра (м/с)' },
        windDirection: { type: 'string', description: 'Направление ветра' },
        waveHeight: { type: 'string', description: 'Высота волны (м)' },
        visibility: { type: 'string', description: 'Видимость' },
        temperature: { type: 'string', description: 'Температура (°C)' },
        seaState: { type: 'string', description: 'Состояние моря' },
        precipitation: { type: 'string', description: 'Осадки' },
      },
    }),
    promptTemplate: `Извлеки метеорологические данные из документа. Верни JSON с полями: date, windSpeed, windDirection, waveHeight, visibility, temperature, seaState, precipitation.
Указывай единицы измерения.`,
    validationRules: JSON.stringify([
      { field: 'date', rule: 'required', message: 'Дата наблюдения обязательна' },
    ]),
  },
  {
    name: 'Извлечение данных об инцидентах',
    description: 'Извлечение данных об инцидентах и происшествиях',
    entityType: 'Incident',
    jsonSchema: JSON.stringify({
      type: 'object',
      properties: {
        type: { type: 'string', description: 'Тип инцидента' },
        date: { type: 'string', description: 'Дата' },
        time: { type: 'string', description: 'Время' },
        location: { type: 'string', description: 'Место' },
        severity: { type: 'string', description: 'Тяжесть' },
        description: { type: 'string', description: 'Описание' },
        correctiveAction: { type: 'string', description: 'Корректирующее действие' },
        status: { type: 'string', description: 'Статус' },
      },
    }),
    promptTemplate: `Извлеки данные об инциденте из документа. Верни JSON с полями: type, date, time, location, severity, description, correctiveAction, status.`,
    validationRules: JSON.stringify([
      { field: 'type', rule: 'required', message: 'Тип инцидента обязателен' },
      { field: 'date', rule: 'required', message: 'Дата инцидента обязательна' },
    ]),
  },
  {
    name: 'Извлечение данных о контракте',
    description: 'Извлечение данных о контракте/договоре: номер, стороны, стоимость, сроки',
    entityType: 'Contract',
    jsonSchema: JSON.stringify({
      type: 'object',
      properties: {
        number: { type: 'string', description: 'Номер контракта' },
        parties: { type: 'string', description: 'Стороны договора' },
        subject: { type: 'string', description: 'Предмет договора' },
        value: { type: 'string', description: 'Стоимость' },
        currency: { type: 'string', description: 'Валюта' },
        startDate: { type: 'string', description: 'Дата начала' },
        endDate: { type: 'string', description: 'Дата окончания' },
        status: { type: 'string', description: 'Статус' },
      },
    }),
    promptTemplate: `Извлеки данные о контракте/договоре. Верни JSON с полями: number, parties, subject, value, currency, startDate, endDate, status.`,
    validationRules: JSON.stringify([
      { field: 'number', rule: 'required', message: 'Номер контракта обязателен' },
    ]),
  },
];

// ==================== WORKFLOW TEMPLATES ====================

const STEPS_COMMERCIAL = [
  { stepType: 'define_goal', name: 'Определение цели', description: 'Определение цели коммерческого предложения и требований заказчика', requiredEntities: [] },
  { stepType: 'identify_data', name: 'Идентификация данных', description: 'Определение необходимых данных для подготовки КП', requiredEntities: ['Company', 'FinancialData', 'Contract'] },
  { stepType: 'find_documents', name: 'Поиск документов', description: 'Поиск и загрузка исходных документов (договоры, спецификации)', requiredEntities: [], requiredDocuments: ['contract', 'specification'] },
  { stepType: 'extract', name: 'Извлечение данных', description: 'Автоматическое извлечение данных из загруженных документов', requiredEntities: ['Company', 'FinancialData', 'Contract'] },
  { stepType: 'check_completeness', name: 'Проверка полноты', description: 'Проверка полноты и точности извлечённых данных', requiredEntities: ['Company', 'FinancialData', 'Contract'] },
  { stepType: 'fill_template', name: 'Заполнение шаблона', description: 'Заполнение шаблона коммерческого предложения', requiredEntities: ['Company', 'FinancialData', 'Contract'] },
  { stepType: 'user_review', name: 'Проверка пользователем', description: 'Финальная проверка и утверждение КП', requiredEntities: [] },
  { stepType: 'export', name: 'Экспорт', description: 'Экспорт готового коммерческого предложения', requiredEntities: [] },
];

const STEPS_VOYAGE = [
  { stepType: 'define_goal', name: 'Планирование рейса', description: 'Определение параметров рейса судна', requiredEntities: [] },
  { stepType: 'identify_data', name: 'Идентификация данных', description: 'Определение необходимых данных для оформления рейса', requiredEntities: ['Vessel', 'Personnel', 'Equipment', 'Port', 'Location'] },
  { stepType: 'find_documents', name: 'Поиск документов', description: 'Сбор необходимых документов для рейса', requiredDocuments: ['crew_manifest', 'vessel_certificate'] },
  { stepType: 'extract', name: 'Извлечение данных', description: 'Извлечение данных о судне, экипаже, оборудовании', requiredEntities: ['Vessel', 'Personnel', 'Equipment'] },
  { stepType: 'check_completeness', name: 'Проверка полноты', description: 'Проверка полноты данных рейса', requiredEntities: ['Vessel', 'Personnel', 'Equipment', 'Port'] },
  { stepType: 'fill_template', name: 'Оформление документов', description: 'Заполнение документов рейса', requiredEntities: ['Vessel', 'Personnel', 'Port'] },
  { stepType: 'user_review', name: 'Проверка пользователем', description: 'Проверка и утверждение документов', requiredEntities: [] },
  { stepType: 'export', name: 'Экспорт', description: 'Экспорт пакета документов рейса', requiredEntities: [] },
];

const STEPS_DAILY = [
  { stepType: 'define_goal', name: 'Определение периода', description: 'Выбор даты для суточной сводки', requiredEntities: [] },
  { stepType: 'identify_data', name: 'Идентификация данных', description: 'Определение источников данных для сводки', requiredEntities: ['Weather', 'Operation', 'Personnel', 'Equipment', 'Incident'] },
  { stepType: 'find_documents', name: 'Поиск отчётов', description: 'Сбор суточных отчётов', requiredDocuments: ['daily_report'] },
  { stepType: 'extract', name: 'Извлечение данных', description: 'Извлечение метеоданных, операций, персонала', requiredEntities: ['Weather', 'Operation', 'Personnel', 'Equipment'] },
  { stepType: 'check_completeness', name: 'Проверка полноты', description: 'Проверка полноты данных сводки', requiredEntities: ['Weather', 'Operation', 'Personnel'] },
  { stepType: 'fill_template', name: 'Формирование сводки', description: 'Заполнение шаблона суточной сводки', requiredEntities: ['Weather', 'Operation', 'Personnel'] },
  { stepType: 'user_review', name: 'Проверка пользователем', description: 'Проверка и утверждение сводки', requiredEntities: [] },
  { stepType: 'export', name: 'Экспорт', description: 'Экспорт готовой сводки', requiredEntities: [] },
];

const STEPS_MOBILIZATION = [
  { stepType: 'define_goal', name: 'Планирование мобилизации', description: 'Определение объёма и сроков мобилизации', requiredEntities: [] },
  { stepType: 'identify_data', name: 'Идентификация данных', description: 'Определение необходимого оборудования и персонала', requiredEntities: ['Equipment', 'Vessel', 'Personnel', 'Permit', 'Location'] },
  { stepType: 'find_documents', name: 'Поиск документов', description: 'Сбор сертификатов, разрешений, спецификаций', requiredDocuments: ['equipment_certificate', 'permit'] },
  { stepType: 'extract', name: 'Извлечение данных', description: 'Извлечение данных об оборудовании, судне, персонале', requiredEntities: ['Equipment', 'Vessel', 'Personnel', 'Permit'] },
  { stepType: 'check_completeness', name: 'Проверка полноты', description: 'Проверка сертификации и сроков действия', requiredEntities: ['Equipment', 'Permit'] },
  { stepType: 'fill_template', name: 'Оформление документов', description: 'Заполнение документов мобилизации', requiredEntities: ['Equipment', 'Vessel', 'Personnel'] },
  { stepType: 'user_review', name: 'Проверка пользователем', description: 'Проверка и утверждение', requiredEntities: [] },
  { stepType: 'export', name: 'Экспорт', description: 'Экспорт пакета мобилизации', requiredEntities: [] },
];

const STEPS_PERMIT = [
  { stepType: 'define_goal', name: 'Определение работ', description: 'Определение вида работ и рисков', requiredEntities: [] },
  { stepType: 'identify_data', name: 'Идентификация данных', description: 'Определение необходимых данных для наряда-допуска', requiredEntities: ['Permit', 'Risk', 'Personnel', 'Task'] },
  { stepType: 'find_documents', name: 'Поиск документов', description: 'Сбор документов по ОТИ и ПБ', requiredDocuments: ['risk_assessment', 'jsa', 'toolbox_talk'] },
  { stepType: 'extract', name: 'Извлечение данных', description: 'Извлечение данных о рисках, персонале, задачах', requiredEntities: ['Risk', 'Personnel', 'Task'] },
  { stepType: 'check_completeness', name: 'Проверка полноты', description: 'Проверка полноты данных для наряда', requiredEntities: ['Permit', 'Risk', 'Personnel', 'Task'] },
  { stepType: 'fill_template', name: 'Заполнение наряда', description: 'Заполнение бланка наряда-допуска', requiredEntities: ['Permit', 'Risk', 'Personnel'] },
  { stepType: 'user_review', name: 'Проверка пользователем', description: 'Проверка и утверждение наряда-допуска', requiredEntities: [] },
  { stepType: 'export', name: 'Экспорт', description: 'Экспорт наряда-допуска', requiredEntities: [] },
];

const STEPS_APPROVAL = [
  { stepType: 'define_goal', name: 'Определение объёма работ', description: 'Определение работ, требующих согласования', requiredEntities: [] },
  { stepType: 'identify_data', name: 'Идентификация данных', description: 'Определение необходимых данных для согласования', requiredEntities: ['Contract', 'Company', 'Personnel', 'Task', 'WorkOrder'] },
  { stepType: 'find_documents', name: 'Поиск документов', description: 'Сбор договора, нарядов, спецификаций', requiredDocuments: ['contract', 'work_order', 'specification'] },
  { stepType: 'extract', name: 'Извлечение данных', description: 'Извлечение данных из документов', requiredEntities: ['Contract', 'Company', 'Personnel', 'WorkOrder'] },
  { stepType: 'check_completeness', name: 'Проверка полноты', description: 'Проверка полноты данных для согласования', requiredEntities: ['Contract', 'Company', 'Personnel', 'Task', 'WorkOrder'] },
  { stepType: 'fill_template', name: 'Оформление документов', description: 'Заполнение документов на согласование', requiredEntities: ['Contract', 'Company', 'Personnel'] },
  { stepType: 'user_review', name: 'Проверка пользователем', description: 'Проверка и утверждение пакета', requiredEntities: [] },
  { stepType: 'export', name: 'Экспорт', description: 'Экспорт пакета согласования', requiredEntities: [] },
];

const WORKFLOW_TEMPLATES = [
  {
    name: 'Подготовка коммерческого предложения',
    description: 'Полный цикл подготовки коммерческого предложения для Gazprom Shelfproject',
    category: 'commercial',
    icon: 'FileText',
    color: 'emerald',
    requiredEntityTypes: ['Company', 'FinancialData', 'Contract'],
    requiredDocumentTypes: ['contract', 'specification'],
    defaultSteps: STEPS_COMMERCIAL,
  },
  {
    name: 'Оформление рейса судна',
    description: 'Оформление всех документов для рейса судна',
    category: 'operational',
    icon: 'Ship',
    color: 'teal',
    requiredEntityTypes: ['Vessel', 'Personnel', 'Equipment', 'Port', 'Location'],
    requiredDocumentTypes: ['crew_manifest', 'vessel_certificate'],
    defaultSteps: STEPS_VOYAGE,
  },
  {
    name: 'Суточная сводка',
    description: 'Ежедневная обработка отчётов и формирование сводки',
    category: 'reporting',
    icon: 'BarChart3',
    color: 'amber',
    requiredEntityTypes: ['Weather', 'Operation', 'Personnel', 'Equipment', 'Incident'],
    requiredDocumentTypes: ['daily_report'],
    defaultSteps: STEPS_DAILY,
  },
  {
    name: 'Мобилизация оборудования',
    description: 'Мобилизация оборудования и персонала на объект',
    category: 'mobilization',
    icon: 'Truck',
    color: 'violet',
    requiredEntityTypes: ['Equipment', 'Vessel', 'Personnel', 'Permit', 'Location'],
    requiredDocumentTypes: ['equipment_certificate', 'permit'],
    defaultSteps: STEPS_MOBILIZATION,
  },
  {
    name: 'Оформление наряда-допуска',
    description: 'Оформление наряда-допуска для работ повышенной опасности',
    category: 'hse',
    icon: 'ShieldAlert',
    color: 'red',
    requiredEntityTypes: ['Permit', 'Risk', 'Personnel', 'Task'],
    requiredDocumentTypes: ['risk_assessment', 'jsa', 'toolbox_talk'],
    defaultSteps: STEPS_PERMIT,
  },
  {
    name: 'Согласование работ',
    description: 'Подготовка пакета документов для согласования работ',
    category: 'contracting',
    icon: 'ClipboardCheck',
    color: 'orange',
    requiredEntityTypes: ['Contract', 'Company', 'Personnel', 'Task', 'WorkOrder'],
    requiredDocumentTypes: ['contract', 'work_order', 'specification'],
    defaultSteps: STEPS_APPROVAL,
  },
];

// ==================== BUSINESS RULES ====================

interface BusinessRuleInput {
  name: string;
  description: string;
  templateName: string;
  triggerType: string;
  triggerCondition: Record<string, unknown>;
  requiredEntities?: string[];
  requiredDocuments?: string[];
  autoExtractEntities?: string[];
  validationLogic?: Array<Record<string, unknown>>;
  priority?: number;
}

const BUSINESS_RULES: BusinessRuleInput[] = [
  {
    name: 'Daily Report: Weather Required',
    description: 'При загрузке суточного отчёта требуется извлечение метеоданных',
    templateName: 'Суточная сводка',
    triggerType: 'document_type',
    triggerCondition: { documentType: 'daily_report' },
    requiredEntities: ['Weather'],
    autoExtractEntities: ['Weather', 'Operation', 'Personnel', 'Equipment'],
    priority: 10,
  },
  {
    name: 'Permit to Work: Safety Docs',
    description: 'При наличии разрешения на работы требуются документы по безопасности',
    templateName: 'Оформление наряда-допуска',
    triggerType: 'entity_present',
    triggerCondition: { entityType: 'Permit' },
    requiredDocuments: ['risk_assessment', 'jsa', 'toolbox_talk'],
    priority: 20,
  },
  {
    name: 'Commercial Proposal: Financial Data',
    description: 'Для коммерческих предложений обязательны финансовые данные и данные заказчика',
    templateName: 'Подготовка коммерческого предложения',
    triggerType: 'workflow_category',
    triggerCondition: { category: 'commercial' },
    requiredEntities: ['Company', 'FinancialData', 'Contract'],
    priority: 15,
  },
  {
    name: 'Mobilization: Equipment Certification',
    description: 'При мобилизации проверяется сертификация оборудования и сроки проверок',
    templateName: 'Мобилизация оборудования',
    triggerType: 'workflow_category',
    triggerCondition: { category: 'mobilization' },
    requiredEntities: ['Equipment'],
    validationLogic: [
      { field: 'Equipment.certification', rule: 'required', message: 'Сертификация оборудования обязательна' },
      { field: 'Equipment.lastInspection', rule: 'not_expired', message: 'Срок последней проверки не должен быть просрочен' },
    ],
    priority: 25,
  },
  {
    name: 'Vessel Voyage: Crew Manifest',
    description: 'Для оформления рейса требуются данные об экипаже, судне и портах',
    templateName: 'Оформление рейса судна',
    triggerType: 'workflow_category',
    triggerCondition: { category: 'operational' },
    requiredEntities: ['Personnel', 'Vessel', 'Port'],
    priority: 15,
  },
];

// ==================== SEED FUNCTION ====================

export async function POST() {
  try {
    const results: Record<string, { success: boolean; id?: string; count?: number; error?: string }> = {};

    // Idempotency: skip if already seeded
    const existingTemplates = await db.workflowTemplate.count();
    if (existingTemplates > 0) {
      return NextResponse.json({ message: 'Данные v2 уже загружены', count: existingTemplates });
    }

    // 1. Seed extraction profiles
    let profilesCreated = 0;
    for (const profile of EXTRACTION_PROFILES) {
      try {
        const created = await db.extractionProfile.create({ data: profile });
        profilesCreated++;
        results[`profile:${profile.entityType}`] = { success: true, id: created.id };
      } catch (error) {
        results[`profile:${profile.entityType}`] = {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }
    results['profiles_summary'] = { success: true, count: profilesCreated };

    // 2. Seed workflow templates
    const templateIds: Record<string, string> = {};
    let templatesCreated = 0;
    for (const tmpl of WORKFLOW_TEMPLATES) {
      try {
        const created = await db.workflowTemplate.create({
          data: {
            name: tmpl.name,
            description: tmpl.description,
            category: tmpl.category,
            icon: tmpl.icon,
            color: tmpl.color,
            requiredEntityTypes: JSON.stringify(tmpl.requiredEntityTypes),
            requiredDocumentTypes: JSON.stringify(tmpl.requiredDocumentTypes),
            defaultSteps: JSON.stringify(tmpl.defaultSteps),
          },
        });
        templateIds[tmpl.name] = created.id;
        templatesCreated++;
        results[`template:${tmpl.name}`] = { success: true, id: created.id };
      } catch (error) {
        results[`template:${tmpl.name}`] = {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }
    results['templates_summary'] = { success: true, count: templatesCreated };

    // 3. Seed business rules
    let rulesCreated = 0;
    for (const rule of BUSINESS_RULES) {
      try {
        const templateId = templateIds[rule.templateName] || null;
        const created = await db.businessRule.create({
          data: {
            name: rule.name,
            description: rule.description,
            workflowTemplateId: templateId,
            triggerType: rule.triggerType,
            triggerCondition: JSON.stringify(rule.triggerCondition),
            requiredEntities: rule.requiredEntities ? JSON.stringify(rule.requiredEntities) : null,
            requiredDocuments: rule.requiredDocuments ? JSON.stringify(rule.requiredDocuments) : null,
            autoExtractEntities: rule.autoExtractEntities ? JSON.stringify(rule.autoExtractEntities) : null,
            validationLogic: rule.validationLogic ? JSON.stringify(rule.validationLogic) : null,
            priority: rule.priority ?? 0,
          },
        });
        rulesCreated++;
        results[`rule:${rule.name}`] = { success: true, id: created.id };
      } catch (error) {
        results[`rule:${rule.name}`] = {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }
    results['rules_summary'] = { success: true, count: rulesCreated };

    return NextResponse.json({
      message: `Загружено: ${profilesCreated} профилей, ${templatesCreated} шаблонов, ${rulesCreated} правил`,
      results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Seeding failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
