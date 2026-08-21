/**
 * E2E test suite for the single-document export features:
 *  - GET  /api/documents/[id]/export-docx  (markdown -> real Word document)
 *  - POST /api/documents/[id]/export-sgt   (LLM extraction -> filled СГТ Excel template)
 *
 * Run: bun tests/e2e/run-export-e2e.ts
 * Prereq: server running at localhost:3000, LLM provider configured in Settings
 * (works with local Ollama or a cloud API — export-sgt needs a working LLM call).
 */
import { writeFileSync, readFileSync } from 'fs';
import JSZip from 'jszip';

const BASE = 'http://localhost:3000/api';
const results: Array<{ name: string; ok: boolean; detail: string }> = [];

function record(name: string, ok: boolean, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}

async function uploadFixture(): Promise<{ id: string; markdown: string }> {
  const buf = readFileSync('tests/e2e/fixtures/invoice-test.pdf');
  const form = new FormData();
  form.append('file', new Blob([buf], { type: 'application/pdf' }), 'export-fixture.pdf');
  const res = await fetch(`${BASE}/upload`, { method: 'POST', body: form });
  const body = await res.json();
  return { id: body.id, markdown: body.markdown };
}

// ── 1. Setup: upload a fixture with real extractable text ──────────
const doc = await uploadFixture();
record('upload fixture for export tests', !!doc.id, `id=${doc.id}`);
record('fixture has markdown text', !!doc.markdown && doc.markdown.length > 10, `len=${doc.markdown?.length}`);

// ── 2. export-docx happy path ───────────────────────────────────────
{
  const res = await fetch(`${BASE}/documents/${doc.id}/export-docx`);
  const contentType = res.headers.get('content-type') || '';
  const disposition = res.headers.get('content-disposition') || '';
  const buf = Buffer.from(await res.arrayBuffer());
  record('GET export-docx 200', res.status === 200, `status=${res.status}`);
  record(
    'export-docx content-type is docx',
    contentType.includes('wordprocessingml.document'),
    contentType
  );
  record('export-docx has attachment filename', disposition.includes('.docx'), disposition);
  record('export-docx body is a real zip (PK header)', buf.length > 100 && buf[0] === 0x50 && buf[1] === 0x4b, `bytes=${buf.length}`);
  writeFileSync('tool-results/e2e-export-docx-sample.docx', buf);
}

// ── 3. export-docx on nonexistent document ──────────────────────────
{
  const res = await fetch(`${BASE}/documents/nonexistent-id-xyz/export-docx`);
  record('GET export-docx 404 for missing doc', res.status === 404, `status=${res.status}`);
}

// ── 4. export-sgt happy path (calls the configured LLM) ─────────────
{
  const res = await fetch(`${BASE}/documents/${doc.id}/export-sgt`, { method: 'POST' });
  const contentType = res.headers.get('content-type') || '';
  const disposition = res.headers.get('content-disposition') || '';
  record('POST export-sgt 200', res.status === 200, `status=${res.status}`);
  if (res.status === 200) {
    const buf = Buffer.from(await res.arrayBuffer());
    record(
      'export-sgt content-type is xlsx',
      contentType.includes('spreadsheetml.sheet'),
      contentType
    );
    record('export-sgt has attachment filename', disposition.includes('.xlsx'), disposition);
    record('export-sgt body is a real zip (PK header)', buf.length > 100 && buf[0] === 0x50 && buf[1] === 0x4b, `bytes=${buf.length}`);
    // Deterministic verification layer (IMO checksum, plausible ranges,
    // swapped-column detection) runs on every extraction — just check the
    // header is present and well-formed, not any specific warning count.
    const warningCountHeader = res.headers.get('x-sgt-warning-count');
    record('export-sgt reports a warning count header', warningCountHeader !== null && !Number.isNaN(Number(warningCountHeader)), `count=${warningCountHeader}`);
    writeFileSync('tool-results/e2e-export-sgt-sample.xlsx', buf);
  } else {
    const body = await res.text();
    record('export-sgt error body present (LLM likely unavailable)', body.length > 0, body.slice(0, 200));
  }
}

// ── 5. export-sgt on nonexistent document ───────────────────────────
{
  const res = await fetch(`${BASE}/documents/nonexistent-id-xyz/export-sgt`, { method: 'POST' });
  record('POST export-sgt 404 for missing doc', res.status === 404, `status=${res.status}`);
}

