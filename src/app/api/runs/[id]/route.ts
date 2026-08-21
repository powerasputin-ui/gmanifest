import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const run = await db.extractionRun.findUnique({
      where: { id },
      include: {
        document: true,
        profile: true,
        fields: true,
        corrections: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!run) {
      return NextResponse.json({ error: 'Extraction run not found' }, { status: 404 });
    }

    return NextResponse.json(run);
  } catch (error) {
    console.error('Get run error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get extraction run' },
      { status: 500 }
    );
  }
}
