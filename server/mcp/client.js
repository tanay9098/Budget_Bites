// Server-side Sanity Context MCP client. Uses the official MCP SDK over Streamable HTTP with an
// organization bearer token. Documented Knowledge Base tools: initial_context, knowledge_base_read.
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { assertSafeMcpUrl } from '../config.js';
import { toolText, parseOutline, buildDocument, McpResponseError } from './normalize.js';

/** Pin the request to one Knowledge Base via the documented URL parameters (mode, knowledgeBases). */
export function applyKnowledgeBase(url, kbId) {
  if (!/^kb[A-Za-z0-9_-]+$/.test(kbId)) throw new McpUnavailableError('SANITY_KNOWLEDGE_BASE_ID is not a valid Knowledge Base id (it starts with "kb").', 'config');
  if (!url.searchParams.has('knowledgeBases')) { url.searchParams.set('mode', 'knowledge_base'); url.searchParams.set('knowledgeBases', kbId); }
  return url;
}

export class McpUnavailableError extends Error {
  constructor(message, kind = 'connection') { super(message); this.kind = kind; }
}

const withTimeout = (p, ms, label) => {
  let t;
  return Promise.race([p, new Promise((_, rej) => { t = setTimeout(() => rej(new McpUnavailableError(`${label} timed out.`, 'timeout')), ms); })]).finally(() => clearTimeout(t));
};

export class SanityContextClient {
  constructor({ url, token, timeoutMs = 15000, allowLocal = false, kbId = '' }) {
    this.url = assertSafeMcpUrl(url, { allowLocal });
    if (kbId) applyKnowledgeBase(this.url, kbId);
    this.token = token;
    this.timeoutMs = timeoutMs;
    this.client = null;
    this.tools = [];
  }

  async connect() {
    this.client = new Client({ name: 'budgetbites', version: '0.1.0' }, { capabilities: {} });
    const headers = this.token ? { Authorization: `Bearer ${this.token}` } : {};
    const transport = new StreamableHTTPClientTransport(this.url, { requestInit: { headers } });
    try {
      await withTimeout(this.client.connect(transport), this.timeoutMs, 'MCP connection');
      this.tools = (await withTimeout(this.client.listTools(), this.timeoutMs, 'MCP tool discovery')).tools ?? [];
    } catch (err) {
      await this.close();
      throw this.#safe(err);
    }
    return this;
  }

  hasTool(name) { return this.tools.some((t) => t.name === name); }

  async #call(name, args) {
    if (!this.hasTool(name)) throw new McpUnavailableError(`The endpoint does not expose the "${name}" tool.`, 'tool_missing');
    try {
      const res = await withTimeout(this.client.callTool({ name, arguments: args }, undefined, { timeout: this.timeoutMs }), this.timeoutMs + 500, `Tool ${name}`);
      return toolText(res, name);
    } catch (err) { throw this.#safe(err); }
  }

  /** Outline of every Knowledge Base the endpoint serves. */
  async outline() {
    const raw = await this.#call('initial_context', {});
    return { raw, entries: parseOutline(raw) };
  }

  /** Read one entry (one path per call so content can never be attributed to the wrong path). */
  async readEntry({ kbId, path, title }) {
    const raw = await this.#call('knowledge_base_read', this.#readArgs(kbId, path));
    return buildDocument({ kbId, path, outlineTitle: title }, raw);
  }

  // Documented arguments: { knowledgeBase: "kb...", paths: [...] }. If the endpoint advertises a
  // different shape in its input schema we follow that instead.
  #readArgs(kbId, path) {
    const props = this.tools.find((t) => t.name === 'knowledge_base_read')?.inputSchema?.properties ?? {};
    const keys = Object.keys(props);
    const idKey = keys.find((k) => /^(kb|knowledge)/i.test(k)) ?? 'knowledgeBase';
    const pathKey = keys.find((k) => /path/i.test(k)) ?? 'paths';
    return { [idKey]: kbId, [pathKey]: props[pathKey]?.type === 'string' ? path : [path] };
  }

  async close() {
    const c = this.client; this.client = null;
    try { await c?.close(); } catch { /* best effort cleanup */ }
  }

  // Never leak tokens, URLs with credentials, or stack traces.
  #safe(err) {
    if (err instanceof McpUnavailableError || err instanceof McpResponseError) return err;
    const msg = String(err?.message ?? err);
    if (/\b(401|403|forbidden|unauthori[sz]ed|contextGrantRequired)\b/i.test(msg)) return new McpUnavailableError('Sanity rejected the credentials (an organization token with Context Viewer access is required).', 'auth');
    if (/timed? ?out/i.test(msg)) return new McpUnavailableError('The Sanity Context endpoint timed out.', 'timeout');
    return new McpUnavailableError('Could not reach the Sanity Context endpoint.', 'connection');
  }
}

/** Bounded retry for transient failures only (never auth/config errors). */
export async function connectWithRetry(opts, attempts = 2) {
  let last;
  for (let i = 0; i < attempts; i++) {
    const c = new SanityContextClient(opts);
    try { return await c.connect(); } catch (e) { last = e; if (e.kind === 'auth' || e.kind === 'tool_missing') break; await new Promise((r) => setTimeout(r, 300 * (i + 1))); }
  }
  throw last;
}
