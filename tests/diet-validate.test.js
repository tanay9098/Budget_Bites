import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyRecipe, exclusionHits, substitutionOk, categoryOf } from '../shared/diet.js';
import { validateRecipe, equipmentProblems } from '../shared/validate.js';
import { buildPriceBook } from '../shared/cost.js';

const book = buildPriceBook([
  { ingredient: 'rice', packagePrice: 60, packageQty: 1, unit: 'kg', asOf: '2026-10-01' },
  { ingredient: 'egg', aliases: ['eggs'], packagePrice: 42, packageQty: 6, unit: 'pc', asOf: '2026-10-01' },
  { ingredient: 'chicken', packagePrice: 240, packageQty: 1, unit: 'kg', asOf: '2026-10-01' }]);
const R = (extra = {}) => ({ id: 'x', name: 'x', servingsBase: 2, prepMinutes: 5, cookMinutes: 10, equipment: [], ingredients: [{ name: 'rice', qty: 100, unit: 'g', category: 'veg' }], ...extra });
const req = (e = {}) => ({ diet: 'veg', budget: 30, servings: 2, mealType: 'lunch', maxMinutes: 0, equipment: ['gas stove'], exclusions: [], ...e });
const codes = (v) => v.failures.map((f) => f.code);

test('a mislabelled non-veg ingredient is still caught by name', () => {
  assert.equal(categoryOf({ name: 'chicken', category: 'veg' }), 'meat');
  assert.equal(classifyRecipe(R({ ingredients: [{ name: 'egg', qty: 2, unit: 'pc', category: 'veg' }] })).diet, 'nonveg');
});
test('vegetarian mode rejects egg/chicken recipes; non-veg mode accepts veg ones', () => {
  const egg = R({ ingredients: [{ name: 'eggs', qty: 4, unit: 'pc', category: 'egg' }] });
  assert.ok(codes(validateRecipe(egg, req({ diet: 'veg' }), book)).includes('diet'));
  assert.ok(validateRecipe(egg, req({ diet: 'nonveg' }), book).ok);
  assert.ok(validateRecipe(R(), req({ diet: 'nonveg' }), book).ok);
});
test('dairy allowed in veg mode unless excluded', () => {
  const r = R({ ingredients: [{ name: 'paneer', qty: 100, unit: 'g', category: 'dairy' }] });
  assert.equal(classifyRecipe(r).diet, 'veg');
  assert.ok(exclusionHits(r.ingredients, ['dairy']).length === 1);
});
test('"no eggs" exclusion applies even in non-veg mode', () => {
  const egg = R({ ingredients: [{ name: 'egg', qty: 4, unit: 'pc', category: 'egg' }] });
  assert.ok(codes(validateRecipe(egg, req({ diet: 'nonveg', exclusions: ['egg'] }), book)).includes('exclusion'));
});
test('allergen tags are honoured (soy)', () => {
  assert.equal(exclusionHits([{ name: 'soy chunks', allergens: ['soy'] }], ['soy']).length, 1);
});
test('substitutions are checked against diet and exclusions', () => {
  assert.equal(substitutionOk({ substitute: 'paneer', substituteCategory: 'dairy' }, req({ exclusions: ['dairy'] })).ok, false);
  assert.equal(substitutionOk({ substitute: 'paneer', substituteCategory: 'dairy' }, req()).ok, true);
  assert.equal(substitutionOk({ substitute: 'chicken' }, req()).ok, false);
});
test('budget validation rejects over-budget recipes', () => {
  const chicken = R({ ingredients: [{ name: 'chicken', qty: 300, unit: 'g', category: 'meat' }] });
  const v = validateRecipe(chicken, req({ diet: 'nonveg', budget: 30 }), book);
  assert.ok(codes(v).includes('budget')); assert.equal(v.budget.state, 'over');
});
test('equipment and time constraints', () => {
  assert.deepEqual(equipmentProblems(R({ equipment: ['pressure cooker'] }), ['gas stove']), ['pressure cooker']);
  assert.deepEqual(equipmentProblems(R({ equipment: ['stove', 'tawa'] }), ['induction cooktop']), []);
  assert.ok(equipmentProblems(R({ equipment: ['stove'] }), ['microwave']).length);
  assert.ok(codes(validateRecipe(R({ prepMinutes: 30, cookMinutes: 30 }), req({ maxMinutes: 45 }), book)).includes('time'));
});
test('inconsistent quantities are rejected', () => {
  assert.ok(codes(validateRecipe(R({ ingredients: [{ name: 'rice', qty: -1, unit: 'g' }] }), req(), book)).includes('quantities'));
  assert.ok(codes(validateRecipe(R({ servingsBase: 0 }), req(), book)).includes('quantities'));
});
test('missing prices give a warning, not a false "within budget"', () => {
  const v = validateRecipe(R({ ingredients: [{ name: 'saffron', qty: 1, unit: 'g', category: 'veg' }] }), req(), book);
  assert.equal(v.budget.state, 'unknown'); assert.ok(v.warnings.some((w) => w.code === 'budget_unknown'));
});
