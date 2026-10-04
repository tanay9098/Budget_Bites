// Live integration check against the REAL configured Sanity Context endpoint. Prints no secrets.
// Usage: SANITY_CONTEXT_MCP_URL=... SANITY_ORG_API_TOKEN=... node scripts/live-check.js
import { loadConfig } from '../server/config.js';
import { SanityContextClient } from '../server/mcp/client.js';

const cfg = loadConfig();
if (!cfg.mcp.url || !cfg.mcp.token) { console.error('Missing SANITY_CONTEXT_MCP_URL or SANITY_ORG_API_TOKEN. Nothing was tested.'); process.exit(2); }
const c = new SanityContextClient({ url: cfg.mcp.url, token: cfg.mcp.token, timeoutMs: cfg.mcp.timeoutMs });
try {
  await c.connect();
  console.log('OK connected. Tools:', c.tools.map((t) => t.name).join(', '));
  for (const t of c.tools) console.log(` - ${t.name} input keys: ${Object.keys(t.inputSchema?.properties ?? {}).join(', ') || '(none)'}`);
  const o = await c.outline();
  console.log(`OK initial_context: ${o.entries.length} parsed entries (raw outline ${o.raw.length} chars)`);
  if (!o.entries.length) console.log('WARN: outline format was not recognised by parseOutline; see server/mcp/normalize.js');
  const first = o.entries[0];
  if (first) { const d = await c.readEntry(first); console.log(`OK knowledge_base_read: "${d.title}" (${d.content.length} chars, ${d.citations.length} citations, url: ${d.url ?? 'none'})`); }
} catch (e) { console.error('FAILED:', e.message); process.exitCode = 1; } finally { await c.close(); }
