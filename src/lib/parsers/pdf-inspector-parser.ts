import { processPdf } from '@firecrawl/pdf-inspector';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { DocumentParser, ParseResult } from './types';
import { PdfParser } from './pdf-parser';
import { runOcr, summarizeOcrQuality } from '@/lib/paddle-ocr';
import { supplementLowConfidencePage } from '@/lib/vision-ocr-supplement';

/**
 * PDF parser backed by Firecrawl's pdf-inspector (Rust/napi).
 * Runs fully locally — no network calls.
 * Falls back to the pdf-parse based parser for scanned/image-based
 * PDFs or when markdown extraction yields nothing, and finally to
 * real OCR (PaddleOCR) for pages that still have no extractable text
 * (genuine scans with no text layer).
 */
export class PdfInspectorParser implements DocumentParser {
  private readonly fallback = new PdfParser();

  canParse(fileType: string): boolean {
    return fileType === 'pdf' || fileType === 'application/pdf';
  }

  async parse(buffer: Buffer, fileName: string): Promise<ParseResult> {
    let result;
    try {
      result = processPdf(buffer);
    } catch (error) {
      // Native parser failed on this file — fall back to pdf-parse
      const fallbackResult = await this.fallback.parse(buffer, fileName);
      fallbackResult.metadata.engine = 'pdf-parse';
      fallbackResult.metadata.fallbackReason =
        `pdf-inspector error: ${error instanceof Error ? error.message : String(error)}`;
      return fallbackResult;
    }

    const needsFallback =
      !result.markdown ||
      result.markdown.trim().length === 0 ||
      result.pdfType === 'Scanned' ||
      result.pdfType === 'ImageBased';

    // Scanners/watermarks sometimes embed a trivial text layer (e.g. a page-count
    // stamp like "-- 1 of 1 --") that is technically non-empty but not real content.
    // A real page of extracted text is normally hundreds of characters.
    const MIN_MEANINGFUL_TEXT_LENGTH = 200;

    if (needsFallback) {
      const fallbackResult = await this.fallback.parse(buffer, fileName);
      if (fallbackResult.markdown.trim().length > MIN_MEANINGFUL_TEXT_LENGTH) {
        fallbackResult.metadata.engine = 'pdf-parse';
        fallbackResult.metadata.fallbackReason = `pdf-inspector: ${result.pdfType}, no text layer`;
        fallbackResult.metadata.pdfType = result.pdfType;
        fallbackResult.metadata.pagesNeedingOcr = result.pagesNeedingOcr;
        return fallbackResult;
      }

      // Neither pdf-inspector nor pdf-parse found meaningful text — this is
      // a genuine scan (no usable text layer). Try real OCR instead of
      // returning an empty/placeholder document. OCR the whole PDF rather
      // than trying to map `pagesNeedingOcr` to page indices — pdf-inspector's
      // numbering convention there isn't reliably 0-indexed, and if the text
      // layer is missing it's almost always missing on every page anyway.
      if (result.pagesNeedingOcr && result.pagesNeedingOcr.length > 0) {
        const ocrResult = await this.tryOcr(buffer, fileName);
        if (ocrResult) return ocrResult;

        // OCR is the only source of real content for a genuine scan — if it
        // failed (subprocess crash/timeout) or returned no text, falling
        // through to `result.markdown` here would silently return an empty
        // document that *looks* like a successful upload (status
        // "uploaded", no error) but has nothing to export and no
        // indication anything went wrong. Fail loudly instead — the upload
        // route's catch block turns this into a clear error response
        // rather than a phantom empty document.
        throw new Error(
          `Не удалось распознать текст скана «${fileName}» (OCR не вернул результат — возможно, обработка заняла слишком много времени). Попробуйте загрузить документ ещё раз.`
        );
      }
    }

    const markdown = result.markdown || '';
    const text = markdown.replace(/[#*|\-]/g, ' ').replace(/\s+/g, ' ').trim();

    const metadata: Record<string, unknown> = {
      engine: 'pdf-inspector',
      pdfType: result.pdfType,
      confidence: result.confidence,
      title: result.title || null,
      pageCount: result.pageCount,
      pagesNeedingOcr: result.pagesNeedingOcr,
      isComplexLayout: result.isComplexLayout,
      pagesWithTables: result.pagesWithTables,
      pagesWithColumns: result.pagesWithColumns,
      hasEncodingIssues: result.hasEncodingIssues,
      processingTimeMs: result.processingTimeMs,
    };

    return {
      markdown,
      text,
      metadata,
      pageCount: result.pageCount,
    };
  }

  private async tryOcr(buffer: Buffer, fileName: string): Promise<ParseResult | null> {
    const tmpPath = path.join(os.tmpdir(), `ocr-pdf-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`);
    await fs.promises.writeFile(tmpPath, buffer);
    try {
      const ocrPages = await runOcr(tmpPath);
      if (!ocrPages || ocrPages.length === 0) return null;

      // Pages the worker flagged as low-confidence carry their own already-
      // rendered image (see VISION_SUPPLEMENT_CONFIDENCE_THRESHOLD in
      // _ocr_common.py) — best-effort recovery of content the local OCR
      // pipeline missed entirely (e.g. a text-detection box that was never
      // found at all, not just misread) via whichever vision-capable model
      // is configured in Settings. Never blocks or fails the upload: a
      // page without pageImageBase64, or a supplement call that fails,
      // just keeps the local-only result exactly as before.
      let visionSupplementedLines = 0;
      for (const p of ocrPages) {
        if (!p.pageImageBase64) continue;
        const supplement = await supplementLowConfidencePage(p.pageImageBase64, p.text, 'image/png');
        if (supplement) {
          p.text = `${p.text}\n\n${supplement.recoveredLines.join('\n')}`;
          visionSupplementedLines += supplement.recoveredLines.length;
        }
      }

      const markdown = ocrPages
        .filter((p) => p.text.trim().length > 0)
        .map((p) => `## Page ${p.page + 1}\n\n${p.text}`)
        .join('\n\n');
      if (!markdown.trim()) return null;

      return {
        markdown,
        text: markdown.replace(/\s+/g, ' ').trim(),
        metadata: {
          engine: 'paddleocr',
          fallbackReason: `${fileName}: scanned PDF, no text layer`,
          ocrQuality: summarizeOcrQuality(ocrPages),
          ...(visionSupplementedLines > 0 ? { visionSupplementedLines } : {}),
        },
        pageCount: ocrPages.length,
      };
    } finally {
      await fs.promises.unlink(tmpPath).catch(() => {});
    }
  }
}
