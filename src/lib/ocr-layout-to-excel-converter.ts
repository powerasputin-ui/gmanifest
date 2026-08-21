import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { callOcrWorker } from './ocr-worker-client';

// Same ceiling as convertOcrLayout() in ocr-layout-converter.ts — same
// underlying OCR pass, just rendered to .xlsx instead of .docx.
const CONVERT_TIMEOUT_MS = 30 * 60_000;

/**
 * Reconstructs the same evidence-based layout as convertOcrLayout() (rows,
 * columns, merged cells from the recognized table structure) but as a real
 * .xlsx workbook instead of a .docx — a general spreadsheet copy of the
 * source document, not the fixed-field СГТ form (see sgt-schema.ts, a
 * deliberately different feature: that one has an LLM extract named fields
 * into a specific template; this one never involves an LLM at all, it's
 * the same deterministic OCR evidence just rendered to a different format).
 *
 * Returns null (never throws) when the worker isn't available or the
 * conversion fails, so callers can fall back accordingly.
 */
export async function convertOcrLayoutToExcel(filePath: string): Promise<Buffer | null> {
  const tmpOut = path.join(os.tmpdir(), `ocr-layout-${Date.now()}-${Math.random().toString(36).slice(2)}.xlsx`);

  try {
    const result = await callOcrWorker<{ ok: boolean }>(
      '/ocr-layout-xlsx',
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
