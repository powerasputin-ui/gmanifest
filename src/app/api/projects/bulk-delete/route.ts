import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ids = body.ids as string[] | undefined;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids is required and must be non-empty' }, { status: 400 });
    }

    // Workflow.projectId and DocumentGeneration.projectId have no onDelete:
    // Cascade in the schema, so they'd block project deletion with a foreign
    // key violation. DocumentGeneration must go first — it also references
    // Workflow via workflowId, which would otherwise block the Workflow delete.
    await db.documentGeneration.deleteMany({ where: { projectId: { in: ids } } });
    await db.workflow.deleteMany({ where: { projectId: { in: ids } } });
    // Document.projectId has no declared relation either — null it out
    // explicitly to avoid dangling refs (documents themselves are kept).
    await db.document.updateMany({ where: { projectId: { in: ids } }, data: { projectId: null } });
    const result = await db.project.deleteMany({ where: { id: { in: ids } } });

    return NextResponse.json({ message: 'Projects deleted', count: result.count });
  } catch (error) {
    console.error('Bulk delete projects error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete projects' },
      { status: 500 }
    );
  }
}
