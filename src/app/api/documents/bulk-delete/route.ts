import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ids = body.ids as string[] | undefined;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids is required and must be non-empty' }, { status: 400 });
    }

    const result = await db.document.deleteMany({ where: { id: { in: ids } } });

    return NextResponse.json({ message: 'Documents deleted', count: result.count });
  } catch (error) {
    console.error('Bulk delete documents error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete documents' },
      { status: 500 }
    );
  }
}
