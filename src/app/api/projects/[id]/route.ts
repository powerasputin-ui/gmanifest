import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const project = await db.project.findUnique({
    where: { id },
    include: {
      documents: {
        include: { document: true },
        orderBy: { createdAt: 'desc' },
      },
      entities: {
        orderBy: [{ entityType: 'asc' }, { instanceId: 'asc' }],
      },
      generations: {
        orderBy: { createdAt: 'desc' },
      },
      workflows: {
        include: { steps: { orderBy: { stepOrder: 'asc' } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  return NextResponse.json(project);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const project = await db.project.findUnique({ where: { id } });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Workflow.projectId and DocumentGeneration.projectId have no onDelete:
    // Cascade in the schema, so they'd block project deletion with a foreign
    // key violation. DocumentGeneration must go first — it also references
    // Workflow via workflowId, which would otherwise block the Workflow delete.
    await db.documentGeneration.deleteMany({ where: { projectId: id } });
    await db.workflow.deleteMany({ where: { projectId: id } });
    // Document.projectId has no declared relation either — null it out
    // explicitly to avoid dangling refs (documents themselves are kept).
    await db.document.updateMany({ where: { projectId: id }, data: { projectId: null } });
    await db.project.delete({ where: { id } });
    return NextResponse.json({ message: 'Project deleted' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete project';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
