import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as fs from 'fs';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const template = await db.documentTemplate.findUnique({
    where: { id },
    include: {
      mappings: { orderBy: { createdAt: 'asc' } },
      _count: { select: { generations: true } },
    },
  });

  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  return NextResponse.json(template);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const template = await db.documentTemplate.findUnique({ where: { id } });
  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  try {
    // Delete template file
    if (template.filePath && fs.existsSync(template.filePath)) {
      await fs.promises.unlink(template.filePath);
    }

    await db.documentTemplate.delete({ where: { id } });
    return NextResponse.json({ message: 'Template deleted' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete template';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
