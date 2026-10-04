// Unit handling. Only conversions within one dimension are supported:
// mass (g, kg), volume (ml, l, tsp, tbsp, cup) and count (pc). Mass <-> volume is
// deliberately NOT converted: that needs an ingredient-specific density we do not have.

const UNITS = {
  g: ['mass', 1], gm: ['mass', 1], gram: ['mass', 1], grams: ['mass', 1],
  kg: ['mass', 1000], kilogram: ['mass', 1000],
  ml: ['volume', 1], l: ['volume', 1000], litre: ['volume', 1000], liter: ['volume', 1000],
  tsp: ['volume', 5], teaspoon: ['volume', 5],
  tbsp: ['volume', 15], tablespoon: ['volume', 15],
  cup: ['volume', 240], cups: ['volume', 240],
  pc: ['count', 1], pcs: ['count', 1], piece: ['count', 1], pieces: ['count', 1],
  nos: ['count', 1], no: ['count', 1], unit: ['count', 1], units: ['count', 1],
};

export function parseUnit(unit) {
  const key = String(unit ?? '').trim().toLowerCase().replace(/\.$/, '');
  const hit = UNITS[key];
  if (!hit) return null;
  return { dimension: hit[0], factor: hit[1], unit: key };
}

/** Convert a quantity to the base unit of its dimension (g, ml, pc). Returns null if unsupported. */
export function toBase(qty, unit) {
  const u = parseUnit(unit);
  if (!u || typeof qty !== 'number' || !Number.isFinite(qty) || qty < 0) return null;
  return { value: qty * u.factor, dimension: u.dimension };
}

export function compatible(unitA, unitB) {
  const a = parseUnit(unitA), b = parseUnit(unitB);
  return Boolean(a && b && a.dimension === b.dimension);
}

const BASE_LABEL = { mass: 'g', volume: 'ml', count: 'pc' };

/** Pick a readable display unit for a base value. */
export function formatBase(value, dimension) {
  if (dimension === 'mass') return value >= 1000 ? { qty: round(value / 1000), unit: 'kg' } : { qty: round(value), unit: 'g' };
  if (dimension === 'volume') return value >= 1000 ? { qty: round(value / 1000), unit: 'l' } : { qty: round(value), unit: 'ml' };
  return { qty: round(value), unit: BASE_LABEL[dimension] ?? 'pc' };
}

export function round(n, digits = 2) {
  const f = 10 ** digits;
  return Math.round((n + Number.EPSILON) * f) / f;
}
