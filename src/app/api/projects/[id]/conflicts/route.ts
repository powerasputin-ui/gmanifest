import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getConflicts, resolveConflict } from '@/lib/unified-model';

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
    const conflicts = await getConflicts(id);
    return NextResponse.json({ data: conflicts });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get conflicts';
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
    const { entityId, fieldName, preferredValue } = body;

    if (!entityId || !fieldName || preferredValue === undefined) {
      return NextResponse.json(
        { error: 'entityId, fieldName, and preferredValue are required' },
        { status: 400 }
      );
    }

    await resolveConflict(entityId, fieldName, preferredValue);
    return NextResponse.json({ message: 'Conflict resolved' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to resolve conflict';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
