import * as http from 'http';
import { ensureOcrWorkerReady, OCR_WORKER_BASE_URL } from './ocr-worker-manager';

/**
 * HTTP transport to the persistent OCR worker, preserving the same
 * never-throw / return-null-on-failure contract `runPythonScript()` already
 * established — so every existing fallback path (`tryOcr()` falling back to
 * markdown extraction, `export-docx` falling back between `pdf2docx` /
 * `ocr-layout` / `markdown-fallback` engines) keeps working unchanged.
 *
 * Deliberately uses `node:http` instead of the global `fetch()`: Bun (which
 * runs the production server, `bun .next/standalone/server.js`) hardcodes a
 * 5-minute timeout on `fetch()` requests that `AbortSignal.timeout()` does
 * not override (a known Bun limitation, not something in this codebase) —
 * confirmed by reproducing it directly: a dense multi-page table document
 * that legitimately takes ~300-410s to process failed consistently via
 * `fetch()` right around the 5-minute mark, while the exact same request
 * succeeded every time through `node:http`, which Bun implements as a
 * separate compatibility layer not subject to the same hardcoded cap.
 */
export async function callOcrWorker<T>(
  endpointPath: string,
  body: Record<string, unknown>,
  timeoutMs: number
): Promise<T | null> {
  try {
    if (!(await ensureOcrWorkerReady())) return null;

    const payload = JSON.stringify(body);
    const url = new URL(`${OCR_WORKER_BASE_URL}${endpointPath}`);

    const responseText = await new Promise<string | null>((resolve) => {
      const req = http.request(
        {
          hostname: url.hostname,
          port: url.port,
          path: url.pathname,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
          },
          timeout: timeoutMs,
        },
        (res) => {
          if (res.statusCode !== 200) {
            res.resume(); // drain so the socket can close
            resolve(null);
            return;
          }
          const chunks: Buffer[] = [];
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
          res.on('error', () => resolve(null));
        }
      );
      req.on('timeout', () => req.destroy());
      req.on('error', () => resolve(null));
      req.write(payload);
      req.end();
    });

    if (responseText === null) return null;
    return JSON.parse(responseText) as T;
  } catch {
    return null;
  }
}
