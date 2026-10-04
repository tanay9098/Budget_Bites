// Deterministic cost maths. The LLM never does arithmetic: it only extracts quantities and
// price facts (each tied to a verified evidence quote); everything below is plain code.
import { toBase, round } from './units.js';

export const STALE_DAYS = 180;

export function normName(s) {
  return String(s ?? '').toLowerCase().replace(/[^a-z0-9ऀ-ॿ ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Index price facts by normalised ingredient name (and aliases). First fact wins. */
export function buildPriceBook(prices = []) {
  const book = new Map();
  for (const p of prices) {
    for (const key of [p.ingredient, ...(p.aliases ?? [])]) {
      const k = normName(key);
      if (k && !book.has(k)) book.set(k, p);
    }
  }
  return book;
}

/** cost = package price x quantity used / package quantity (same dimension only). */
export function ingredientCost(ing, price) {
  if (!price) return { status: 'missing_price', cost: null };
  const used = toBase(ing.qty, ing.unit);
  const pack = toBase(price.packageQty, price.unit);
  if (!used || !pack || pack.value <= 0 || !(price.packagePrice >= 0)) return { status: 'invalid_data', cost: null };
  if (used.dimension !== pack.dimension) return { status: 'incompatible_units', cost: null };
  return {
    status: 'ok',
    cost: round((price.packagePrice * used.value) / pack.value, 2),
    packagesToBuy: Math.max(1, Math.ceil(used.value / pack.value - 1e-9)),
    purchaseCost: round(price.packagePrice * Math.max(1, Math.ceil(used.value / pack.value - 1e-9)), 2),
  };
}

export function daysOld(asOf, now = new Date()) {
  const t = Date.parse(asOf);
  if (Number.isNaN(t)) return null;
  return Math.floor((now.getTime() - t) / 86400000);
}

export function priceFreshness(price, now = new Date()) {
  if (price?.placeholder) return 'placeholder';
  const age = price?.asOf ? daysOld(price.asOf, now) : null;
  if (age === null) return 'undated';
  return age > STALE_DAYS ? 'stale' : 'fresh';
}

/**
 * Whole-recipe cost for `servings`. Returns consumed cost, complete flag, per-line breakdown and
 * the confidence caveats (missing / stale / undated / region).
 */
export function recipeCost(recipe, servings, priceBook, now = new Date()) {
  const scale = servings / (recipe.servingsBase || 1);
  const lines = [];
  let total = 0, purchase = 0, complete = true, purchaseComplete = true;
  const caveats = new Set();
  for (const ing of recipe.ingredients ?? []) {
    const qty = round(ing.qty * scale, 3);
    const price = priceBook.get(normName(ing.name)) ?? (ing.aliases ?? []).map((a) => priceBook.get(normName(a))).find(Boolean);
    const c = ingredientCost({ qty, unit: ing.unit }, price);
    const freshness = price ? priceFreshness(price, now) : null;
    if (c.status !== 'ok') {
      if (!ing.optional) { complete = false; purchaseComplete = false; }
      caveats.add(c.status === 'missing_price' ? 'missing_price' : c.status);
    } else {
      if (!ing.optional) { total += c.cost; purchase += c.purchaseCost; }
      if (freshness !== 'fresh') caveats.add(freshness === 'stale' ? 'stale_price' : freshness === 'placeholder' ? 'placeholder_price' : 'undated_price');
      if (price.region) caveats.add(`region:${price.region}`);
    }
    lines.push({
      name: ing.name, qty, unit: ing.unit, optional: Boolean(ing.optional), status: c.status,
      cost: c.cost, purchaseCost: c.purchaseCost ?? null, packagesToBuy: c.packagesToBuy ?? null,
      price: price ? { packagePrice: price.packagePrice, packageQty: price.packageQty, unit: price.unit, region: price.region ?? null, asOf: price.asOf ?? null, freshness, evidence: price.evidence ?? null } : null,
    });
  }
  total = round(total, 2);
  return {
    servings, total, perServing: servings > 0 ? round(total / servings, 2) : null,
    purchaseTotal: round(purchase, 2), complete, purchaseComplete,
    caveats: [...caveats], lines,
  };
}

export function budgetStatus(cost, budgetPerServing) {
  if (!cost || !(budgetPerServing > 0)) return { state: 'unknown' };
  const per = cost.perServing;
  // A partial total is a lower bound: it can prove "over", never "within".
  if (!cost.complete) return per > budgetPerServing ? { state: 'over', delta: round(per - budgetPerServing, 2), lowerBound: true } : { state: 'unknown', lowerBound: true };
  const uncertain = cost.caveats.some((c) => c === 'stale_price' || c === 'undated_price' || c === 'placeholder_price');
  if (per > budgetPerServing) return { state: 'over', delta: round(per - budgetPerServing, 2), uncertain };
  const left = round(budgetPerServing - per, 2);
  const near = left <= Math.max(2, budgetPerServing * 0.15);
  return { state: near ? 'near' : 'within', left, uncertain };
}
