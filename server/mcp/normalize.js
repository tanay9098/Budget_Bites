// Turns raw MCP tool results into plain documents with provenance. Retrieved text is DATA:
// it is never interpreted as instructions anywhere in the app.

export class McpResponseError extends Error {}

/** Concatenate text blocks of a tool result; throws on tool errors / malformed shapes. */
export function toolText(result, toolName) {
  if (!result || typeof result !== 'object' || !Array.isArray(result.content)) throw new McpResponseError(`Malformed response from tool ${toolName}.`);
  const text = result.content.filter((c) => c && c.type === 'text' && typeof c.text === 'string').map((c) => c.text).join('\n').trim();
  if (result.isError) throw new McpResponseError(`Tool ${toolName} reported an error.`);
  if (!text) throw new McpResponseError(`Tool ${toolName} returned no content.`);
  return text;
}

const FM = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export function parseFrontmatter(text) {
  const m = FM.exec(text);
  if (!m) return { meta: {}, body: text };
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(':');
    if (i > 0) meta[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return { meta, body: text.slice(m[0].length) };
}

function httpUrl(u) {
  try { const p = new URL(u); return p.protocol === 'https:' || p.protocol === 'http:' ? p.href : null; } catch { return null; }
}

/** Markdown links in the entry body are the citations back to original sources. */
export function extractCitations(text) {
  const out = [], seen = new Set();
  for (const m of text.matchAll(/\[([^\]]{1,200})\]\((https?:\/\/[^)\s]+)\)/g)) {
    const url = httpUrl(m[2]);
    if (url && !seen.has(url)) { seen.add(url); out.push({ title: m[1], url }); }
  }
  return out;
}

/** Parse the outline from initial_context into [{kbId, path, title}]. Tolerant: JSON or markdown. */
export function parseOutline(text) {
  const entries = [];
  try {
    const walk = (node, kbId) => {
      if (Array.isArray(node)) return node.forEach((n) => walk(n, kbId));
      if (node && typeof node === 'object') {
        const id = typeof node.id === 'string' && /^kb/i.test(node.id) ? node.id : kbId;
        if (typeof node.path === 'string') entries.push({ kbId: id ?? null, path: node.path, title: node.title ?? node.name ?? null });
        Object.values(node).forEach((v) => walk(v, id));
      }
    };
    walk(JSON.parse(text), null);
    if (entries.length) return dedupe(entries);
  } catch { /* not JSON */ }
  let kb = null;
  for (const line of text.split(/\r?\n/)) {
    const k = /\b(kb[A-Za-z0-9_-]{4,})\b/.exec(line);
    if (k && !/`[^`]*\//.test(line)) kb = k[1];
    const p = /`([^`\s]+\.md|[^`\s]+\/[^`\s]*)`\s*(?:[-—–:]\s*(.+))?/.exec(line);
    if (p) entries.push({ kbId: kb, path: p[1], title: p[2]?.trim() ?? null });
  }
  return dedupe(entries);
}

const dedupe = (a) => [...new Map(a.map((e) => [`${e.kbId}::${e.path}`, e])).values()];

export function buildDocument({ kbId, path, outlineTitle }, text, now = new Date()) {
  const { meta, body } = parseFrontmatter(text);
  const heading = /^#\s+(.+)$/m.exec(body)?.[1];
  const citations = extractCitations(body);
  return {
    kbId: kbId ?? null, path,
    title: meta.title || heading || outlineTitle || path,
    url: httpUrl(meta.source_url || '') || citations[0]?.url || null,
    date: meta.as_of || meta.updated || meta.date || null,
    version: meta.version || null,
    citations, meta, content: body, fetchedAt: now.toISOString(),
  };
}
