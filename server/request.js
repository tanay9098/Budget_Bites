// Request validation for POST /api/recipes. Strict allow-lists and length caps.
export const MEALS = ['breakfast', 'lunch', 'dinner', 'snack'];
export const EQUIPMENT = ['gas stove', 'induction cooktop', 'microwave', 'pressure cooker'];
export const CUISINES = ['Any', 'North Indian', 'South Indian', 'Bengali', 'Gujarati', 'Maharashtrian', 'Punjabi', 'Street food'];
export const EXCLUSIONS = ['egg', 'dairy', 'peanut', 'soy', 'gluten', 'onion', 'garlic', 'mushroom'];

export class ValidationError extends Error { constructor(fields) { super('Invalid request'); this.fields = fields; } }

const clean = (s, n) => String(s).replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);

export function parseRequest(body) {
  const f = {};
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ValidationError({ _: 'Send a JSON object.' });
  const diet = body.diet;
  if (!['veg', 'nonveg'].includes(diet)) f.diet = 'Choose Veg or Non-Veg mode.';
  const budget = Number(body.budget);
  if (!Number.isFinite(budget) || budget < 5 || budget > 1000) f.budget = 'Enter a budget between ₹5 and ₹1000 per serving.';
  const servings = Number(body.servings);
  if (!Number.isInteger(servings) || servings < 1 || servings > 12) f.servings = 'Servings must be a whole number from 1 to 12.';
  const mealType = body.mealType;
  if (!MEALS.includes(mealType)) f.mealType = 'Choose a meal type.';
  const maxMinutes = body.maxMinutes === '' || body.maxMinutes == null ? 0 : Number(body.maxMinutes);
  if (!Number.isInteger(maxMinutes) || maxMinutes < 0 || maxMinutes > 240) f.maxMinutes = 'Time limit must be 0 to 240 minutes.';
  const list = (v, max, n) => (Array.isArray(v) ? v.slice(0, max).filter((x) => typeof x === 'string').map((x) => clean(x, n)).filter(Boolean) : []);
  const ingredients = list(body.ingredients, 40, 40);
  const equipment = list(body.equipment, 8, 30).filter((e) => EQUIPMENT.includes(e));
  if (!equipment.length) f.equipment = 'Select at least one cooking equipment option.';
  const exclusions = list(body.exclusions, 10, 30).map((e) => e.toLowerCase()).filter((e) => EXCLUSIONS.includes(e));
  const cuisine = CUISINES.includes(body.cuisine) ? body.cuisine : 'Any';
  const p = body.preferences && typeof body.preferences === 'object' ? body.preferences : {};
  if (Object.keys(f).length) throw new ValidationError(f);
  return {
    diet, budget, servings, mealType, maxMinutes, cuisine, ingredients, equipment, exclusions,
    preferences: { highProtein: p.highProtein === true, lowCost: p.lowCost === true, fewIngredients: p.fewIngredients === true, substitutions: p.substitutions === true },
  };
}
