import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import { db } from '@/lib/db';
import { convertOcrLayoutToExcel } from '@/lib/ocr-layout-to-excel-converter';

/**
 * A general spreadsheet COPY of the source document — same OCR evidence
 * (table structure, merged cells) as export-docx's ocr-layout path, just
 * rendered to .xlsx instead of .docx, no LLM involved. Deliberately a
 * separate route from export-sgt: that one asks an LLM to extract named
 * fields into a fixed СГТ form (a different document entirely); this one
 * reconstructs whatever table(s) the source actually has, as-is.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const document = await db.document.findUnique({ where: { id } });
  if (!document) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  let parseEngine: string | undefined;
  try {
    parseEngine = document.metadata ? JSON.parse(document.metadata).engine : undefined;
  } catch {
    parseEngine = undefined;
  }
  const isOcrScanned = parseEngine === 'paddleocr';

  if (!isOcrScanned || !document.filePath || !fs.existsSync(document.filePath)) {
    return NextResponse.json(
      { error: 'Excel reconstruction is only available for OCR-scanned documents right now' },
      { status: 404 }
    );
  }

  try {
    const buffer = await convertOcrLayoutToExcel(document.filePath);
    if (!buffer) {
      return NextResponse.json({ error: 'Failed to reconstruct document as Excel' }, { status: 500 });
    }

    const baseName = document.fileName.replace(/\.[^.]+$/, '');
    const fileName = `${baseName}.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate document';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
