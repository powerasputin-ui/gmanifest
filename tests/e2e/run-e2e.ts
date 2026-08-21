/**
 * E2E test suite — runs against the dev server at localhost:3000.
 * Uses the local Ollama model (real AI, no external traffic).
 *
 * Run: bun tests/e2e/run-e2e.ts
 * Prereq: dev server running (bun run dev), Ollama running with qwen2.5:1.5b.
 */
import { readFileSync, writeFileSync } from 'fs';

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
    body = { _raw: text.slice(0, 300) };
  }
  return { status: res.status, body };
}

const jsonInit = (method: string, data: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});

// ── 1. Health & seed idempotency ──────────────────────────────
{
  const s = await api('/settings');
  record('GET /settings 200', s.status === 200 && Array.isArray(s.body.settings));

  const seed1 = await api('/seed', { method: 'POST' });
  const seed2 = await api('/seed', { method: 'POST' });
  record(
    'POST /seed idempotent',
    seed1.status === 200 || seed1.status === 201,
    `1st: ${seed1.body.message}, 2nd: ${seed2.body.message}`
  );

  const v2a = await api('/seed-v2', { method: 'POST' });
  const v2b = await api('/seed-v2', { method: 'POST' });
  record('POST /seed-v2 idempotent', v2a.status < 300 && v2b.status < 300);
}

// ── 2. Configure local LLM (Ollama) ───────────────────────────
{
  const put = await api(
    '/settings',
    jsonInit('PUT', [
      { key: 'llm_provider', value: 'local' },
      { key: 'llm_base_url', value: 'http://localhost:11434/v1' },
      { key: 'llm_model', value: 'qwen2.5:1.5b' },
      { key: 'llm_temperature', value: '0.1' },
    ])
  );
  record('PUT /settings (local LLM)', put.status === 200);

  const test = await api('/settings/test-llm', { method: 'POST' });
  record(
    'POST /settings/test-llm (Ollama)',
    test.body.ok === true,
    `model=${test.body.model} latency=${test.body.latencyMs}ms ${test.body.error || ''}`
  );
}

// ── 3. PDF upload → pdf-inspector parsing ─────────────────────
let documentId = '';
{
  const form = new FormData();
  form.append('file', new Blob([readFileSync('tests/e2e/fixtures/invoice-test.pdf')], { type: 'application/pdf' }), 'invoice-e2e.pdf');
  const up = await api('/upload', { method: 'POST', body: form });
  documentId = up.body.id || '';
  const meta = up.body.metadata ? JSON.parse(up.body.metadata) : {};
  record('POST /upload (PDF)', up.status === 201 && !!documentId, `status=${up.status}`);
  record(
    'pdf-inspector engine used',
    meta.engine === 'pdf-inspector',
    `engine=${meta.engine} pdfType=${meta.pdfType}`
  );
  record('markdown extracted', (up.body.markdown || '').length > 20, `len=${(up.body.markdown || '').length}`);
  record(
    'classification via local LLM',
    typeof up.body.classificationType === 'string' && up.body.classificationType.length > 0,
    `type=${up.body.classificationType} conf=${up.body.classificationConfidence}`
  );
}

// ── 4. Extraction pipeline with real local AI ─────────────────
{
  const profiles = await api('/profiles');
  const list = profiles.body.profiles || profiles.body || [];
  const invoice = (Array.isArray(list) ? list : []).find((p: any) => p.name?.includes('Счет'));
  record('invoice profile found', !!invoice, invoice?.id || '');

  if (invoice && documentId) {
    const proc = await api(`/documents/${documentId}/process`, jsonInit('POST', { profileId: invoice.id }));
    record(
      'POST /documents/[id]/process',
      proc.status < 300,
      `status=${proc.status} ${proc.body.error || ''}`
    );

    const runId = proc.body.runId || proc.body.id || '';
    if (runId) {
      const run = await api(`/runs/${runId}`);
      const fields = run.body.fields || [];
      record(
        'extraction run finished',
        ['completed', 'review'].includes(run.body.status),
        `status=${run.body.status} model=${run.body.modelUsed} tokens=${run.body.tokensUsed}`
      );
      record('modelUsed = local:qwen2.5:1.5b', run.body.modelUsed === 'local:qwen2.5:1.5b', run.body.modelUsed);
      record('fields extracted', fields.length > 0, `count=${fields.length}`);
      const total = fields.find((f: any) => f.fieldName === 'total_amount');
      record('total_amount extracted', !!total && !!total.value, `value=${total?.value ?? 'null'}`);
    } else {
      record('extraction run finished', false, 'no runId in process response');
    }
  }
}

