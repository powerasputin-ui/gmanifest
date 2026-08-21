/**
 * Frees a TCP port before `next dev` / `start`.
 *
 * On Windows, killing `bun run dev` / `bun run start` leaves the child
 * node/next-server process alive and holding the port, so the next launch
 * fails with EADDRINUSE. This script kills whatever listens on the port.
 *
 * Usage: node scripts/kill-port.mjs [port]   (default 3000)
 */
import { execSync } from 'node:child_process';

const port = Number(process.argv[2] || 3000);

try {
  if (process.platform === 'win32') {
    const ps =
      `try { Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction Stop ` +
      `| Select-Object -ExpandProperty OwningProcess -Unique } catch {}; exit 0`;
    const out = execSync(`powershell -NoProfile -Command "${ps}"`, {
      encoding: 'utf8',
    }).trim();
    if (!out) {
      console.log(`[kill-port] port ${port} is free`);
      process.exit(0);
    }
    for (const pid of out.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)) {
      try {
        process.kill(Number(pid), 'SIGKILL');
        console.log(`[kill-port] killed orphan PID ${pid} on port ${port}`);
      } catch {
        /* already gone */
      }
    }
  } else {
    const out = execSync(`lsof -ti :${port} || true`, { encoding: 'utf8' }).trim();
    for (const pid of out.split(/\r?\n/).filter(Boolean)) {
      try {
        process.kill(Number(pid), 'SIGKILL');
        console.log(`[kill-port] killed orphan PID ${pid} on port ${port}`);
      } catch {
        /* already gone */
      }
    }
    if (!out) console.log(`[kill-port] port ${port} is free`);
  }
} catch (err) {
  // Never block dev/start because of this helper.
  console.warn(`[kill-port] warning: ${err.message}`);
}
