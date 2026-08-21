import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { runPythonScript } from './python-bridge';

const SCRIPT_PATH = path.join(process.cwd(), 'scripts', 'pdf_to_docx.py');
const CONVERT_TIMEOUT_MS = 60_000;

/**
 * Converts a PDF to a layout-preserving DOCX using the local `pdf2docx`
 * Python library (see scripts/pdf_to_docx.py). Requires `pip install pdf2docx`
 * to be done once on the machine — see requirements.txt.
 *
 * Returns null (never throws) when Python/pdf2docx isn't available or the
 * conversion fails, so callers can fall back to the markdown-based export.
 */
export async function convertPdfLayout(pdfPath: string): Promise<Buffer | null> {
  const tmpOut = path.join(os.tmpdir(), `pdf2docx-${Date.now()}-${Math.random().toString(36).slice(2)}.docx`);

  try {
    const result = await runPythonScript(SCRIPT_PATH, [pdfPath, tmpOut], { timeoutMs: CONVERT_TIMEOUT_MS });
    if (!result) return null;
    return await fs.promises.readFile(tmpOut);
  } catch {
    return null;
  } finally {
    await fs.promises.unlink(tmpOut).catch(() => {});
  }
}
