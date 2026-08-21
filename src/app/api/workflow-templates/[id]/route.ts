import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const template = await db.workflowTemplate.findUnique({
    where: { id },
    include: {
      rules: { where: { isActive: true }, orderBy: { priority: 'desc' } },
      _count: { select: { workflows: true } },
    },
  });

  if (!template) {
    return NextResponse.json({ error: 'Шаблон не найден' }, { status: 404 });
  }

  return NextResponse.json(template);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const existing = await db.workflowTemplate.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Шаблон не найден' }, { status: 404 });
    }

    const template = await db.workflowTemplate.update({
      where: { id },
      data: {
        name: body.name ?? existing.name,
        description: body.description !== undefined ? body.description : existing.description,
        category: body.category ?? existing.category,
        icon: body.icon !== undefined ? body.icon : existing.icon,
        color: body.color !== undefined ? body.color : existing.color,
        isActive: body.isActive !== undefined ? body.isActive : existing.isActive,
        requiredEntityTypes: body.requiredEntityTypes ? JSON.stringify(body.requiredEntityTypes) : existing.requiredEntityTypes,
        requiredDocumentTypes: body.requiredDocumentTypes ? JSON.stringify(body.requiredDocumentTypes) : existing.requiredDocumentTypes,
        outputTemplates: body.outputTemplates ? JSON.stringify(body.outputTemplates) : existing.outputTemplates,
        defaultSteps: body.defaultSteps ? JSON.stringify(body.defaultSteps) : existing.defaultSteps,
      },
    });

    return NextResponse.json(template);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update template';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const template = await db.workflowTemplate.findUnique({ where: { id } });
  if (!template) {
    return NextResponse.json({ error: 'Шаблон не найден' }, { status: 404 });
  }

  try {
    await db.workflowTemplate.delete({ where: { id } });
    return NextResponse.json({ message: 'Шаблон удалён' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete template';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
