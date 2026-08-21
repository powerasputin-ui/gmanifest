import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { processDocument } from '@/lib/pipeline';
import { buildModelFromExtraction } from '@/lib/unified-model';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;

  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { documentIds, profileIds } = body as {
      documentIds: string[];
      profileIds: Record<string, string>; // documentId -> profileId
    };

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json({ error: 'documentIds is required and must be non-empty' }, { status: 400 });
    }

    const results: Array<{
      documentId: string;
      status: string;
      runId?: string;
      error?: string;
    }> = [];

    for (const documentId of documentIds) {
      const profileId = profileIds?.[documentId];
      if (!profileId) {
        results.push({ documentId, status: 'skipped', error: 'No profile assigned for this document' });
        continue;
      }

      try {
        // Ensure document is in the project
        await db.projectDocument.upsert({
          where: {
            projectId_documentId: { projectId, documentId },
          },
          create: { projectId, documentId },
          update: {},
        });

        // Also set projectId on the document
        await db.document.update({
          where: { id: documentId },
          data: { projectId },
        });

        // Process document using existing extraction pipeline
        const runResult = (await processDocument(documentId, profileId)) as Record<string, unknown>;
        const runId = runResult.id as string;

        // Build unified model from extraction results
        if (runResult.processedResult) {
          const extractedData = JSON.parse(runResult.processedResult as string) as Record<string, any>;
          await buildModelFromExtraction(projectId, documentId, runId, extractedData);
        }

        results.push({ documentId, status: 'success', runId });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        results.push({ documentId, status: 'error', error: message });
      }
    }

    // Update project status
    await db.project.update({
      where: { id: projectId },
      data: { status: 'in_progress' },
    });

    return NextResponse.json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process batch';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
