import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { processDocument } from '@/lib/pipeline';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { profileId } = body;

    if (!profileId) {
      return NextResponse.json({ error: 'profileId is required' }, { status: 400 });
    }

    // Verify document exists
    const document = await db.document.findUnique({ where: { id } });
    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Verify profile exists
    const profile = await db.extractionProfile.findUnique({ where: { id: profileId } });
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Update document status to processing
    await db.document.update({
      where: { id },
      data: { status: 'processing' },
    });

    // Run the pipeline
    const run = await processDocument(id, profileId);

    return NextResponse.json(run);
  } catch (error) {
    console.error('Process document error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Processing failed' },
      { status: 500 }
    );
  }
}
