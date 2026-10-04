// Recipe validation: runs on the server before anything is shown, and is re-usable in the browser.
import { classifyRecipe, exclusionHits } from './diet.js';
import { recipeCost, budgetStatus, buildPriceBook, normName } from './cost.js';

const STOVE = ['gas stove', 'induction cooktop'];
// Basic cookware assumed in every kitchen; not asked about in the builder.
const ASSUMED = ['pan', 'flat pan', 'tawa', 'kadhai', 'pot', 'bowl', 'knife', 'spoon', 'pressure pan'];

export function equipmentProblems(recipe, owned = []) {
  const have = new Set(owned.map(normName));
  const missing = [];
  for (const need of recipe.equipment ?? []) {
    const n = normName(need);
    if (ASSUMED.includes(n)) continue;
    if (n === 'stove' || n === 'stovetop') { if (!STOVE.some((s) => have.has(s))) missing.push('a gas stove or induction cooktop'); continue; }
    if (n === 'pressure cooker' && !have.has('pressure cooker')) { missing.push('pressure cooker'); continue; }
    if (n !== 'pressure cooker' && !have.has(n)) missing.push(need);
  }
  if ((recipe.equipment ?? []).map(normName).includes('pressure cooker') && !STOVE.some((s) => have.has(s))) missing.push('a gas stove or induction cooktop (pressure cookers need a heat source)');
  return [...new Set(missing)];
}

export function validateRecipe(recipe, request, priceBook, now = new Date()) {
  const failures = [], warnings = [];
  const cls = classifyRecipe(recipe);

  if (request.diet === 'veg' && cls.diet === 'nonveg') failures.push({ code: 'diet', message: `Contains ${cls.nonVegCategories.join(', ')}, which is not vegetarian.` });
  for (const h of exclusionHits(recipe.ingredients ?? [], request.exclusions)) failures.push({ code: 'exclusion', message: `Contains ${h.ingredient}, which matches your exclusion "${h.exclusion}".` });
  if (cls.unknown.length) warnings.push({ code: 'unclassified', message: `Dietary status not confirmed for: ${cls.unknown.join(', ')}. Check labels.` });

  const missingEq = equipmentProblems(recipe, request.equipment);
  if (missingEq.length) failures.push({ code: 'equipment', message: `Needs ${missingEq.join(', ')}.` });

  const total = Number(recipe.prepMinutes ?? 0) + Number(recipe.cookMinutes ?? 0);
  if (request.maxMinutes && total > request.maxMinutes) failures.push({ code: 'time', message: `Takes ${total} min; your limit is ${request.maxMinutes} min.` });

  const bad = (recipe.ingredients ?? []).filter((i) => !(typeof i.qty === 'number' && i.qty > 0) || !i.unit);
  if (!(recipe.servingsBase > 0) || !(recipe.ingredients ?? []).length || bad.length) failures.push({ code: 'quantities', message: 'Ingredient quantities or serving size are inconsistent.' });

  let cost = null, budget = { state: 'unknown' };
  if (!failures.some((f) => f.code === 'quantities')) {
    cost = recipeCost(recipe, request.servings, priceBook, now);
    budget = budgetStatus(cost, request.budget);
    if (budget.state === 'over') failures.push({ code: 'budget', message: `Estimated ₹${cost.perServing}${cost.complete ? '' : '+'} per serving is over your ₹${request.budget} budget.` });
    if (budget.state === 'unknown') warnings.push({ code: 'budget_unknown', message: 'No complete price data, so the budget could not be confirmed.' });
    if (budget.uncertain) warnings.push({ code: 'price_uncertain', message: 'Price data is old or undated; treat the cost as an estimate, not a promise.' });
  }
  return { ok: failures.length === 0, failures, warnings, classification: cls, cost, budget, priceBookSize: priceBook instanceof Map ? priceBook.size : 0 };
}

export { buildPriceBook };
