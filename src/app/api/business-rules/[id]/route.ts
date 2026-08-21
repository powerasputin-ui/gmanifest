import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const rule = await db.businessRule.findUnique({
    where: { id },
    include: { workflowTemplate: { select: { id: true, name: true } } },
  });

  if (!rule) {
    return NextResponse.json({ error: 'Правило не найдено' }, { status: 404 });
  }

  return NextResponse.json(rule);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const existing = await db.businessRule.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Правило не найдено' }, { status: 404 });
    }

    const rule = await db.businessRule.update({
      where: { id },
      data: {
        name: body.name ?? existing.name,
        description: body.description !== undefined ? body.description : existing.description,
        triggerType: body.triggerType ?? existing.triggerType,
        triggerCondition: body.triggerCondition ? JSON.stringify(body.triggerCondition) : existing.triggerCondition,
        requiredEntities: body.requiredEntities ? JSON.stringify(body.requiredEntities) : existing.requiredEntities,
        requiredDocuments: body.requiredDocuments ? JSON.stringify(body.requiredDocuments) : existing.requiredDocuments,
        autoExtractEntities: body.autoExtractEntities ? JSON.stringify(body.autoExtractEntities) : existing.autoExtractEntities,
        validationLogic: body.validationLogic ? JSON.stringify(body.validationLogic) : existing.validationLogic,
        priority: body.priority !== undefined ? body.priority : existing.priority,
        isActive: body.isActive !== undefined ? body.isActive : existing.isActive,
      },
    });

    return NextResponse.json(rule);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update rule';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const rule = await db.businessRule.findUnique({ where: { id } });
  if (!rule) {
    return NextResponse.json({ error: 'Правило не найдено' }, { status: 404 });
  }

  try {
    await db.businessRule.delete({ where: { id } });
    return NextResponse.json({ message: 'Правило удалено' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete rule';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
