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
  });

  if (!generation) {
    return NextResponse.json({ error: 'Generation not found' }, { status: 404 });
  }

  if (!generation.outputFilePath || !fs.existsSync(generation.outputFilePath)) {
    return NextResponse.json({ error: 'Output file not found' }, { status: 404 });
  }

  try {
    const fileBuffer = await fs.promises.readFile(generation.outputFilePath);
    const fileName = generation.outputFileName || `generated_${id}.docx`;

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to read file';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
