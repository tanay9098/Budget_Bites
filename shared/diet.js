// Dietary classification. Categories come from the extracted ingredient (backed by evidence);
// name matching is a safety net so an unlabelled "chicken" can never slip through as vegetarian.
import { normName } from './cost.js';

const NONVEG_WORDS = {
  egg: ['egg', 'eggs', 'anda', 'omelette'],
  meat: ['chicken', 'mutton', 'lamb', 'beef', 'pork', 'keema', 'meat', 'gelatin', 'gelatine', 'bacon', 'ham'],
  fish: ['fish', 'prawn', 'prawns', 'shrimp', 'tuna', 'rohu', 'seafood', 'crab', 'anchovy'],
};
const DAIRY_WORDS = ['milk', 'curd', 'dahi', 'yogurt', 'yoghurt', 'paneer', 'ghee', 'butter', 'cheese', 'cream', 'khoya', 'malai'];
export const EXCLUSION_ALIASES = {
  egg: ['egg', 'eggs', 'anda'], dairy: DAIRY_WORDS, milk: DAIRY_WORDS,
  peanut: ['peanut', 'peanuts', 'groundnut', 'moongfali'], nuts: ['almond', 'cashew', 'walnut', 'pistachio', 'peanut', 'nut'],
  gluten: ['wheat', 'atta', 'maida', 'roti', 'bread', 'suji', 'semolina', 'rava'], soy: ['soy', 'soya', 'tofu', 'soybean'],
  onion: ['onion', 'pyaz'], garlic: ['garlic', 'lahsun'], mushroom: ['mushroom'],
};

const words = (s) => normName(s).split(' ').filter(Boolean);

/** Category of one ingredient: 'veg' | 'dairy' | 'egg' | 'meat' | 'fish' | 'unknown' */
export function categoryOf(ing) {
  const w = words(ing.name);
  for (const [cat, list] of Object.entries(NONVEG_WORDS)) if (w.some((x) => list.includes(x))) return cat;
  if (ing.category && ['egg', 'meat', 'fish'].includes(ing.category)) return ing.category;
  if (w.some((x) => DAIRY_WORDS.includes(x)) || ing.category === 'dairy') return 'dairy';
  if (ing.category === 'veg') return 'veg';
  return 'unknown';
}

/** Recipe diet derived from ingredients, ignoring the diet label the source/model claimed. */
export function classifyRecipe(recipe) {
  const cats = (recipe.ingredients ?? []).map(categoryOf);
  const nonVeg = [...new Set(cats.filter((c) => ['egg', 'meat', 'fish'].includes(c)))];
  return { diet: nonVeg.length ? 'nonveg' : 'veg', nonVegCategories: nonVeg, unknown: (recipe.ingredients ?? []).filter((i) => categoryOf(i) === 'unknown').map((i) => i.name), hasDairy: cats.includes('dairy') };
}

export function exclusionHits(ingredients, exclusions = []) {
  const hits = [];
  for (const ex of exclusions.map((e) => normName(e)).filter(Boolean)) {
    const terms = new Set([ex, ...(EXCLUSION_ALIASES[ex] ?? [])]);
    if (ex === 'dairy') DAIRY_WORDS.forEach((d) => terms.add(d));
    for (const ing of ingredients) {
      const w = words(ing.name);
      const tagged = (ing.allergens ?? []).map(normName).includes(ex);
      if (tagged || w.some((x) => terms.has(x)) || (ex === 'dairy' && categoryOf(ing) === 'dairy') || (ex === 'egg' && categoryOf(ing) === 'egg')) hits.push({ exclusion: ex, ingredient: ing.name });
    }
  }
  return hits;
}

/** Is substituting `sub` for an ingredient compatible with the request's diet + exclusions? */
export function substitutionOk(sub, request) {
  const ing = { name: sub.substitute, category: sub.substituteCategory, allergens: sub.allergens };
  const cat = categoryOf(ing);
  const reasons = [];
  if (request.diet === 'veg' && ['egg', 'meat', 'fish'].includes(cat)) reasons.push(`${sub.substitute} is not vegetarian`);
  for (const h of exclusionHits([ing], request.exclusions)) reasons.push(`${sub.substitute} conflicts with exclusion "${h.exclusion}"`);
  return { ok: reasons.length === 0, reasons, unverified: cat === 'unknown' };
}

const PROTEIN_WORDS = ['dal', 'besan', 'soy', 'soya', 'rajma', 'chana', 'chole', 'moong', 'toor', 'masoor', 'lentil', 'paneer', 'egg', 'eggs', 'chicken', 'fish', 'tofu', 'curd', 'peanut', 'peanuts'];
/** Ingredients that are conventional protein sources. Qualitative only: no nutrition numbers are implied. */
export function proteinSources(recipe) {
  return (recipe.ingredients ?? []).filter((i) => words(i.name).some((w) => PROTEIN_WORDS.includes(w)) || ['egg', 'meat', 'fish'].includes(i.category)).map((i) => i.name);
}

export const PANTRY_BASICS = ['salt', 'cooking oil', 'oil', 'turmeric powder', 'cumin seeds', 'green chilli', 'red chilli powder', 'mustard seeds', 'sugar'];
export const isPantry = (name) => PANTRY_BASICS.includes(normName(name));
