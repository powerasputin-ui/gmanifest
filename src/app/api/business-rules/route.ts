import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workflowTemplateId = searchParams.get('workflowTemplateId');

    const where: Record<string, unknown> = { isActive: true };
    if (workflowTemplateId) {
      where.workflowTemplateId = workflowTemplateId;
    }

    const rules = await db.businessRule.findMany({
      where,
      orderBy: { priority: 'desc' },
      include: { workflowTemplate: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ data: rules });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list rules';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, workflowTemplateId, triggerType, triggerCondition, requiredEntities, requiredDocuments, autoExtractEntities, validationLogic, priority } = body;

    if (!name || !triggerType) {
      return NextResponse.json({ error: 'name and triggerType are required' }, { status: 400 });
    }

    const rule = await db.businessRule.create({
      data: {
        name,
        description: description || null,
        workflowTemplateId: workflowTemplateId || null,
        triggerType,
        triggerCondition: triggerCondition ? JSON.stringify(triggerCondition) : null,
        requiredEntities: requiredEntities ? JSON.stringify(requiredEntities) : null,
        requiredDocuments: requiredDocuments ? JSON.stringify(requiredDocuments) : null,
        autoExtractEntities: autoExtractEntities ? JSON.stringify(autoExtractEntities) : null,
        validationLogic: validationLogic ? JSON.stringify(validationLogic) : null,
        priority: priority ?? 0,
      },
    });

    return NextResponse.json(rule, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create rule';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
