// DEV-MOCK ONLY extractor. Instead of an LLM it reads the machine-readable `budgetbites-data`
// block embedded in each seed document. Output has the exact shape the LLM extractor produces and
// goes through the same evidence verification and deterministic validation.
const BLOCK = /```budgetbites-data\s*([\s\S]*?)```/g;

export function parseBlocks(doc) {
  const out = [];
  for (const m of doc.content.matchAll(BLOCK)) { try { out.push(JSON.parse(m[1])); } catch { /* ignore malformed block */ } }
  return out;
}

export async function fixtureExtract({ docs }) {
  const recipes = [], prices = [], substitutions = [], safety = [], disagreements = [];
  const claimsByTopic = new Map();
  for (const doc of docs) {
    const ref = (q) => ({ doc: `${doc.kbId}::${doc.path}`, quote: q });
    for (const b of parseBlocks(doc)) {
      if (b.type === 'recipe') { const { evidenceQuote, ...r } = b.recipe; recipes.push({ ...r, evidence: ref(evidenceQuote) }); }
      if (b.type === 'prices') for (const p of b.prices) { const { evidenceQuote, ...rest } = p; prices.push({ ...rest, evidence: ref(evidenceQuote) }); }
      if (b.type === 'substitutions') for (const s of b.substitutions) { const { evidenceQuote, ...rest } = s; substitutions.push({ ...rest, evidence: ref(evidenceQuote) }); }
      if (b.type === 'technique') for (const s of b.safety ?? []) safety.push({ text: s.text, evidence: ref(s.evidenceQuote) });
      if (b.type === 'claims') for (const c of b.claims) { const l = claimsByTopic.get(c.topic) ?? []; l.push({ statement: c.statement, stance: c.stance, evidence: ref(c.evidenceQuote), whyItMatters: c.whyItMatters }); claimsByTopic.set(c.topic, l); }
    }
  }
  // Agent-side comparison: same topic, different stance, different documents => disagreement.
  for (const [topic, claims] of claimsByTopic) if (new Set(claims.map((c) => c.stance)).size > 1) disagreements.push({ topic, whyItMatters: claims[0].whyItMatters, claims });
  return { recipes, prices, substitutions, safety, disagreements };
}
