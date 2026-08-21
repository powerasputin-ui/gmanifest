import { llmVision } from './llm/provider';

/**
 * Recovers content the local OCR pipeline missed on a low-confidence page by
 * sending that page's already-rendered image to a vision-capable LLM (via
 * whichever provider is configured in Settings — NVIDIA NIM API, a local
 * vision model, etc.) and keeping only what the local pass genuinely didn't
 * already capture.
 *
 * Deliberately a supplement, not a replacement: the local pipeline
 * (PaddleOCR + TableRecognitionPipelineV2) stays the source of truth for
 * table structure (row/column geometry, merged cells) — a general-purpose
 * vision model reads text well but doesn't reliably give the precise
 * bounding-box geometry the table-continuation and Word/Excel reconstruction
 * logic depends on. This only ever ADDS lines the local pass missed
 * entirely (confirmed case: a vessel-name field the text detector never
 * found a bounding box for at all — real OCR text vs. nothing to compare,
 * not a "which reading is right" conflict), never edits or removes
 * anything the local pass already produced.
 *
 * Returns null (never throws) on any failure — this is a best-effort
 * enhancement; a page with a low-confidence local OCR result but no vision
 * supplement is still exactly as good as before this existed.
 */

const MIN_WORD_LENGTH = 3;
// Below this fraction of a vision-model chunk's significant words already
// present in the local OCR text, the chunk counts as genuinely new content
// rather than the same text read twice — same word-overlap principle
// already validated for recover_uncaptured_inside_lines() in
// scripts/_ocr_common.py (Фаза 19), applied here at chunk/paragraph
// granularity instead of per-line.
const COVERAGE_RATIO_THRESHOLD = 0.6;

const VISION_SUPPLEMENT_PROMPT =
  'Extract ALL text visible in this scanned document image exactly as printed, preserving reading order top to bottom. Do not summarize, translate, or explain — just transcribe every word you can read, including small or faint print.';

function normalizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= MIN_WORD_LENGTH);
}

function splitIntoChunks(text: string): string[] {
  return text
    .split(/\n+/)
    .map((line) => line.replace(/\*\*/g, '').trim())
    .filter(Boolean);
}

export interface VisionSupplementResult {
  /** Recovered lines, one per array entry, in the vision model's reading order. */
  recoveredLines: string[];
}

export async function supplementLowConfidencePage(
  pageImageBase64: string,
  existingMarkdown: string,
  mimeType: string
): Promise<VisionSupplementResult | null> {
  try {
    const dataUrl = `data:${mimeType};base64,${pageImageBase64}`;
    const completion = await llmVision(VISION_SUPPLEMENT_PROMPT, dataUrl);
    if (!completion.content) return null;

    const existingWords = new Set(normalizeWords(existingMarkdown));
    const recoveredLines: string[] = [];

    for (const chunk of splitIntoChunks(completion.content)) {
      const words = normalizeWords(chunk);
      if (words.length === 0) continue;
      const coveredCount = words.filter((w) => existingWords.has(w)).length;
      const coverageRatio = coveredCount / words.length;
      if (coverageRatio < COVERAGE_RATIO_THRESHOLD) {
        recoveredLines.push(chunk);
      }
    }

    return recoveredLines.length > 0 ? { recoveredLines } : null;
  } catch {
    return null;
  }
}
