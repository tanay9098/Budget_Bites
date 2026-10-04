import test from 'node:test';
import assert from 'node:assert/strict';
import { toBase, compatible } from '../shared/units.js';
import { ingredientCost, recipeCost, buildPriceBook, budgetStatus, priceFreshness } from '../shared/cost.js';

const rice = { name: 'rice', qty: 100, unit: 'g' };
const riceKg = { ingredient: 'rice', packagePrice: 60, packageQty: 1, unit: 'kg', asOf: '2026-10-01' };

test('unit conversion within a dimension', () => {
  assert.equal(toBase(1, 'kg').value, 1000);
  assert.equal(toBase(2, 'tbsp').value, 30);
  assert.equal(toBase(1, 'l').value, 1000);
  assert.ok(compatible('g', 'kg'));
});
test('mass and volume are never interchanged', () => {
  assert.equal(compatible('g', 'ml'), false);
  assert.equal(ingredientCost({ qty: 100, unit: 'ml' }, riceKg).status, 'incompatible_units');
});
test('ingredient cost = package price x qty used / package qty', () => {
  assert.equal(ingredientCost(rice, riceKg).cost, 6);
  assert.equal(ingredientCost({ qty: 250, unit: 'g' }, riceKg).cost, 15);
});
test('consumed cost differs from whole-package purchase cost', () => {
  const c = ingredientCost(rice, riceKg);
  assert.equal(c.cost, 6); assert.equal(c.purchaseCost, 60); assert.equal(c.packagesToBuy, 1);
});
test('missing price => incomplete cost, never fabricated', () => {
  const r = { servingsBase: 2, ingredients: [rice, { name: 'saffron', qty: 1, unit: 'g' }] };
  const c = recipeCost(r, 2, buildPriceBook([riceKg]));
  assert.equal(c.complete, false);
  assert.ok(c.caveats.includes('missing_price'));
  assert.equal(c.lines[1].cost, null);
});
test('serving-size scaling is linear and per-serving stays constant', () => {
  const r = { servingsBase: 2, ingredients: [rice] };
  const book = buildPriceBook([riceKg]);
  const a = recipeCost(r, 2, book), b = recipeCost(r, 6, book);
  assert.equal(b.total, a.total * 3);
  assert.equal(a.perServing, b.perServing);
  assert.equal(b.lines[0].qty, 300);
});
test('stale, undated and placeholder prices are flagged', () => {
  const now = new Date('2026-10-05');
  assert.equal(priceFreshness({ asOf: '2025-01-01' }, now), 'stale');
  assert.equal(priceFreshness({}, now), 'undated');
  assert.equal(priceFreshness({ asOf: '2026-10-01', placeholder: true }, now), 'placeholder');
  assert.equal(priceFreshness({ asOf: '2026-10-01' }, now), 'fresh');
});
test('budget status: within / near / over; partial totals never prove "within"', () => {
  const full = (per) => ({ perServing: per, complete: true, caveats: [] });
  assert.equal(budgetStatus(full(10), 30).state, 'within');
  assert.equal(budgetStatus(full(28), 30).state, 'near');
  assert.deepEqual(budgetStatus(full(44), 30), { state: 'over', delta: 14, uncertain: false });
  assert.equal(budgetStatus({ perServing: 5, complete: false, caveats: [] }, 30).state, 'unknown');
  assert.equal(budgetStatus({ perServing: 50, complete: false, caveats: [] }, 30).state, 'over');
  assert.equal(budgetStatus(full(10), 30).uncertain, false);
  assert.equal(budgetStatus({ ...full(10), caveats: ['stale_price'] }, 30).uncertain, true);
});
