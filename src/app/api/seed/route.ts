import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST() {
  try {
    const DEFAULT_SETTINGS = [
      {
        key: 'llm_provider',
        value: 'zai',
        category: 'llm',
        description: 'AI-провайдер: zai (встроенный), api (облако по токену), local (локальная модель)',
      },
      {
        key: 'llm_api_key',
        value: '',
        category: 'llm',
        description: 'API-токен (для режима api; для local обычно не нужен)',
      },
      {
        key: 'llm_base_url',
        value: '',
        category: 'llm',
        description: 'Base URL API: https://api.openai.com/v1, https://integrate.api.nvidia.com/v1 (NVIDIA NIM), http://localhost:11434/v1 (Ollama), http://localhost:1234/v1 (LM Studio)',
      },
      {
        key: 'llm_temperature',
        value: '0.1',
        category: 'llm',
        description: 'LLM temperature for extraction',
      },
      {
        key: 'llm_max_tokens',
        value: '4096',
        category: 'llm',
        description: 'Maximum tokens for LLM responses',
      },
      {
        key: 'llm_model',
        value: 'default',
        category: 'llm',
        description: 'Default LLM model',
      },
      {
        key: 'max_file_size_mb',
        value: '50',
        category: 'general',
        description: 'Maximum upload file size in MB',
      },
      {
        key: 'allowed_file_types',
        value: 'pdf,docx,png,jpg,jpeg,xlsx,xls',
        category: 'general',
        description: 'Allowed file types for upload',
      },
      {
        key: 'ui_module_workflows',
        value: 'false',
        category: 'ui',
        description: 'Показывать раздел «Бизнес-процессы» в меню',
      },
      {
        key: 'ui_module_templates',
        value: 'false',
        category: 'ui',
        description: 'Показывать раздел «Шаблоны» в меню',
      },
      {
        key: 'ui_module_profiles',
        value: 'false',
        category: 'ui',
        description: 'Показывать раздел «Профили» в меню',
      },
      {
        key: 'ui_module_rules',
        value: 'false',
        category: 'ui',
        description: 'Показывать раздел «Правила» в меню',
      },
    ];

    // Settings are seeded idempotently, even if profiles already exist
    const existingKeys = new Set(
      (await db.settings.findMany({ select: { key: true } })).map((s) => s.key)
    );
    const missingSettings = DEFAULT_SETTINGS.filter((s) => !existingKeys.has(s.key));
    if (missingSettings.length > 0) {
      await db.settings.createMany({ data: missingSettings });
    }

    // Check if profiles already exist
    const existingProfiles = await db.extractionProfile.count();
    if (existingProfiles > 0) {
      return NextResponse.json({
        message: 'Database already seeded',
        count: existingProfiles,
        settingsCreated: missingSettings.length,
      });
    }

    // Seed profiles
    const profiles = await db.extractionProfile.createMany({
      data: [
        {
          name: 'Счет на оплату',
          description: 'Extraction profile for Russian invoices (счета на оплату)',
          entityType: 'FinancialData',
          jsonSchema:
            '{"type":"object","properties":{"seller_name":{"type":"string","description":"Название продавца"},"seller_inn":{"type":"string","description":"ИНН продавца"},"seller_kpp":{"type":"string","description":"КПП продавца"},"buyer_name":{"type":"string","description":"Название покупателя"},"buyer_inn":{"type":"string","description":"ИНН покупателя"},"invoice_number":{"type":"string","description":"Номер счета"},"invoice_date":{"type":"string","description":"Дата счета"},"total_amount":{"type":"string","description":"Сумма"},"vat_amount":{"type":"string","description":"Сумма НДС"},"items":{"type":"array","description":"Список товаров/услуг","items":{"type":"object","properties":{"name":{"type":"string"},"quantity":{"type":"string"},"price":{"type":"string"},"amount":{"type":"string"}}}}},"required":[]}',
          promptTemplate:
            'Извлеки данные из этого документа (счет на оплату). Верни ТОЛЬКО JSON. Если поле не найдено — верни null.',
          validationRules:
            '{"seller_inn":["inn"],"seller_kpp":["kpp"],"buyer_inn":["inn"],"invoice_date":["date"],"total_amount":["amount","required"]}',
          isActive: true,
        },
        {
          name: 'Договор',
          description: 'Extraction profile for contracts (договоры)',
          entityType: 'Contract',
          jsonSchema:
            '{"type":"object","properties":{"contract_type":{"type":"string","description":"Тип договора"},"contract_number":{"type":"string","description":"Номер договора"},"contract_date":{"type":"string","description":"Дата договора"},"party_a":{"type":"string","description":"Сторона А"},"party_a_inn":{"type":"string","description":"ИНН стороны А"},"party_b":{"type":"string","description":"Сторона Б"},"party_b_inn":{"type":"string","description":"ИНН стороны Б"},"subject":{"type":"string","description":"Предмет договора"},"amount":{"type":"string","description":"Сумма договора"},"validity_period":{"type":"string","description":"Срок действия"},"director_a":{"type":"string","description":"Руководитель стороны А"},"director_b":{"type":"string","description":"Руководитель стороны Б"}},"required":[]}',
          promptTemplate:
            'Извлеки данные из этого документа (договор). Верни ТОЛЬКО JSON. Если поле не найдено — верни null.',
          validationRules:
            '{"party_a_inn":["inn"],"party_b_inn":["inn"],"contract_date":["date"],"amount":["amount"]}',
          isActive: true,
        },
        {
          name: 'Резюме',
          description: 'Extraction profile for employee resumes (резюме)',
          entityType: 'Personnel',
          jsonSchema:
            '{"type":"object","properties":{"full_name":{"type":"string","description":"ФИО"},"birth_date":{"type":"string","description":"Дата рождения"},"email":{"type":"string","description":"Email"},"phone":{"type":"string","description":"Телефон"},"location":{"type":"string","description":"Город проживания"},"skills":{"type":"array","description":"Навыки","items":{"type":"string"}},"experience":{"type":"array","description":"Опыт работы","items":{"type":"object","properties":{"company":{"type":"string"},"position":{"type":"string"},"period":{"type":"string"},"description":{"type":"string"}}}},"education":{"type":"array","description":"Образование","items":{"type":"object","properties":{"institution":{"type":"string"},"degree":{"type":"string"},"year":{"type":"string"}}}},"languages":{"type":"array","description":"Языки","items":{"type":"string"}}},"required":[]}',
          promptTemplate:
            'Извлеки данные из этого резюме. Верни ТОЛЬКО JSON. Если поле не найдено — верни null.',
          validationRules: '{"email":["email"],"phone":["phone"],"birth_date":["date"]}',
          isActive: true,
        },
      ],
    });

    return NextResponse.json(
      {
        message: 'Database seeded successfully',
        profilesCreated: profiles.count,
        settingsCreated: missingSettings.length,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Seeding failed' },
      { status: 500 }
    );
  }
}
