/**
 * E2E: document generation chain against localhost:3000.
 * project → entities → template → mappings → generate → download → verify DOCX content.
 *
 * Run: bun tests/e2e/run-generation-e2e.ts
 */
import { readFileSync, writeFileSync } from 'fs';
import JSZip from 'jszip';

const BASE = 'http://localhost:3000/api';
const results: Array<{ name: string; ok: boolean; detail: string }> = [];

function record(name: string, ok: boolean, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}

async function api(path: string, init?: RequestInit): Promise<{ status: number; body: any }> {
  const res = await fetch(`${BASE}${path}`, init);
  const text = await res.text();
  let body: any;
  try {
    body = JSON.parse(text);
  } catch {
    body = { _raw: text.slice(0, 200) };
  }
  return { status: res.status, body };
}

const jsonInit = (method: string, data: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});

// 1. Project
const proj = await api('/projects', jsonInit('POST', { name: 'E2E Генерация', description: 'gen e2e' }));
const projectId = proj.body.id || proj.body.data?.id || '';
record('create project', !!projectId, `status=${proj.status}`);

// 2. Entities in unified model
const entities = [
  { entityType: 'Company', instanceId: 'company_1', fieldName: 'name', value: 'ООО Ромашка' },
  { entityType: 'Company', instanceId: 'company_1', fieldName: 'inn', value: '7707083893' },
  { entityType: 'FinancialData', instanceId: 'fin_1', fieldName: 'amount', value: '12000.00' },
  { entityType: 'Contract', instanceId: 'contract_1', fieldName: 'startDate', value: '01.02.2026' },
];
let entitiesOk = true;
for (const e of entities) {
  const r = await api(`/projects/${projectId}/model`, jsonInit('POST', e));
  if (r.status >= 300) {
    entitiesOk = false;
    record(`upsert entity ${e.fieldName}`, false, `status=${r.status} ${JSON.stringify(r.body).slice(0, 120)}`);
  }
}
if (entitiesOk) record('upsert 4 entities', true);

// 3. Upload template
const form = new FormData();
form.append(
  'file',
  new Blob([readFileSync('tests/e2e/fixtures/template-test.docx')], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  }),
  'template-gen-e2e.docx'
);
const tpl = await api('/templates', { method: 'POST', body: form });
const templateId = tpl.body.id || '';
record('upload template', !!templateId, `status=${tpl.status}`);

// 4. Mappings
const mappings = [
  { templateVariable: '{{company_name}}', modelPath: 'Company.company_1.name' },
  { templateVariable: '{{company_inn}}', modelPath: 'Company.company_1.inn' },
  { templateVariable: '{{total_amount}}', modelPath: 'FinancialData.fin_1.amount' },
  { templateVariable: '{{date}}', modelPath: 'Contract.contract_1.startDate' },
];
let mappingsOk = true;
for (const m of mappings) {
  const r = await api(`/templates/${templateId}/mappings`, jsonInit('POST', m));
  if (r.status >= 300) {
    mappingsOk = false;
    record(`mapping ${m.templateVariable}`, false, `status=${r.status} ${JSON.stringify(r.body).slice(0, 120)}`);
  }
}
if (mappingsOk) record('create 4 mappings', true);

// 5. Generate
const gen = await api('/generate', jsonInit('POST', { projectId, templateId }));
const downloadUrl = gen.body.downloadUrl || '';
record('POST /generate', gen.status < 300 && !!downloadUrl, `status=${gen.status} ${gen.body.error || ''} errors=${JSON.stringify(gen.body.errors || [])}`);

// 6. Download and verify DOCX
if (downloadUrl) {
  const res = await fetch(`http://localhost:3000${downloadUrl}`);
  const buf = Buffer.from(await res.arrayBuffer());
  record('download generated DOCX', res.status === 200 && buf.length > 1000, `status=${res.status} bytes=${buf.length}`);
  record('DOCX magic (PK)', buf[0] === 0x50 && buf[1] === 0x4b);

  try {
    const zip = await JSZip.loadAsync(buf);
    const xml = await zip.file('word/document.xml')?.async('string');
    record(
      'placeholders filled',
      !!xml && xml.includes('ООО Ромашка') && xml.includes('7707083893') && !xml.includes('{{company_name}}'),
      xml ? (xml.includes('ООО Ромашка') ? 'values present' : 'values MISSING') : 'no document.xml'
    );
  } catch (e) {
    record('placeholders filled', false, e instanceof Error ? e.message : String(e));
  }
}

const passed = results.filter((r) => r.ok).length;
const failed = results.filter((r) => !r.ok);
const report = [
  `# Generation E2E Report — ${new Date().toISOString()}`,
  '',
  `Passed: ${passed}/${results.length}`,
  '',
  ...results.map((r) => `- ${r.ok ? '✅' : '❌'} ${r.name}${r.detail ? ` — ${r.detail}` : ''}`),
].join('\n');
writeFileSync('tool-results/e2e-generation-report.md', report);
console.log(`\n${passed}/${results.length} passed. Report: tool-results/e2e-generation-report.md`);
process.exit(failed.length ? 1 : 0);
