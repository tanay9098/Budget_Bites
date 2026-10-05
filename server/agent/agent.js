// Evidence-driven recipe agent.
//   request -> MCP outline -> select entries -> read entries -> extract (model) -> verify quotes
//   -> (one targeted re-retrieval if evidence is thin) -> deterministic validation -> response
// Retrieved text is never treated as instructions; unverifiable claims are dropped, not shown.
import { buildPriceBook, normName } from '../../shared/cost.js';
import { validateRecipe } from '../../shared/validate.js';
import { substitutionOk, proteinSources, isPantry, classifyRecipe } from '../../shared/diet.js';
import { sourceOf, docKey } from '../../shared/evidence.js';
import { verifyExtraction, suspiciousDocs } from './verify.js';

const MAX_REREAD = 4;

export class InsufficientEvidenceError extends Error {}

async function readMany(mcp, entries, have) {
  const docs = [];
  for (const e of entries) {
    if (have.has(`${e.kbId}::${e.path}`)) continue;
    try { docs.push(await mcp.readEntry(e)); have.add(`${e.kbId}::${e.path}`); } catch (err) { if (err.kind === 'auth' || err.kind === 'timeout') throw err; /* skip a single unreadable entry */ }
  }
  return docs;
}

export async function runAgent({ request, mcp, extractor, config, mode = 'live', onProgress = () => {}, now = new Date() }) {
  const trace = [];
  const step = (id, text) => { trace.push({ id, text }); onProgress({ id, text }); };

  step('connect', 'Connected to the Sanity Context endpoint');
  const outline = await mcp.outline();
  let candidates = outline.entries.filter((e) => !config.kbId || e.kbId === config.kbId || e.kbId === null);
  if (!candidates.length) throw new InsufficientEvidenceError('The Knowledge Base outline contained no readable entries.');
  step('outline', `Read the outline: ${candidates.length} entries`);

  // Choose entries. Small KBs are read whole; larger ones are narrowed by the model, validated against the outline.
  // [core] entries (central to the Knowledge Base's purpose) are read first when we must truncate.
  const rank = (e) => ({ core: 0, peripheral: 2 }[e.tag] ?? 1);
  candidates = [...candidates].sort((a, b) => rank(a) - rank(b));
  let chosen = candidates;
  if (candidates.length > config.maxDocs && extractor.select) {
    const paths = await extractor.select({ request, outlineText: outline.raw });
    const known = new Set(candidates.map((c) => c.path));
    chosen = paths.filter((p) => known.has(p)).map((p) => candidates.find((c) => c.path === p));
    if (!chosen.length) chosen = candidates.slice(0, config.maxDocs);
  }
  chosen = chosen.slice(0, config.maxDocs);
  step('select', `Selected ${chosen.length} entries relevant to your constraints`);

  const have = new Set();
  let docs = await readMany(mcp, chosen, have);
  step('read', `Retrieved ${docs.length} entries with their sources`);
  if (!docs.length) throw new InsufficientEvidenceError('No Knowledge Base entries could be retrieved.');

  step('extract', 'Extracting recipes, prices and constraints from the evidence');
  let verified = verifyExtraction(await extractor.extract({ request, docs }), docs);

  // One bounded, targeted re-retrieval: look for price/ingredient entries we have not read yet.
  const missingPriceFor = () => {
    const book = buildPriceBook(verified.prices);
    return [...new Set(verified.recipes.flatMap((r) => r.ingredients).map((i) => i.name))].filter((n) => !book.has(normName(n)));
  };
  const thin = !verified.recipes.length || missingPriceFor().length;
  if (thin) {
    const missing = missingPriceFor();
    const unread = candidates.filter((c) => !have.has(`${c.kbId}::${c.path}`));
    const wanted = unread.filter((c) => /price|cost|recipe/i.test(`${c.path} ${c.title ?? ''}`) || missing.some((m) => normName(`${c.path} ${c.title ?? ''}`).includes(m))).slice(0, MAX_REREAD);
    if (wanted.length) {
      step('retry', `Evidence was incomplete, so one more targeted retrieval of ${wanted.length} entries`);
      const more = await readMany(mcp, wanted, have);
      if (more.length) { docs = docs.concat(more); verified = verifyExtraction(await extractor.extract({ request, docs }), docs); }
    }
  }

  step('verify', 'Verifying evidence quotes and checking diet, budget, equipment and time');
  const priceBook = buildPriceBook(verified.prices);
  const accepted = [], rejected = [];
  for (const r of verified.recipes) {
    const v = validateRecipe(r, request, priceBook, now);
    const mealFail = request.mealType && r.meals.length && !r.meals.includes(request.mealType) ? [{ code: 'meal', message: `Not listed as a ${request.mealType} recipe.` }] : [];
    const failures = [...v.failures, ...mealFail];
    if (failures.length) { rejected.push({ id: r.id, name: r.name, failures, source: r.evidence.source }); continue; }
    accepted.push(decorate(r, v, request, verified, priceBook));
  }
  rank(accepted, request);

  const used = new Map();
  const collect = (s) => s && used.set(s.key, s);
  for (const r of accepted) {
    collect(r.evidence.source);
    r.cost.lines.forEach((l) => collect(l.price?.evidence?.source));
    r.substitutions.forEach((s) => collect(s.evidence.source));
    r.safety.forEach((s) => collect(s.evidence.source));
  }
  const conflicts = verified.conflicts;
  conflicts.forEach((c) => c.claims.forEach((cl) => collect(cl.evidence.source)));

  const notes = [];
  if (suspiciousDocs(docs).length) notes.push('Some retrieved entries contained instruction-like text. It was treated as data and ignored.');
  const dropped = Object.values(verified.dropped).reduce((a, b) => a + b, 0);
  if (dropped) notes.push(`${dropped} extracted item(s) were discarded because they could not be matched to a verbatim quote in the retrieved sources.`);
  step('done', accepted.length ? `Found ${accepted.length} recipe${accepted.length > 1 ? 's' : ''} that fit` : 'No recipe satisfied every constraint');

  return {
    mode, recipes: accepted, rejected, conflicts, notes, trace,
    sources: [...used.values()],
    retrieved: docs.map(sourceOf),
    noMatch: accepted.length ? null : explainNoMatch(rejected, verified.recipes.length, request),
  };
}

