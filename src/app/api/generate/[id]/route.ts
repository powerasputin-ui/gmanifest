import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as fs from 'fs';
import * as path from 'path';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const generation = await db.documentGeneration.findUnique({
    where: { id },
    include: {
      template: true,
      project: true,
      sourceDocuments: true,
    },
  });

  if (!generation) {
    return NextResponse.json({ error: 'Generation not found' }, { status: 404 });
  }

  return NextResponse.json(generation);
}
