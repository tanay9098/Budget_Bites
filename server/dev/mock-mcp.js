// DEVELOPMENT-ONLY mock of a Sanity Context MCP endpoint. It speaks real MCP over Streamable HTTP
// and serves the markdown files in knowledge-base/sources through the same two tools. It is NOT a
// Sanity Knowledge Base: nothing here is indexed or compiled by Sanity. Used only when
// BUDGETBITES_DEV_MOCK=1 and always labelled as such in the UI and API responses.
import http from 'node:http';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';

export const MOCK_KB_ID = 'kbDEVMOCK';
const DEFAULT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../knowledge-base/sources');

export async function loadDir(dir) {
  const files = (await readdir(dir)).filter((f) => f.endsWith('.md')).sort();
  return Promise.all(files.map(async (f) => ({ path: f, text: await readFile(path.join(dir, f), 'utf8') })));
}

function buildServer(entries) {
  const s = new McpServer({ name: 'budgetbites-dev-mock', version: '0.0.0' });
  const titleOf = (t) => /^title:\s*(.+)$/m.exec(t)?.[1] ?? '';
  s.registerTool('initial_context', { description: 'Outline of the (mock) Knowledge Base.', inputSchema: {} }, async () => ({
    content: [{ type: 'text', text: `## DEV MOCK Knowledge Base — local seed files, not Sanity\nKnowledge base id: ${MOCK_KB_ID}\n${entries.length} entries.\n\n${entries.map((e) => `${e.path}\n  ${titleOf(e.text)}`).join('\n\n')}` }],
  }));
  s.registerTool('knowledge_base_read', { description: 'Read entries by path.', inputSchema: { knowledgeBase: z.string(), paths: z.array(z.string()).min(1).max(20) } }, async ({ knowledgeBase, paths }) => {
    if (knowledgeBase !== MOCK_KB_ID) return { isError: true, content: [{ type: 'text', text: 'unknown knowledge base' }] };
    const hits = paths.map((p) => entries.find((e) => e.path === p)).filter(Boolean);
    if (!hits.length) return { isError: true, content: [{ type: 'text', text: 'not found' }] };
    return { content: hits.map((h) => ({ type: 'text', text: h.text })) };
  });
  return s;
}

/** Starts the mock on an ephemeral/local port. Stateless: one server+transport per request. */
export async function startMockMcp({ dir = DEFAULT_DIR, port = 0, entries } = {}) {
  const docs = entries ?? await loadDir(dir);
  const srv = http.createServer(async (req, res) => {
    if (req.method !== 'POST') { res.writeHead(405).end(); return; }
    const chunks = []; for await (const c of req) chunks.push(c);
    let body; try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { res.writeHead(400).end(); return; }
    const mcp = buildServer(docs);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.on('close', () => { transport.close(); mcp.close(); });
    await mcp.connect(transport);
    await transport.handleRequest(req, res, body);
  });
  await new Promise((r) => srv.listen(port, '127.0.0.1', r));
  return { url: `http://127.0.0.1:${srv.address().port}/mcp`, close: () => new Promise((r) => srv.close(r)) };
}
