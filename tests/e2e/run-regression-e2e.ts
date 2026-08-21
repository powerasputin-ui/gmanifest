/**
 * Regression tests for bugs found and fixed earlier today — pins them down
 * so they can't silently reappear.
 *
 * Run: bun tests/e2e/run-regression-e2e.ts
 * Prereq: server running.
 */
import { writeFileSync, readFileSync } from 'fs';

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
  try { body = JSON.parse(text); } catch { body = { _raw: text.slice(0, 300) }; }
  return { status: res.status, body };
}

const jsonInit = (method: string, data: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});

// ── Regression: deleting a project with an active workflow used to 500 ──
// (Workflow.projectId and DocumentGeneration.projectId had no onDelete:
// Cascade in the schema — fixed in src/app/api/projects/[id]/route.ts)
{
  const project = await api('/projects', jsonInit('POST', { name: 'Regression Test Project' }));
  record('create project for regression test', project.status === 201, `id=${project.body.id}`);
  const projectId = project.body.id;

  const templates = await api('/workflow-templates');
  const templateId = templates.body?.data?.[0]?.id || templates.body?.[0]?.id;
  record('workflow template available', !!templateId, `templateId=${templateId}`);

  if (projectId && templateId) {
    const workflow = await api('/workflows', jsonInit('POST', { templateId, projectId }));
    record('create + start workflow on project', workflow.status === 201, `status=${workflow.status}`);

    const del = await api(`/projects/${projectId}`, { method: 'DELETE' });
    record('delete project WITH active workflow returns 200 (not 500)', del.status === 200, `status=${del.status} body=${JSON.stringify(del.body).slice(0, 150)}`);

    const verify = await api(`/projects/${projectId}`);
    record('deleted project is actually gone', verify.status === 404, `status=${verify.status}`);
  }
}

// ── Regression: bulk-delete with a mix of valid + nonexistent ids ───────
{
  const project = await api('/projects', jsonInit('POST', { name: 'Bulk Delete Regression Project' }));
  const validId = project.body.id;
  const bulk = await api('/projects/bulk-delete', jsonInit('POST', { ids: [validId, 'does-not-exist-xyz'] }));
  record('bulk-delete with mixed valid/invalid ids does not error', bulk.status === 200, `status=${bulk.status} body=${JSON.stringify(bulk.body)}`);
  record('bulk-delete count reflects only the valid id', bulk.body?.count === 1, `count=${bulk.body?.count}`);
}

// ── Regression: bulk-delete documents with mixed valid + nonexistent ids ─
{
  const buf = readFileSync('tests/e2e/fixtures/invoice-test.pdf');
  const form = new FormData();
  form.append('file', new Blob([buf]), 'regression-doc.pdf');
  const upload = await fetch(`${BASE}/upload`, { method: 'POST', body: form }).then((r) => r.json()).catch(() => null);
  if (upload?.id) {
    const bulk = await api('/documents/bulk-delete', jsonInit('POST', { ids: [upload.id, 'does-not-exist-xyz'] }));
    record('bulk-delete documents with mixed valid/invalid ids does not error', bulk.status === 200, `status=${bulk.status}`);
    record('bulk-delete documents count reflects only the valid id', bulk.body?.count === 1, `count=${bulk.body?.count}`);
  } else {
    record('bulk-delete documents regression setup (upload)', false, 'could not upload malformed-but-accepted PDF');
  }
}

const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} passed.`);

const report = [
  '# Regression E2E Report',
  '',
  `${passed}/${results.length} passed`,
  '',
  ...results.map((r) => `- [${r.ok ? 'x' : ' '}] ${r.name}${r.detail ? ' — ' + r.detail : ''}`),
].join('\n');
writeFileSync('tool-results/e2e-regression-report.md', report);
console.log('Report: tool-results/e2e-regression-report.md');

if (passed !== results.length) process.exit(1);