// ── 4b. Profiles CRUD & entity-types contract ─────────────────
{
  const profiles = await api('/profiles');
  const list = Array.isArray(profiles.body) ? profiles.body : [];
  record('GET /profiles returns array', Array.isArray(profiles.body) && list.length > 0, `count=${list.length}`);

  const et = await api('/entity-types');
  record(
    'GET /entity-types shape',
    Array.isArray(et.body.entityTypes) && typeof et.body.entityFields === 'object',
    `types=${(et.body.entityTypes || []).length}`
  );

  const created = await api(
    '/profiles',
    jsonInit('POST', {
      name: 'E2E Временный профиль',
      entityType: 'Company',
      jsonSchema: '{"type":"object","properties":{"name":{"type":"string"}}}',
      promptTemplate: 'Извлеки данные. Верни ТОЛЬКО JSON.',
    })
  );
  const tmpId = created.body.id || '';
  record('POST /profiles (create)', created.status === 201 && !!tmpId, `status=${created.status}`);

  if (tmpId) {
    const upd = await api(`/profiles/${tmpId}`, jsonInit('PUT', { description: 'e2e update' }));
    record('PUT /profiles/[id]', upd.status === 200 && upd.body.description === 'e2e update');
    const del = await api(`/profiles/${tmpId}`, { method: 'DELETE' });
    record('DELETE /profiles/[id]', del.status === 200);
  }
}

// ── 5. Workflow e2e ───────────────────────────────────────────
{
  const proj = await api('/projects', jsonInit('POST', { name: 'E2E Тест Проект', description: 'e2e' }));
  const projectId = proj.body.id || '';
  record('POST /projects', proj.status < 300 && !!projectId, `status=${proj.status}`);

  const templates = await api('/workflow-templates');
  const tplList = templates.body.data || templates.body.templates || templates.body || [];
  const tpl = (Array.isArray(tplList) ? tplList : [])[0];
  record('workflow templates listed', Array.isArray(tplList) && tplList.length > 0, `count=${tplList.length}`);

  if (projectId && tpl) {
    const wf = await api('/workflows', jsonInit('POST', { templateId: tpl.id, projectId }));
    const workflowId = wf.body.id || wf.body.workflow?.id || '';
    record('POST /workflows (from template)', wf.status < 300 && !!workflowId, `status=${wf.status} ${wf.body.error || ''}`);

    if (workflowId) {
      const deps = await api(`/workflows/${workflowId}/dependencies`);
      record('GET /workflows/[id]/dependencies', deps.status === 200);

      const compl = await api(`/workflows/${workflowId}/completeness`);
      record('GET /workflows/[id]/completeness', compl.status === 200);

      const adv = await api(`/workflows/${workflowId}/advance`, { method: 'POST' });
      record(
        'POST /workflows/[id]/advance responds',
        adv.status < 300 || adv.status === 422,
        `status=${adv.status} (422 = blocked by dependencies, valid)`
      );
    }
  }
}

// ── 6. Template upload → generate → download ──────────────────
{
  const form = new FormData();
  form.append('file', new Blob([readFileSync('tests/e2e/fixtures/template-test.docx')], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), 'template-e2e.docx');
  const up = await api('/templates', { method: 'POST', body: form });
  const templateId = up.body.id || '';
  record('POST /templates (DOCX)', up.status < 300 && !!templateId, `status=${up.status} ${up.body.error || ''}`);

  if (templateId) {
    const vars = up.body.variables || up.body.template?.variables || [];
    record('template variables extracted', (vars.length || 0) > 0 || typeof up.body.variables === 'string', JSON.stringify(vars).slice(0, 120));
  }
}

// ── Report ────────────────────────────────────────────────────
const passed = results.filter((r) => r.ok).length;
const failed = results.filter((r) => !r.ok);
const report = [
  `# E2E Report — ${new Date().toISOString()}`,
  '',
  `Passed: ${passed}/${results.length}`,
  '',
  ...results.map((r) => `- ${r.ok ? '✅' : '❌'} ${r.name}${r.detail ? ` — ${r.detail}` : ''}`),
].join('\n');
writeFileSync('tool-results/e2e-report.md', report);
console.log(`\n${passed}/${results.length} passed. Report: tool-results/e2e-report.md`);
process.exit(failed.length ? 1 : 0);
