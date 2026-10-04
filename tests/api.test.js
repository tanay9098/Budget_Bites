import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/index.js';
import { loadConfig } from '../server/config.js';
import { parseRequest, ValidationError } from '../server/request.js';
import { baseRequest } from './helpers.js';

const boot = async (env = {}) => { const app = createApp(loadConfig({ BUDGETBITES_DEV_MOCK: '1', ...env })); await new Promise((r) => app.listen(0, '127.0.0.1', r)); return { base: `http://127.0.0.1:${app.address().port}`, close: () => new Promise((r) => { app.closeAllConnections?.(); app.close(r); }) }; };
const post = (b, body, raw) => fetch(`${b.base}/api/recipes`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: raw ?? JSON.stringify(body) });

test('request validation rejects bad input with field errors', () => {
  assert.throws(() => parseRequest({}), (e) => e instanceof ValidationError && 'diet' in e.fields && 'budget' in e.fields);
  assert.throws(() => parseRequest({ ...baseRequest, servings: 99 }), ValidationError);
  assert.throws(() => parseRequest({ ...baseRequest, equipment: ['rocket'] }), (e) => 'equipment' in e.fields);
  const ok = parseRequest({ ...baseRequest, ingredients: ['<script>x</script>'], exclusions: ['egg', 'bogus'] });
  assert.deepEqual(ok.exclusions, ['egg']); assert.ok(!/[<>]/.test(ok.ingredients[0]));
});
test('POST /api/recipes streams progress then a result (dev-mock mode)', async () => {
  const b = await boot();
  try {
    const res = await post(b, baseRequest);
    assert.equal(res.status, 200);
    const msgs = (await res.text()).trim().split('\n').map((l) => JSON.parse(l));
    assert.ok(msgs.some((m) => m.type === 'progress')); const last = msgs.at(-1);
    assert.equal(last.type, 'result'); assert.equal(last.result.mode, 'dev-mock'); assert.ok(last.result.recipes.length);
  } finally { await b.close(); }
});
test('oversized and malformed bodies are rejected', async () => {
  const b = await boot();
  try {
    assert.equal((await post(b, null, 'x'.repeat(20000))).status, 413);
    assert.equal((await post(b, null, '{nope')).status, 400);
    assert.equal((await post(b, { diet: 'veg' })).status, 422);
    assert.equal((await fetch(`${b.base}/api/recipes`)).status, 405);
  } finally { await b.close(); }
});
test('rate limiting kicks in', async () => {
  const b = await boot({ RATE_LIMIT_PER_MINUTE: '3' });
  try { const codes = []; for (let i = 0; i < 5; i++) codes.push((await post(b, { diet: 'veg' })).status); assert.ok(codes.includes(429)); } finally { await b.close(); }
});
test('live mode without credentials fails loudly and never falls back to the mock', async () => {
  const b = await boot({ BUDGETBITES_DEV_MOCK: '0' });
  try {
    const res = await post(b, baseRequest); const j = await res.json();
    assert.equal(res.status, 503); assert.equal(j.error.code, 'not_configured'); assert.match(j.error.message, /SANITY_CONTEXT_MCP_URL/);
    const h = await (await fetch(`${b.base}/api/health`)).json();
    assert.equal(h.mode, 'live'); assert.ok(!JSON.stringify(h).includes('token'.repeat(3)));
  } finally { await b.close(); }
});
test('static server blocks path traversal and sets security headers', async () => {
  const b = await boot();
  try {
    assert.equal((await fetch(`${b.base}/shared/../package.json`)).status, 404);
    assert.equal((await fetch(`${b.base}/%2e%2e/package.json`)).status, 404);
    const r = await fetch(`${b.base}/`); assert.match(r.headers.get('content-security-policy'), /default-src 'self'/);
    assert.equal((await fetch(`${b.base}/shared/cost.js`)).status, 200);
  } finally { await b.close(); }
});
test('model-provider failure surfaces as a safe error (no fabricated answer)', async () => {
  const { makeLlmExtractor, ModelError } = await import('../server/agent/extractors/llm.js');
  const ex = makeLlmExtractor({ apiKey: 'k', name: 'm', baseUrl: 'http://127.0.0.1:1', timeoutMs: 500 });
  await assert.rejects(ex.extract({ request: baseRequest, docs: [] }), (e) => e instanceof ModelError && !/127\.0\.0\.1/.test(e.message));
});
