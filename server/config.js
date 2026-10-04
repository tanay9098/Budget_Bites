// All configuration comes from environment variables. Nothing secret has defaults.
const int = (v, d) => (Number.isFinite(parseInt(v, 10)) ? parseInt(v, 10) : d);

export function loadConfig(env = process.env) {
  const devMock = env.BUDGETBITES_DEV_MOCK === '1';
  return {
    port: int(env.PORT, 3000),
    devMock,
    mcp: {
      url: env.SANITY_CONTEXT_MCP_URL || '',
      token: env.SANITY_ORG_API_TOKEN || '',
      kbId: env.SANITY_KNOWLEDGE_BASE_ID || '',
      timeoutMs: int(env.MCP_TIMEOUT_MS, 15000),
      maxDocs: Math.min(int(env.MCP_MAX_DOCS, 16), 20),
    },
    model: {
      apiKey: env.ANTHROPIC_API_KEY || '',
      name: env.ANTHROPIC_MODEL || 'claude-sonnet-4-5',
      baseUrl: env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com',
      timeoutMs: int(env.MODEL_TIMEOUT_MS, 60000),
    },
    rateLimit: { perMinute: int(env.RATE_LIMIT_PER_MINUTE, 12) },
    maxBodyBytes: 16 * 1024,
  };
}

/** What is configured, without exposing values. Used by /api/health and the README checklist. */
export function configStatus(cfg) {
  return {
    mode: cfg.devMock ? 'dev-mock' : 'live',
    mcpConfigured: cfg.devMock || Boolean(cfg.mcp.url && cfg.mcp.token),
    modelConfigured: cfg.devMock || Boolean(cfg.model.apiKey),
    missing: cfg.devMock ? [] : [
      !cfg.mcp.url && 'SANITY_CONTEXT_MCP_URL', !cfg.mcp.token && 'SANITY_ORG_API_TOKEN', !cfg.model.apiKey && 'ANTHROPIC_API_KEY',
    ].filter(Boolean),
  };
}

/** Server-side request guard: only https Sanity API hosts in live mode (never user-supplied). */
export function assertSafeMcpUrl(raw, { allowLocal = false } = {}) {
  let u;
  try { u = new URL(raw); } catch { throw new McpConfigError('SANITY_CONTEXT_MCP_URL is not a valid URL.'); }
  const local = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(u.hostname);
  if (allowLocal && local) return u;
  if (u.protocol !== 'https:' || !/(^|\.)sanity\.io$/.test(u.hostname)) throw new McpConfigError('SANITY_CONTEXT_MCP_URL must be an https://*.sanity.io endpoint.');
  return u;
}

export class McpConfigError extends Error {}
