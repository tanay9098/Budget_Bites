// BudgetBites backend: static files + POST /api/recipes (streams progress as NDJSON).
// Secrets stay here; the browser never receives tokens or the model key.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig, configStatus, McpConfigError } from './config.js';
import { parseRequest, ValidationError } from './request.js';
import { connectWithRetry, McpUnavailableError } from './mcp/client.js';
import { McpResponseError } from './mcp/normalize.js';
import { runAgent, InsufficientEvidenceError } from './agent/agent.js';
import { makeLlmExtractor, ModelError } from './agent/extractors/llm.js';
import { fixtureExtract } from './agent/extractors/fixture.js';
import { startMockMcp } from './dev/mock-mcp.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon' };
const CSP = "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'";

export function createApp(cfg = loadConfig(), deps = {}) {
  const hits = new Map();
  const limited = (ip) => {
    const now = Date.now(), win = (hits.get(ip) ?? []).filter((t) => now - t < 60000);
    win.push(now); hits.set(ip, win);
    if (hits.size > 5000) hits.clear();
    return win.length > cfg.rateLimit.perMinute;
  };
  let mock = null;
  const mcpOptions = async () => {
    if (cfg.devMock) { mock ??= await startMockMcp(); return { url: mock.url, token: '', timeoutMs: cfg.mcp.timeoutMs, allowLocal: true, kbId: 'kbDEVMOCK' }; }
    return { url: cfg.mcp.url, token: cfg.mcp.token, timeoutMs: cfg.mcp.timeoutMs, kbId: cfg.mcp.kbId };
  };
  const extractor = deps.extractor ?? (cfg.devMock ? { extract: fixtureExtract } : makeLlmExtractor(cfg.model));

  async function recipes(req, res) {
    const status = configStatus(cfg);
    if (status.missing.length) return json(res, 503, { error: { code: 'not_configured', message: `Server is not configured: missing ${status.missing.join(', ')}.` } });
    let request;
    try { request = parseRequest(await readJson(req, cfg.maxBodyBytes)); } catch (e) {
      if (e instanceof ValidationError) return json(res, 422, { error: { code: 'validation', fields: e.fields, message: 'Please fix the highlighted fields.' } });
      return json(res, e.status ?? 400, { error: { code: 'bad_request', message: e.status === 413 ? 'Request too large.' : 'Could not read the request.' } });
    }
    res.writeHead(200, { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
    const send = (o) => res.write(JSON.stringify(o) + '\n');
    let mcp;
    try {
      const opts = deps.mcpOptions ? await deps.mcpOptions() : await mcpOptions();
      mcp = await connectWithRetry(opts);
      const result = await runAgent({ request, mcp, extractor, config: { kbId: opts.kbId, maxDocs: cfg.mcp.maxDocs }, mode: cfg.devMock ? 'dev-mock' : 'live', onProgress: (p) => send({ type: 'progress', ...p }) });
      send({ type: 'result', request, result });
    } catch (e) { send({ type: 'error', error: toPublicError(e) }); }
    finally { await mcp?.close(); res.end(); }
  }

  const server = http.createServer(async (req, res) => {
    try {
      res.setHeader('content-security-policy', CSP); res.setHeader('x-content-type-options', 'nosniff'); res.setHeader('referrer-policy', 'no-referrer');
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname === '/api/health' && req.method === 'GET') return json(res, 200, configStatus(cfg));
      if (url.pathname === '/api/recipes') {
        if (req.method !== 'POST') return json(res, 405, { error: { code: 'method', message: 'Use POST.' } });
        if (limited(req.socket.remoteAddress ?? 'x')) return json(res, 429, { error: { code: 'rate_limited', message: 'Too many requests. Please wait a minute.' } });
        return await recipes(req, res);
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { error: { code: 'method', message: 'Not allowed.' } });
      return await serveStatic(url.pathname, res);
    } catch { if (!res.headersSent) json(res, 500, { error: { code: 'internal', message: 'Something went wrong.' } }); else res.end(); }
  });
  server.on('close', () => mock?.close());
  return server;
}

export function toPublicError(e) {
  if (e instanceof McpConfigError) return { code: 'not_configured', message: e.message };
  if (e instanceof McpUnavailableError) return { code: 'mcp_unavailable', kind: e.kind, message: e.message };
  if (e instanceof McpResponseError) return { code: 'mcp_bad_response', message: 'The Knowledge Base returned an unexpected response.' };
  if (e instanceof InsufficientEvidenceError) return { code: 'insufficient_evidence', message: e.message };
  if (e instanceof ModelError) return { code: 'model_unavailable', message: e.message };
  return { code: 'internal', message: 'Something went wrong while building your recipes.' };
}

const json = (res, code, body) => { res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(JSON.stringify(body)); };

async function readJson(req, max) {
  let size = 0; const chunks = [];
  for await (const c of req) { size += c.length; if (size > max) { const e = new Error('too large'); e.status = 413; throw e; } chunks.push(c); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { const e = new Error('bad json'); e.status = 400; throw e; }
}

async function serveStatic(pathname, res) {
  const rel = decodeURIComponent(pathname === '/' ? '/index.html' : pathname);
  const base = rel.startsWith('/shared/') ? ROOT : path.join(ROOT, 'public');
  const file = path.normalize(path.join(base, rel));
  if (!file.startsWith(base + path.sep) || (base === ROOT && !file.startsWith(path.join(ROOT, 'shared') + path.sep))) return json(res, 404, { error: { code: 'not_found', message: 'Not found.' } });
  try {
    if (!(await stat(file)).isFile()) throw new Error();
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-cache' });
    res.end(await readFile(file));
  } catch { json(res, 404, { error: { code: 'not_found', message: 'Not found.' } }); }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const cfg = loadConfig();
  createApp(cfg).listen(cfg.port, () => {
    const s = configStatus(cfg);
    console.log(`BudgetBites on http://localhost:${cfg.port}  [mode: ${s.mode}]`);
    if (cfg.devMock) console.log('DEV MOCK MODE: local seed files via a mock MCP server. This is NOT a Sanity Knowledge Base.');
    else if (s.missing.length) console.log(`Not configured - missing: ${s.missing.join(', ')} (see .env.example)`);
  });
}
