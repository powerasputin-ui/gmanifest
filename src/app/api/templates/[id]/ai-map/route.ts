import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { llmExtract } from '@/lib/llm/provider';
import { ENTITY_TYPES, ENTITY_FIELDS } from '@/lib/unified-model';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const template = await db.documentTemplate.findUnique({ where: { id } });
  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  try {
    // Get current variables from the template
    const variables: string[] = template.variables ? JSON.parse(template.variables) : [];

    if (variables.length === 0) {
      return NextResponse.json({ error: 'No variables found in template' }, { status: 400 });
    }

    // Get existing mappings to skip already-mapped variables
    const existingMappings = await db.templateMapping.findMany({
      where: { templateId: id },
    });
    const alreadyMapped = new Set(existingMappings.map((m) => m.templateVariable));
    const unmappedVars = variables.filter((v) => !alreadyMapped.has(`{{${v}}}`));

    if (unmappedVars.length === 0) {
      return NextResponse.json({ message: 'All variables already have mappings', data: existingMappings });
    }

    // Build prompt for LLM
    const entityDefs = Object.entries(ENTITY_FIELDS)
      .map(([type, fields]) => `${type}: ${fields.map(f => `${f.field} (${f.label})`).join(', ')}`)
      .join('\n');

    const systemPrompt = `You are an expert at mapping template variables to a structured data model.

Given a list of template variables and a data model with entity types and fields,
suggest the best model path mapping for each variable.

Model path format: "EntityType.instanceId.fieldName"
Example: "Company.company_1.name" means the Company entity, instance 1, field "name".

Available entity types and fields:
${entityDefs}

Rules:
- Use instanceId "1" for the primary instance (e.g., "company_1")
- Match variable names semantically, not just by string matching
- Return a JSON array with objects: {"templateVariable": "{{var}}", "modelPath": "EntityType.instanceId.fieldName"}
- Only map variables you are confident about
- If uncertain, set confidence to "low"
- Only respond with the JSON array, no explanation`;

    const userMessage = `Map these template variables to the data model:\n${unmappedVars.map(v => `{{${v}}}`).join(', ')}`;

    const { content } = await llmExtract(systemPrompt, userMessage);

    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
    const jsonStr = (jsonMatch[1] || content).trim();
    const suggestions = JSON.parse(jsonStr) as Array<{
      templateVariable: string;
      modelPath: string;
    }>;

    // Save suggestions as auto-detected mappings
    const createdMappings: Array<{ id: string; templateId: string; templateVariable: string; modelPath: string; autoDetected: boolean; confirmed: boolean }> = [];
    for (const suggestion of suggestions) {
      const mapping = await db.templateMapping.create({
        data: {
          templateId: id,
          templateVariable: suggestion.templateVariable,
          modelPath: suggestion.modelPath,
          autoDetected: true,
          confirmed: false,
        },
      });
      createdMappings.push(mapping);
    }

    return NextResponse.json({
      data: createdMappings,
      message: `Generated ${createdMappings.length} mappings`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate AI mappings';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
