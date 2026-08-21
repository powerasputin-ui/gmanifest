import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const template = await db.documentTemplate.findUnique({ where: { id } });
  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  const mappings = await db.templateMapping.findMany({
    where: { templateId: id },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({ data: mappings });
}

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
    const body = await request.json();
    const { templateVariable, modelPath, autoDetected } = body;

    if (!templateVariable || !modelPath) {
      return NextResponse.json(
        { error: 'templateVariable and modelPath are required' },
        { status: 400 }
      );
    }

    // Upsert: if mapping exists for this templateVariable, update it
    const existing = await db.templateMapping.findFirst({
      where: { templateId: id, templateVariable },
    });

    if (existing) {
      const updated = await db.templateMapping.update({
        where: { id: existing.id },
        data: { modelPath, autoDetected: autoDetected ?? existing.autoDetected },
      });
      return NextResponse.json(updated);
    } else {
      const created = await db.templateMapping.create({
        data: {
          templateId: id,
          templateVariable,
          modelPath,
          autoDetected: autoDetected ?? false,
          confirmed: false,
        },
      });
      return NextResponse.json(created, { status: 201 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create mapping';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const template = await db.documentTemplate.findUnique({ where: { id } });
  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { mappingId, confirmed } = body;

    if (!mappingId) {
      return NextResponse.json({ error: 'mappingId is required' }, { status: 400 });
    }

    const mapping = await db.templateMapping.findFirst({
      where: { id: mappingId, templateId: id },
    });

    if (!mapping) {
      return NextResponse.json({ error: 'Mapping not found' }, { status: 404 });
    }

    const updated = await db.templateMapping.update({
      where: { id: mappingId },
      data: { confirmed: confirmed !== undefined ? confirmed : true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to confirm mapping';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
