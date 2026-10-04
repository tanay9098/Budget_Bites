// Provenance helpers. Evidence is only ever built from documents that were actually retrieved,
// and a quote only counts if it appears verbatim (whitespace/markdown-insensitive) in that document.

export const docKey = (d) => `${d.kbId ?? ''}::${d.path}`;

export function normText(s) {
  return String(s ?? '').replace(/[*_`>#]/g, '').replace(/ /g, ' ').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim().toLowerCase();
}

export function quoteInDoc(quote, doc) {
  const q = normText(quote);
  // Machine-readable data blocks are excluded: a quote must come from the human-readable text.
  const prose = String(doc.content ?? '').replace(/```budgetbites-data[\s\S]*?```/g, ' ');
  return q.length >= 8 && normText(prose).includes(q);
}

/** Public, display-safe source descriptor. Only fields the retrieval layer returned. */
export function sourceOf(doc) {
  return {
    key: docKey(doc), kbId: doc.kbId ?? null, path: doc.path, title: doc.title ?? null,
    url: doc.url ?? null, date: doc.date ?? null, version: doc.version ?? null, citations: doc.citations ?? [],
  };
}

/**
 * ref: { doc: "<kbId>::<path>" | "<path>", quote }. Returns verified evidence or null.
 * A model-supplied ref that doesn't match a retrieved doc/quote is dropped, never displayed.
 */
export function resolveEvidence(ref, docs) {
  if (!ref || typeof ref.quote !== 'string') return null;
  const want = String(ref.doc ?? '');
  const doc = docs.find((d) => docKey(d) === want) ?? docs.find((d) => d.path === want);
  if (!doc || !quoteInDoc(ref.quote, doc)) return null;
  return { source: sourceOf(doc), quote: ref.quote.trim(), verified: true };
}

/**
 * Agent-detected disagreement. Requires >=2 verified claims from DIFFERENT documents.
 * Labelled so the UI never implies Sanity itself flagged the conflict.
 */
export function formatConflict({ topic, whyItMatters, claims, resolution }, docs) {
  const verified = [];
  for (const c of claims ?? []) {
    const ev = resolveEvidence(c.evidence, docs);
    if (ev && typeof c.statement === 'string') verified.push({ statement: c.statement.trim(), evidence: ev });
  }
  const distinct = new Set(verified.map((c) => c.evidence.source.key));
  if (verified.length < 2 || distinct.size < 2) return null;
  const res = resolution ? { text: String(resolution.text ?? ''), evidence: resolveEvidence(resolution.evidence, docs) } : null;
  return {
    topic: String(topic ?? '').slice(0, 200), whyItMatters: String(whyItMatters ?? '').slice(0, 600), claims: verified,
    detectedBy: 'agent', // not a Sanity-provided contradiction flag
    resolved: Boolean(res?.evidence && res.text), resolution: res?.evidence && res.text ? res : null,
  };
}
