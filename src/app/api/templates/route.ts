import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractVariables } from '@/lib/template-engine';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'templates');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export async function GET(_request: NextRequest) {
  const templates = await db.documentTemplate.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { mappings: true, generations: true } },
    },
  });

  return NextResponse.json({ data: templates });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const name = formData.get('name') as string | null;
    const description = formData.get('description') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    // Validate file type
    if (!file.name.endsWith('.docx')) {
      return NextResponse.json({ error: 'Only .docx files are supported' }, { status: 400 });
    }

    // Save file
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileId = randomUUID();
    const filePath = path.join(UPLOAD_DIR, `${fileId}.docx`);
    await fs.promises.writeFile(filePath, fileBuffer);

    // Extract variables
    let variables: string[] = [];
    try {
      variables = await extractVariables(filePath);
    } catch (error) {
      console.warn('Failed to extract variables:', error);
    }

    // Create template record
    const template = await db.documentTemplate.create({
      data: {
        name: name || file.name.replace('.docx', ''),
        description: description || null,
        fileType: 'docx',
        filePath,
        fileName: file.name,
        variables: JSON.stringify(variables),
        isActive: true,
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to upload template';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
