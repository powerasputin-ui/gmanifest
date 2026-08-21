import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import { db } from '@/lib/db';
import { markdownToDocx } from '@/lib/markdown-to-docx';
import { convertPdfLayout } from '@/lib/pdf-layout-converter';
import { convertOcrLayout } from '@/lib/ocr-layout-converter';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const document = await db.document.findUnique({ where: { id } });
  if (!document) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }
  if (!document.markdown) {
    return NextResponse.json({ error: 'Document has no extracted text' }, { status: 404 });
  }

  try {
    let buffer: Buffer;
    let engine: 'pdf2docx' | 'ocr-layout' | 'markdown-fallback' = 'markdown-fallback';

    // pdf2docx reconstructs layout from the PDF's own text layer — for a
    // scanned PDF with no text layer (parsed via pdf-parse fallback or
    // PaddleOCR), it has nothing to lay out and silently produces a docx
    // containing just the scanned page as one embedded image ("a photo"),
    // discarding the real OCR'd text we already have in document.markdown.
    // Only worth trying when the primary parser found a genuine text layer.
    let parseEngine: string | undefined;
    try {
      parseEngine = document.metadata ? JSON.parse(document.metadata).engine : undefined;
    } catch {
      parseEngine = undefined;
    }
    const hasRealTextLayer = parseEngine === 'pdf-inspector';
    const isOcrScanned = parseEngine === 'paddleocr';

    if (document.fileType === 'pdf' && hasRealTextLayer && fs.existsSync(document.filePath)) {
      const layoutBuffer = await convertPdfLayout(document.filePath);
      if (layoutBuffer) {
        buffer = layoutBuffer;
        engine = 'pdf2docx';
      } else {
        buffer = Buffer.from(await markdownToDocx(document.markdown));
      }
    } else if (isOcrScanned && fs.existsSync(document.filePath)) {
      // Reconstruct row/column layout from PaddleOCR's bounding boxes (see
      // ocr_layout_to_docx.py) instead of just dumping the flat OCR'd text —
      // same "real editable text, not an image" approach as the pdf2docx
      // path above, driven by OCR geometry instead of PDF text-layer geometry.
      const ocrLayoutBuffer = await convertOcrLayout(document.filePath);
      if (ocrLayoutBuffer) {
        buffer = ocrLayoutBuffer;
        engine = 'ocr-layout';
      } else {
        buffer = Buffer.from(await markdownToDocx(document.markdown));
      }
    } else {
      buffer = Buffer.from(await markdownToDocx(document.markdown));
    }

    const baseName = document.fileName.replace(/\.[^.]+$/, '');
    const fileName = `${baseName}.docx`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
        'Content-Length': buffer.length.toString(),
        'X-Docx-Engine': engine,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate document';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
