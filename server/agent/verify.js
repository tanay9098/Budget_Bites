// Turns raw extractor output into verified, evidence-backed facts. Nothing unverified survives.
import { resolveEvidence, formatConflict } from '../../shared/evidence.js';

const INJECTION = /(ignore (all |any )?(previous|prior|above) (instructions|rules)|disregard (the )?(system|previous)|you are now|reveal (your|the) (system )?prompt|api[_ -]?key|<\/?system>)/i;

/** Flag documents containing instruction-like text. They are still treated purely as data. */
export function suspiciousDocs(docs) {
  return docs.filter((d) => INJECTION.test(d.content)).map((d) => `${d.kbId}::${d.path}`);
}

const num = (n) => typeof n === 'number' && Number.isFinite(n);
const str = (s, max = 300) => (typeof s === 'string' ? s.trim().slice(0, max) : '');

export function verifyExtraction(raw, docs) {
  const dropped = { recipes: 0, prices: 0, substitutions: 0, safety: 0, disagreements: 0 };
  const recipes = [];
  for (const r of raw.recipes ?? []) {
    const evidence = resolveEvidence(r.evidence, docs);
    const ingredients = (Array.isArray(r.ingredients) ? r.ingredients : []).filter((i) => i && str(i.name) && num(i.qty) && str(i.unit, 20)).map((i) => ({
      name: str(i.name, 80).toLowerCase(), qty: i.qty, unit: str(i.unit, 20), category: str(i.category, 10) || 'unknown', optional: Boolean(i.optional),
      aliases: (i.aliases ?? []).map((a) => str(a, 80)).filter(Boolean), allergens: (i.allergens ?? []).map((a) => str(a, 40)).filter(Boolean),
    }));
    if (!evidence || !str(r.name) || !ingredients.length) { dropped.recipes++; continue; }
    recipes.push({
      id: str(r.id, 80), name: str(r.name, 120), cuisine: str(r.cuisine, 60) || null, meals: (r.meals ?? []).map((m) => str(m, 20).toLowerCase()),
      prepMinutes: num(r.prepMinutes) ? r.prepMinutes : 0, cookMinutes: num(r.cookMinutes) ? r.cookMinutes : 0, servingsBase: r.servingsBase,
      equipment: (r.equipment ?? []).map((e) => str(e, 60).toLowerCase()), protein: r.protein === true,
      ingredients, steps: (r.steps ?? []).map((s) => str(s, 400)).filter(Boolean), evidence,
    });
  }
  const prices = [];
  for (const p of raw.prices ?? []) {
    const evidence = resolveEvidence(p.evidence, docs);
    if (!evidence || !str(p.ingredient) || !num(p.packagePrice) || !num(p.packageQty) || p.packageQty <= 0 || !str(p.unit, 20)) { dropped.prices++; continue; }
    prices.push({ ingredient: str(p.ingredient, 80).toLowerCase(), aliases: (p.aliases ?? []).map((a) => str(a, 80)), packagePrice: p.packagePrice, packageQty: p.packageQty, unit: str(p.unit, 20), region: str(p.region, 80) || null, asOf: str(p.asOf, 30) || evidence.source.date || null, placeholder: p.placeholder === true, evidence });
  }
  const substitutions = [];
  for (const s of raw.substitutions ?? []) {
    const evidence = resolveEvidence(s.evidence, docs);
    if (!evidence || !str(s.ingredient) || !str(s.substitute)) { dropped.substitutions++; continue; }
    substitutions.push({ ingredient: str(s.ingredient, 80).toLowerCase(), substitute: str(s.substitute, 80).toLowerCase(), substituteCategory: str(s.substituteCategory, 10) || 'unknown', allergens: (s.allergens ?? []).map((a) => str(a, 40)), note: str(s.note, 300), evidence });
  }
  const safety = [];
  for (const s of raw.safety ?? []) {
    const evidence = resolveEvidence(s.evidence, docs);
    if (!evidence || !str(s.text)) { dropped.safety++; continue; }
    safety.push({ text: str(s.text, 300), evidence });
  }
  const conflicts = [];
  for (const d of raw.disagreements ?? []) {
    const c = formatConflict(d, docs);
    if (c) conflicts.push(c); else dropped.disagreements++;
  }
  return { recipes, prices, substitutions, safety, conflicts, dropped };
}
