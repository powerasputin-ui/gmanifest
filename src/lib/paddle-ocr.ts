import { callOcrWorker } from './ocr-worker-client';

// Covers the worst cold-start observed this session even before the
// persistent-worker fix (a fresh process's first request pays full model
// load) plus real inference time for a multi-page document. Once the
// worker is warm, actual requests finish far under this — it's a ceiling,
// not a target. A 3-page real document was previously observed exceeding a
// 10-minute budget under the old one-shot-subprocess architecture, which
// made runOcr() return null and — worse — pdf-inspector-parser.ts silently
// fell back to an *empty* result instead of surfacing an error (fixed
// separately in pdf-inspector-parser.ts).
const OCR_TIMEOUT_MS = 30 * 60_000;

export interface OcrLine {
  text: string;
  box?: number[][];
  score?: number;
}

export interface OcrPage {
  page: number;
  text: string;
  lines?: OcrLine[];
  avgConfidence?: number | null;
  lowConfidenceLines?: number;
  sealsExcluded?: number;
  // Present only for pages below the confidence threshold that triggers a
  // vision-API supplement (see _ocr_common.py's VISION_SUPPLEMENT_CONFIDENCE_THRESHOLD
  // and vision-ocr-supplement.ts) — the worker's already-rendered page PNG,
  // raw base64 with no data: URI prefix (the caller knows the actual mime
  // type; the worker doesn't need to care).
  pageImageBase64?: string;
}

/**
 * Runs real OCR (PaddleOCR, RU+EN model) on an image or PDF via
 * scripts/ocr_document.py. Requires `pip install -r requirements.txt`
 * (paddleocr + paddlepaddle) to be done once on the machine.
 *
 * Returns null (never throws) when Python/PaddleOCR isn't available or the
 * OCR run fails, so callers can fall back to their existing behavior.
 */
export async function runOcr(filePath: string, pages?: number[]): Promise<OcrPage[] | null> {
  const result = await callOcrWorker<{ pages: OcrPage[] }>(
    '/ocr',
    { path: filePath, pages: pages && pages.length > 0 ? pages : null },
    OCR_TIMEOUT_MS
  );
  return result ? result.pages : null;
}

export interface OcrQualitySummary {
  avgConfidence: number | null;
  lowConfidenceLines: number;
  sealsExcluded: number;
}

/** Aggregates per-page OCR quality stats across a document so callers can
 * surface a single "how trustworthy is this OCR result" signal instead of
 * silently treating every recognized line as equally reliable. */
export function summarizeOcrQuality(pages: OcrPage[]): OcrQualitySummary {
  const confidences = pages.map((p) => p.avgConfidence).filter((c): c is number => typeof c === 'number');
  const avgConfidence = confidences.length > 0 ? confidences.reduce((a, b) => a + b, 0) / confidences.length : null;
  const lowConfidenceLines = pages.reduce((sum, p) => sum + (p.lowConfidenceLines ?? 0), 0);
  const sealsExcluded = pages.reduce((sum, p) => sum + (p.sealsExcluded ?? 0), 0);
  return { avgConfidence, lowConfidenceLines, sealsExcluded };
}
