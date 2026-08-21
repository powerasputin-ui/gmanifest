import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Owns the lifecycle of the persistent OCR worker (scripts/ocr_worker.py) —
 * a long-running Python/FastAPI process that loads all PaddleOCR/PaddleX
 * models ONCE and serves subsequent requests over local HTTP, instead of
 * paying full model-load cost on every single OCR call the way the old
 * one-shot `runPythonScript()` subprocess did.
 *
 * Deliberately pragmatic for a single-user local deployment: no external
 * process supervisor, no graceful shutdown protocol — just spawn-if-needed,
 * poll-until-healthy, and respawn from scratch on the next request if the
 * worker ever dies mid-run.
 */

const PORT = Number(process.env.OCR_WORKER_PORT ?? 8877);
export const OCR_WORKER_BASE_URL = `http://127.0.0.1:${PORT}`;

// Covers the worst cold-start observed this session (model load from a
// fresh process, ~60-140s) with generous headroom — this only gates how
// long we wait for the *first* request after a (re)spawn, not per-request
// inference time (that's the caller's own fetch timeout).
const STARTUP_TIMEOUT_MS = 8 * 60_000;
const HEALTH_POLL_INTERVAL_MS = 1000;

let child: ChildProcess | null = null;
let readyPromise: Promise<boolean> | null = null;

async function isHealthy(): Promise<boolean> {
  try {
    const res = await fetch(`${OCR_WORKER_BASE_URL}/health`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function spawnAndWaitForHealth(): Promise<boolean> {
  const scriptPath = path.join(process.cwd(), 'scripts', 'ocr_worker.py');
  const logDir = path.join(process.cwd(), 'logs');
  await fs.promises.mkdir(logDir, { recursive: true }).catch(() => {});
  const logStream = fs.createWriteStream(path.join(logDir, 'ocr-worker.log'), { flags: 'a' });

  const proc = spawn('python', [scriptPath, '--port', String(PORT)], {
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  proc.stdout?.pipe(logStream);
  proc.stderr?.pipe(logStream);
  proc.on('exit', () => {
    if (child === proc) {
      child = null;
      readyPromise = null;
    }
  });
  child = proc;

  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (await isHealthy()) return true;
    if (proc.exitCode !== null) return false; // crashed during startup (e.g. missing dependency)
    await sleep(HEALTH_POLL_INTERVAL_MS);
  }
  return false;
}

/**
 * Ensures the OCR worker is running and responding to /health, spawning it
 * if necessary. Safe to call concurrently — all callers share one in-flight
 * spawn attempt rather than racing to start duplicate processes. Returns
 * false (never throws) on failure, so callers fall back the same way they
 * already do when `runPythonScript()` fails.
 */
export async function ensureOcrWorkerReady(): Promise<boolean> {
  // Covers the worker already being up from a previous call, or having
  // survived a Next.js dev-mode hot reload — don't spawn a duplicate.
  if (await isHealthy()) return true;

  if (!readyPromise) {
    readyPromise = spawnAndWaitForHealth().catch(() => false);
  }
  const ok = await readyPromise;
  if (!ok) readyPromise = null; // let the next caller retry a fresh spawn
  return ok;
}

function shutdown() {
  if (child && !child.killed) {
    child.kill();
  }
}

process.on('exit', shutdown);
process.on('SIGINT', () => {
  shutdown();
  process.exit(0);
});
process.on('SIGTERM', () => {
  shutdown();
  process.exit(0);
});
