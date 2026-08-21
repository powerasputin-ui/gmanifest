import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getProjectModel, buildModelFromExtraction, ENTITY_TYPES } from '@/lib/unified-model';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const project = await db.project.findUnique({ where: { id } });
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  try {
    const model = await getProjectModel(id);
    return NextResponse.json({ data: model });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get project model';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const project = await db.project.findUnique({ where: { id } });
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { entityType, instanceId, fieldName, value } = body;

    if (!entityType || !instanceId || !fieldName) {
      return NextResponse.json(
        { error: 'entityType, instanceId, and fieldName are required' },
        { status: 400 }
      );
    }

    if (!ENTITY_TYPES.includes(entityType)) {
      return NextResponse.json(
        { error: `Invalid entity type. Must be one of: ${ENTITY_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Upsert the entity
    const existing = await db.projectEntity.findFirst({
      where: {
        projectId: id,
        entityType,
        instanceId,
        fieldName,
      },
    });

    if (existing) {
      const updated = await db.projectEntity.update({
        where: { id: existing.id },
        data: { value, isVerified: true, isPreferred: true },
      });
      return NextResponse.json(updated);
    } else {
      const created = await db.projectEntity.create({
        data: {
          projectId: id,
          entityType,
          instanceId,
          fieldName,
          value,
          isVerified: true,
          isPreferred: true,
        },
      });
      return NextResponse.json(created, { status: 201 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add entity';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
