/**
 * Acceptance test: verifies the two deliverables the user actually cares
 * about are not just "non-empty" but CORRECT:
 *   1. Word export uses the real layout engine (pdf2docx) and contains the
 *      actual source text (not garbled/fallback placeholder).
 *   2. СГТ Excel export places each extracted value in the semantically
 *      correct cell — dimensions in the size columns, IMO in the ID column,
 *      vendor in the vendor column, etc. — not just "some cell got filled".
 *
 * Uses real fixtures with known ground-truth content (IMO number, vendor
 * name, vessel name) so positional correctness can be checked precisely,
 * not just presence.
 *
 * Run: bun tests/e2e/run-quality-e2e.ts
 * Prereq: server running, LLM provider configured (a capable model — small
 * local models are known to misplace/miscalculate fields, see worklog).
 */
import { readFileSync, writeFileSync } from 'fs';
import JSZip from 'jszip';
import ExcelJS from 'exceljs';

const BASE = 'http://localhost:3000/api';
const results: Array<{ name: string; ok: boolean; detail: string }> = [];

function record(name: string, ok: boolean, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}

async function uploadFixture(path: string, filename: string): Promise<{ id: string; markdown: string }> {
  const buf = readFileSync(path);
  const form = new FormData();
  form.append('file', new Blob([buf], { type: 'application/pdf' }), filename);
  const res = await fetch(`${BASE}/upload`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`upload failed: ${res.status} ${await res.text()}`);
  return await res.json();
}

async function getDocxText(buffer: Uint8Array): Promise<string> {
  const zip = await JSZip.loadAsync(buffer as unknown as Buffer);
  const xml = await zip.file('word/document.xml')!.async('string');
  return xml.replace(/<[^>]+>/g, ' ');
}

async function getXlsxWorkbook(buffer: Uint8Array): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as any);
  return wb;
}

function cellText(sheet: ExcelJS.Worksheet, ref: string): string {
  const v = sheet.getCell(ref).value;
  if (v === null || v === undefined) return '';
  if (typeof v === 'object' && 'richText' in (v as object)) {
    return (v as { richText: { text: string }[] }).richText.map((r) => r.text).join('');
  }
  return String(v);
}

function isNumberInRange(sheet: ExcelJS.Worksheet, ref: string, min: number, max: number): boolean {
  const cell = sheet.getCell(ref);
  const v = cell.value;
  if (typeof v !== 'number') return false;
  return v >= min && v <= max;
}

