import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { db } from '@/lib/db';
import { getParser } from '@/lib/parsers';
import { classifyDocument } from '@/lib/classifier';
import { UPLOADS_DIR } from '@/lib/paths';

const ALLOWED_TYPES = ['pdf', 'docx', 'png', 'jpg', 'jpeg', 'xlsx', 'xls'];
const UPLOAD_DIR = UPLOADS_DIR;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Determine file type
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const fileType = ext;

    if (!ALLOWED_TYPES.includes(fileType)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${fileType}. Allowed: ${ALLOWED_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Get parser
    const parser = getParser(fileType);
    if (!parser) {
      return NextResponse.json({ error: `No parser available for type: ${fileType}` }, { status: 400 });
    }

    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Save file to disk
    await mkdir(UPLOAD_DIR, { recursive: true });
    const uniqueFileName = `${Date.now()}-${file.name}`;
    const filePath = join(UPLOAD_DIR, uniqueFileName);
    await writeFile(filePath, buffer);

    // Parse the document
    const parseResult = await parser.parse(buffer, file.name);

    // Classify the document
    const classification = await classifyDocument(parseResult.markdown);

    // Create document record
    const document = await db.document.create({
      data: {
        fileName: file.name,
        fileType,
        fileSize: buffer.length,
        filePath,
        status: 'uploaded',
        markdown: parseResult.markdown,
        pageCount: parseResult.pageCount,
        metadata: JSON.stringify(parseResult.metadata),
        classificationType: classification.documentType,
        classificationConfidence: classification.confidence,
      },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