// ── 6. export-docx layout reconstruction for real scanned (OCR'd) PDFs ──
// A real scanned document with no text layer — PaddleOCR must run, and the
// export must reconstruct row/column structure from OCR bounding boxes
// (ocr_layout_to_docx.py), not just dump flat text. Slow (OCR + docx build).
{
  const buf = readFileSync('tests/e2e/fixtures/scanned-real-test.pdf');
  const form = new FormData();
  form.append('file', new Blob([buf], { type: 'application/pdf' }), 'scanned-real-test.pdf');
  const uploadRes = await fetch(`${BASE}/upload`, { method: 'POST', body: form });
  const uploaded = await uploadRes.json();
  record('scanned fixture upload succeeds', uploadRes.status === 201, `status=${uploadRes.status}`);
  record('scanned fixture markdown has real OCR text', !!uploaded.markdown && uploaded.markdown.length > 50, `len=${uploaded.markdown?.length}`);

  if (uploaded.id) {
    const res = await fetch(`${BASE}/documents/${uploaded.id}/export-docx`);
    const engineHeader = res.headers.get('x-docx-engine');
    const docxBuf = Buffer.from(await res.arrayBuffer());
    record('scanned export-docx 200 (not 500)', res.status === 200, `status=${res.status}`);
    record(
      'scanned export-docx engine is ocr-layout or markdown-fallback (never pdf2docx/photo)',
      engineHeader === 'ocr-layout' || engineHeader === 'markdown-fallback',
      `engine=${engineHeader}`
    );
    record('scanned export-docx body is a real zip (PK header)', docxBuf.length > 100 && docxBuf[0] === 0x50 && docxBuf[1] === 0x4b, `bytes=${docxBuf.length}`);
    writeFileSync('tool-results/e2e-export-docx-scanned-sample.docx', docxBuf);

    if (engineHeader === 'ocr-layout') {
      // Structural check: the row/column clustering actually produced a
      // table, not just flattened paragraphs — the whole point of Phase 10.
      const zip = await JSZip.loadAsync(docxBuf as unknown as Buffer);
      const xml = await zip.file('word/document.xml')!.async('string');
      record('scanned export-docx (ocr-layout) contains at least one <w:tbl> table', xml.includes('<w:tbl>'), `tbl count=${(xml.match(/<w:tbl>/g) || []).length}`);
    }
  }
}

// ── 7. Real table-structure recognition for dense tabular scans ─────────
// A real cargo manifest scan (whole page is one dense table, no free text).
// Layout detection must route this through TableRecognitionPipelineV2
// (real cell/row/column structure) instead of the geometric clustering —
// verified manually to produce garbled, unordered text without it. Slow
// (multiple heavy models: layout, table structure, cell detection, OCR).
{
  const buf = readFileSync('tests/e2e/fixtures/cargo-manifest-table-test.pdf');
  const form = new FormData();
  form.append('file', new Blob([buf], { type: 'application/pdf' }), 'cargo-manifest-table-test.pdf');
  const uploadRes = await fetch(`${BASE}/upload`, { method: 'POST', body: form });
  const uploaded = await uploadRes.json();
  record('table fixture upload succeeds', uploadRes.status === 201, `status=${uploadRes.status}`);
  const md = uploaded.markdown || '';
  record('table fixture markdown is a real markdown table (has header separator)', /\|\s*---\s*\|/.test(md), `len=${md.length}`);
  record('table fixture markdown contains known content (Ларга)', md.includes('Ларга'), '');

  if (uploaded.id) {
    const res = await fetch(`${BASE}/documents/${uploaded.id}/export-docx`);
    const engineHeader = res.headers.get('x-docx-engine');
    const docxBuf = Buffer.from(await res.arrayBuffer());
    record('table export-docx 200 (not 500)', res.status === 200, `status=${res.status}`);
    record('table export-docx engine is ocr-layout or markdown-fallback', engineHeader === 'ocr-layout' || engineHeader === 'markdown-fallback', `engine=${engineHeader}`);
    if (engineHeader === 'ocr-layout') {
      const zip = await JSZip.loadAsync(docxBuf as unknown as Buffer);
      const xml = await zip.file('word/document.xml')!.async('string');
      record('table export-docx contains a real table', xml.includes('<w:tbl>'), '');
    }
    writeFileSync('tool-results/e2e-export-docx-table-sample.docx', docxBuf);
  }
}

// ── Summary ──────────────────────────────────────────────────────────
const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} passed.`);

const report = [
  '# Export E2E Report',
  '',
  `${passed}/${results.length} passed`,
  '',
  ...results.map((r) => `- [${r.ok ? 'x' : ' '}] ${r.name}${r.detail ? ' — ' + r.detail : ''}`),
].join('\n');
writeFileSync('tool-results/e2e-export-report.md', report);
console.log('Report: tool-results/e2e-export-report.md');

if (passed !== results.length) process.exit(1);
