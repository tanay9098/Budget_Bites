// Calls POST /api/recipes and reads the NDJSON progress stream.
export class ApiError extends Error { constructor(error) { super(error.message); this.code = error.code; this.fields = error.fields; this.kind = error.kind; } }

export async function fetchHealth() {
  try { const r = await fetch('/api/health'); return r.ok ? await r.json() : null; } catch { return null; }
}

export async function buildRecipes(request, onProgress, signal) {
  let res;
  try {
    res = await fetch('/api/recipes', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(request), signal });
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    throw new ApiError({ code: 'network', message: 'Could not reach the BudgetBites server. Saved recipes and your shopping list still work.' });
  }
  const ctype = res.headers.get('content-type') ?? '';
  if (!ctype.includes('ndjson')) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.error ?? { code: 'http', message: `Unexpected response (${res.status}).` });
  }
  const reader = res.body.getReader(); const dec = new TextDecoder();
  let buf = '', result = null;
  const handle = (line) => {
    if (!line.trim()) return;
    let msg; try { msg = JSON.parse(line); } catch { return; }
    if (msg.type === 'progress') onProgress?.(msg);
    else if (msg.type === 'result') result = msg;
    else if (msg.type === 'error') throw new ApiError(msg.error);
  };
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split('\n'); buf = lines.pop();
    lines.forEach(handle);
  }
  handle(buf);
  if (!result) throw new ApiError({ code: 'incomplete', message: 'The response ended unexpectedly. Please try again.' });
  return result;
}
