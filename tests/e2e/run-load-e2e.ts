/**
 * Load/concurrency test — fires multiple requests in parallel to catch
 * race conditions, cross-request data mixing, and subprocess contention
 * (pdf2docx/PaddleOCR/LLM calls all shell out or hit external endpoints).
 *
 * Run: bun tests/e2e/run-load-e2e.ts
 * Prereq: server running, LLM provider configured.
 */
import { readFileSync, writeFileSync } from 'fs';

const BASE = 'http://localhost:3000/api';
const results: Array<{ name: string; ok: boolean; detail: string }> = [];

function record(name: string, ok: boolean, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}

const FIXTURES = [
  { path: 'tests/e2e/fixtures/invoice-test.pdf', label: 'invoice' },
  { path: 'tests/e2e/fixtures/scanned-real-test.pdf', label: 'scanned' },
  { path: 'tests/e2e/fixtures/Fire_Opal_Specifications.pdf', label: 'fireopal' },
  { path: 'tests/e2e/fixtures/ZHONG_TIAN_39_Introduction.pdf', label: 'zhongtian' },
];

async function upload(path: string, label: string, idx: number) {
  const buf = readFileSync(path);
  const form = new FormData();
  form.append('file', new Blob([buf]), `load-${label}-${idx}.pdf`);
  const res = await fetch(`${BASE}/upload`, { method: 'POST', body: form });
  const body = await res.json();
  return { status: res.status, id: body.id as string | undefined, markdown: body.markdown as string | undefined, label };
}

// ── 1. Parallel uploads — 5 concurrent, mixed fixtures ──────────────────
const uploadJobs = Array.from({ length: 5 }, (_, i) => {
  const fixture = FIXTURES[i % FIXTURES.length];
  return upload(fixture.path, fixture.label, i);
});
const uploaded = await Promise.all(uploadJobs);

record('5 parallel uploads all succeeded', uploaded.every((u) => u.status === 201), JSON.stringify(uploaded.map((u) => u.status)));
const distinctIds = new Set(uploaded.map((u) => u.id));
record('5 parallel uploads got 5 distinct ids', distinctIds.size === 5, `${distinctIds.size} distinct`);

// Cross-contamination check: each doc's markdown must match its own fixture, not a sibling's.
let contaminated = false;
for (const u of uploaded) {
  if (u.label === 'fireopal' && !u.markdown?.includes('FIRE OPAL')) contaminated = true;
  if (u.label === 'zhongtian' && !u.markdown?.includes('ZHONG TIAN')) contaminated = true;
}
record('No cross-contamination between parallel uploads', !contaminated);

// ── 2. Parallel export-docx on the uploaded documents ────────────────────
// 'scanned' fixture (scanned-real-test.pdf) now has real OCR content — a
// genuinely content-less scan can no longer reach 'uploaded' status at all
// (upload itself throws instead of silently succeeding empty, see
// pdf-inspector-parser.ts), so there is no content-less-scan 404 case left
// to test here; every uploaded document is expected to export successfully.
const exportableUploads = uploaded.filter((u) => u.id);
const docxJobs = exportableUploads.map(async (u) => {
  const res = await fetch(`${BASE}/documents/${u.id}/export-docx`);
  const buf = Buffer.from(await res.arrayBuffer());
  return { label: u.label, status: res.status, isZip: buf.length > 50 && buf[0] === 0x50 && buf[1] === 0x4b };
});
const docxResults = await Promise.all(docxJobs);
record(`${docxResults.length} parallel export-docx all 200`, docxResults.every((r) => r.status === 200), JSON.stringify(docxResults.map((r) => r.status)));
record('Parallel export-docx all valid zip', docxResults.every((r) => r.isZip));

// ── 3. Parallel export-sgt (expensive LLM calls, real network dependency) ─
// One retry per job to absorb transient cloud-API blips (rate limits,
// momentary 5xx) — this test is about OUR concurrency handling, not the
// LLM provider's uptime.
const sgtTargets = uploaded.filter((u) => u.label === 'fireopal' || u.label === 'zhongtian');
async function exportSgtWithRetry(id: string) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(`${BASE}/documents/${id}/export-sgt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: 'ru' }),
    });
    if (res.status === 200) {
      const buf = Buffer.from(await res.arrayBuffer());
      return { status: res.status, isZip: buf.length > 50 && buf[0] === 0x50 && buf[1] === 0x4b };
    }
    if (attempt === 1) return { status: res.status, isZip: false };
  }
  return { status: 0, isZip: false };
}
const sgtJobs = sgtTargets.map((u) => exportSgtWithRetry(u.id as string).then((r) => ({ label: u.label, ...r })));
const sgtResults = await Promise.all(sgtJobs);
record(`${sgtResults.length} parallel export-sgt all 200 (retry absorbs transient API blips)`, sgtResults.every((r) => r.status === 200), JSON.stringify(sgtResults.map((r) => r.status)));
record('Parallel export-sgt all valid zip', sgtResults.every((r) => r.isZip));

// ── 4. Bulk-delete right after parallel load — consistency check ────────
const idsToDelete = uploaded.filter((u) => u.id).map((u) => u.id as string);
const bulkRes = await fetch(`${BASE}/documents/bulk-delete`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ids: idsToDelete }),
});
const bulkBody = await bulkRes.json();
record('Bulk-delete after load succeeds', bulkRes.status === 200 && bulkBody.count === idsToDelete.length, `count=${bulkBody.count}/${idsToDelete.length}`);

// Verify none of them are fetchable anymore.
const verifyGone = await Promise.all(idsToDelete.map((id) => fetch(`${BASE}/documents/${id}`).then((r) => r.status)));
record('All bulk-deleted documents are gone (404)', verifyGone.every((s) => s === 404), JSON.stringify(verifyGone));

const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} passed.`);

const report = [
  '# Load/Concurrency E2E Report',
  '',
  `${passed}/${results.length} passed`,
  '',
  ...results.map((r) => `- [${r.ok ? 'x' : ' '}] ${r.name}${r.detail ? ' — ' + r.detail : ''}`),
].join('\n');
writeFileSync('tool-results/e2e-load-report.md', report);
console.log('Report: tool-results/e2e-load-report.md');

if (passed !== results.length) process.exit(1);
