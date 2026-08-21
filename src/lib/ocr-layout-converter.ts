import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { callOcrWorker } from './ocr-worker-client';

// Same ceiling as OCR_TIMEOUT_MS in paddle-ocr.ts (model load + per-page
// inference) plus docx assembly, which is cheap in comparison.
const CONVERT_TIMEOUT_MS = 30 * 60_000;

/**
 * Reconstructs an approximate visual layout (rows/columns from OCR bounding
 * boxes) for a scanned PDF or image into a real, editable DOCX — the OCR
 * analogue of convertPdfLayout() for text-layer PDFs. See
 * scripts/ocr_layout_to_docx.py for the clustering algorithm.
 *
 * Returns null (never throws) when Python/PaddleOCR isn't available or the
 * conversion fails, so callers can fall back to the flat markdown-based export.
 */
export async function convertOcrLayout(filePath: string): Promise<Buffer | null> {
  const tmpOut = path.join(os.tmpdir(), `ocr-layout-${Date.now()}-${Math.random().toString(36).slice(2)}.docx`);

  try {
    const result = await callOcrWorker<{ ok: boolean }>(
      '/ocr-layout-docx',
      { path: filePath, output_path: tmpOut, pages: null },
      CONVERT_TIMEOUT_MS
    );
    if (!result) return null;
    return await fs.promises.readFile(tmpOut);
  } catch {
    return null;
  } finally {
    await fs.promises.unlink(tmpOut).catch(() => {});
  }
}
