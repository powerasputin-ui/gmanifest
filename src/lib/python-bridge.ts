import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface RunPythonOptions {
  timeoutMs?: number;
  maxBufferBytes?: number;
}

const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_BUFFER = 10 * 1024 * 1024;

/**
 * Runs a local Python script via subprocess (`python <scriptPath> ...args`).
 * Returns null (never throws) when Python or a required package isn't
 * installed, or the script fails — callers should treat null as "feature
 * unavailable" and fall back gracefully rather than surfacing a 500.
 */
export async function runPythonScript(
  scriptPath: string,
  args: string[],
  options: RunPythonOptions = {}
): Promise<{ stdout: string; stderr: string } | null> {
  try {
    const { stdout, stderr } = await execFileAsync('python', [scriptPath, ...args], {
      timeout: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      maxBuffer: options.maxBufferBytes ?? DEFAULT_MAX_BUFFER,
    });
    return { stdout, stderr };
  } catch {
    return null;
  }
}