function decorate(r, v, request, verified, priceBook) {
  const have = new Set((request.ingredients ?? []).map(normName));
  const ingredientStatus = r.ingredients.map((i) => {
    const owned = have.has(normName(i.name)) || (i.aliases ?? []).some((a) => have.has(normName(a)));
    return { name: i.name, status: owned ? 'kitchen' : isPantry(i.name) ? 'pantry' : 'buy' };
  });
  const names = new Set(r.ingredients.flatMap((i) => [normName(i.name), ...(i.aliases ?? []).map(normName)]));
  const subs = verified.substitutions.filter((s) => names.has(normName(s.ingredient))).map((s) => ({ ...s, check: substitutionOk(s, request) }));
  const fit = [];
  fit.push(`${classifyRecipe(r).diet === 'veg' ? 'Vegetarian' : 'Non-vegetarian'}${request.diet === 'veg' ? ', matches Veg mode' : ''}`);
  const usesOwned = ingredientStatus.filter((s) => s.status === 'kitchen').map((s) => s.name);
  if (usesOwned.length) fit.push(`Uses your ${usesOwned.join(', ')}`);
  if (v.budget.state === 'within' || v.budget.state === 'near') fit.push(`Estimated ₹${v.cost.perServing} per serving against your ₹${request.budget} budget${v.budget.uncertain ? ' (price data is uncertain)' : ''}`);
  const ps = proteinSources(r);
  if (ps.length) fit.push(`Protein sources: ${ps.join(', ')} (no nutrition figures are claimed)`);
  const equip = r.equipment.filter((e) => e !== 'stove');
  if (equip.length) fit.push(`Equipment you listed: ${equip.join(', ')}`);
  // Only safety notes that relate to this recipe's equipment.
  const safety = verified.safety.filter((s) => (r.equipment.includes('pressure cooker') && /cooker|vent|gasket/i.test(s.text)) || (/induction/i.test(s.text) && request.equipment.includes('induction cooktop')));
  return {
    ...r, classification: v.classification, cost: v.cost, budget: v.budget, warnings: v.warnings, ingredientStatus,
    substitutions: subs, safety, fit, proteinSources: ps, totalMinutes: r.prepMinutes + r.cookMinutes,
    priceBook: [...priceBook.values()].filter((p) => names.has(normName(p.ingredient)) || (p.aliases ?? []).some((a) => names.has(normName(a)))),
    supportingDocs: [r.evidence.source.key],
  };
}

function rank(list, request) {
  const have = new Set((request.ingredients ?? []).map(normName));
  const overlap = (r) => r.ingredients.filter((i) => have.has(normName(i.name))).length;
  const p = request.preferences ?? {};
  list.sort((a, b) =>
    (p.highProtein ? b.proteinSources.length - a.proteinSources.length : 0) ||
    overlap(b) - overlap(a) ||
    (p.fewIngredients ? a.ingredients.length - b.ingredients.length : 0) ||
    ((p.lowCost ? a.cost.perServing - b.cost.perServing : 0)) ||
    a.cost.perServing - b.cost.perServing);
}

function explainNoMatch(rejected, extracted, request) {
  if (!extracted) return { reason: 'no_evidence', message: 'The Knowledge Base did not contain a verifiable recipe for this request, so nothing is suggested rather than guessing.', relax: [] };
  const codes = new Map();
  for (const r of rejected) for (const f of r.failures) codes.set(f.code, (codes.get(f.code) ?? 0) + 1);
  const label = { budget: `raise the ₹${request.budget} budget`, time: 'allow more cooking time', equipment: 'add cooking equipment you have', diet: 'switch dietary mode', exclusion: 'remove an exclusion', meal: 'try a different meal type', quantities: 'n/a' };
  const relax = [...codes.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => label[c]).filter((x) => x && x !== 'n/a');
  return { reason: 'constraints', message: 'Recipes were found in the Knowledge Base, but none satisfies all of your constraints.', relax };
}