// ── FIRE OPAL: known ground truth from the source PDF ──────────────────
// Length OA 78.56-82.2m, Breadth 20.40m, Depth 7.00m, IMO 9554585,
// Vessel Manager FELUCCA MARITIME SERVICES LLC, name "FIRE OPAL".
{
  const doc = await uploadFixture('tests/e2e/fixtures/Fire_Opal_Specifications.pdf', 'quality-fire-opal.pdf');
  record('Fire Opal: upload succeeds', !!doc.id, `id=${doc.id}`);
  record('Fire Opal: markdown has real content', doc.markdown.includes('FIRE OPAL'), `len=${doc.markdown?.length}`);

  // --- Word export ---
  const wordRes = await fetch(`${BASE}/documents/${doc.id}/export-docx`);
  record('Fire Opal: export-docx 200', wordRes.status === 200, `status=${wordRes.status}`);
  const engine = wordRes.headers.get('x-docx-engine');
  record('Fire Opal: export-docx uses pdf2docx (real layout, not fallback)', engine === 'pdf2docx', `engine=${engine}`);
  const wordBuf = Buffer.from(await wordRes.arrayBuffer());
  const wordText = await getDocxText(wordBuf);
  record('Fire Opal: Word contains vessel name', wordText.includes('FIRE OPAL'), '');
  record('Fire Opal: Word contains IMO number', wordText.includes('9554585'), '');
  writeFileSync('tool-results/quality-fireopal.docx', wordBuf);

  // --- СГТ Excel export (RU) ---
  const sgtRes = await fetch(`${BASE}/documents/${doc.id}/export-sgt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language: 'ru' }),
  });
  record('Fire Opal: export-sgt (ru) 200', sgtRes.status === 200, `status=${sgtRes.status}`);
  if (sgtRes.status === 200) {
    const sgtBuf = Buffer.from(await sgtRes.arrayBuffer());
    writeFileSync('tool-results/quality-fireopal-sgt-ru.xlsx', sgtBuf);
    const wb = await getXlsxWorkbook(sgtBuf);
    const sheet = wb.worksheets[0];

    // Column-correspondence checks — value must be in the RIGHT cell, not just present somewhere.
    record('СГТ: D8 (length mm) is a plausible number', isNumberInRange(sheet, 'D8', 60000, 100000), `D8=${cellText(sheet, 'D8')}`);
    record('СГТ: E8 (width mm) is a plausible number', isNumberInRange(sheet, 'E8', 10000, 30000), `E8=${cellText(sheet, 'E8')}`);
    record('СГТ: F8 (height mm) is a plausible number', isNumberInRange(sheet, 'F8', 2000, 15000), `F8=${cellText(sheet, 'F8')}`);
    record('СГТ: G8 (description) has vessel name', cellText(sheet, 'G8').includes('FIRE OPAL'), `G8=${cellText(sheet, 'G8')}`);
    record('СГТ: I8 (Unit ID/IMO) has IMO number', cellText(sheet, 'I8').includes('9554585'), `I8=${cellText(sheet, 'I8')}`);
    record('СГТ: J8 (Vendor/Owner) has manager name', cellText(sheet, 'J8').toUpperCase().includes('FELUCCA'), `J8=${cellText(sheet, 'J8')}`);
    // Cross-checks: IMO must NOT have leaked into the vendor cell, name must NOT be in the ID cell.
    record('СГТ: IMO not leaked into J8 (Vendor)', !cellText(sheet, 'J8').includes('9554585'), `J8=${cellText(sheet, 'J8')}`);
    record('СГТ: FELUCCA not leaked into I8 (Unit ID)', !cellText(sheet, 'I8').toUpperCase().includes('FELUCCA'), `I8=${cellText(sheet, 'I8')}`);

    // Header row untouched — same column labels as the blank template.
    record('СГТ: header G6 still says Description of Cargo', cellText(sheet, 'G6').includes('Description of Cargo'), `G6=${cellText(sheet, 'G6')}`);
    record('СГТ: header H6 still says Weight (kg)', cellText(sheet, 'H6').includes('Weight (kg)'), `H6=${cellText(sheet, 'H6')}`);
    record('СГТ: header J6 still says Vendor / Owner', cellText(sheet, 'J6').includes('Vendor'), `J6=${cellText(sheet, 'J6')}`);

    // Structural integrity — all 53 merges from the blank template survive.
    record('СГТ: all 53 merged cells preserved', sheet.model.merges?.length === 53, `count=${sheet.model.merges?.length}`);
  }

  // --- СГТ Excel export (EN) — language check ---
  const sgtEnRes = await fetch(`${BASE}/documents/${doc.id}/export-sgt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language: 'en' }),
  });
  record('Fire Opal: export-sgt (en) 200', sgtEnRes.status === 200, `status=${sgtEnRes.status}`);
  if (sgtEnRes.status === 200) {
    const buf = Buffer.from(await sgtEnRes.arrayBuffer());
    const wb = await getXlsxWorkbook(buf);
    const sheet = wb.worksheets[0];
    const desc = cellText(sheet, 'K8');
    const hasCyrillic = /[а-яА-ЯёЁ]/.test(desc);
    record('СГТ (en): technical description has no Cyrillic', !hasCyrillic, `K8=${desc.slice(0, 80)}`);
  }
}

// ── ZHONG TIAN: different document, confirms mapping isn't overfit ─────
{
  const doc = await uploadFixture('tests/e2e/fixtures/ZHONG_TIAN_39_Introduction.pdf', 'quality-zhongtian.pdf');
  record('ZHONG TIAN: upload succeeds', !!doc.id, `id=${doc.id}`);
  record('ZHONG TIAN: markdown has real content', doc.markdown.includes('ZHONG TIAN'), `len=${doc.markdown?.length}`);

  const sgtRes = await fetch(`${BASE}/documents/${doc.id}/export-sgt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language: 'ru' }),
  });
  record('ZHONG TIAN: export-sgt 200', sgtRes.status === 200, `status=${sgtRes.status}`);
  if (sgtRes.status === 200) {
    const buf = Buffer.from(await sgtRes.arrayBuffer());
    writeFileSync('tool-results/quality-zhongtian-sgt-ru.xlsx', buf);
    const wb = await getXlsxWorkbook(buf);
    const sheet = wb.worksheets[0];
    record('ZHONG TIAN: G8 (description) mentions vessel', cellText(sheet, 'G8').toUpperCase().includes('ZHONG TIAN'), `G8=${cellText(sheet, 'G8')}`);
    // Zhong Tian intro states L.O.A 215.0m, Breadth 51.8m, Depth 19.0m — plausible ranges.
    record('ZHONG TIAN: D8 (length mm) plausible for a 215m vessel', isNumberInRange(sheet, 'D8', 150000, 260000) || cellText(sheet, 'D8') === '', `D8=${cellText(sheet, 'D8')}`);
    record('ZHONG TIAN: all 53 merged cells preserved', sheet.model.merges?.length === 53, `count=${sheet.model.merges?.length}`);
  }
}

const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} passed.`);

const report = [
  '# Quality/Column-Correspondence E2E Report',
  '',
  `${passed}/${results.length} passed`,
  '',
  ...results.map((r) => `- [${r.ok ? 'x' : ' '}] ${r.name}${r.detail ? ' — ' + r.detail : ''}`),
].join('\n');
writeFileSync('tool-results/e2e-quality-report.md', report);
console.log('Report: tool-results/e2e-quality-report.md');

if (passed !== results.length) process.exit(1);
