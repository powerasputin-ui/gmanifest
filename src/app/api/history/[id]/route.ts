import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const document = await db.document.findUnique({
      where: { id },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const runs = await db.extractionRun.findMany({
      where: { documentId: id },
      include: {
        profile: true,
        fields: true,
        corrections: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      document,
      runs,
    });
  } catch (error) {
    console.error('History error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get history' },
      { status: 500 }
    );
  }
}
