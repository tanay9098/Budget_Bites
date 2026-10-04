// Local-only persistence (localStorage). Not synced anywhere; clearing site data removes it.
import { toBase, formatBase } from '/shared/units.js';
import { normName } from '/shared/cost.js';

const KEYS = { saved: 'bb.saved', list: 'bb.list', form: 'bb.form', decisions: 'bb.decisions' };
const subs = new Set();

function read(key, fallback) { try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch { return fallback; } }
function write(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch { return false; } }
const emit = () => subs.forEach((f) => f());
export const onChange = (f) => { subs.add(f); return () => subs.delete(f); };

// ---- saved recipes ----
export const getSaved = () => read(KEYS.saved, []);
export const isSaved = (id) => getSaved().some((r) => r.recipe.id === id);
export function saveRecipe(recipe, servings, sources) {
  const all = getSaved().filter((r) => r.recipe.id !== recipe.id);
  all.unshift({ recipe, servings, sources, savedAt: new Date().toISOString() });
  const ok = write(KEYS.saved, all); emit(); return ok;
}
export function removeSaved(id) { write(KEYS.saved, getSaved().filter((r) => r.recipe.id !== id)); emit(); }

// ---- shopping list: quantities are held in base units (g, ml, pc) per dimension so compatible items merge ----
export const getList = () => read(KEYS.list, []);
const setList = (l) => { write(KEYS.list, l); emit(); };

export function addToList(recipe, costLines, ingredientStatus, servingsLabel) {
  const list = getList();
  let added = 0;
  const status = new Map(ingredientStatus.map((s) => [s.name, s.status]));
  for (const l of costLines) {
    if (l.optional || status.get(l.name) === 'kitchen') continue;
    const base = toBase(l.qty, l.unit);
    if (!base) continue;
    const key = `${normName(l.name)}|${base.dimension}`;
    let item = list.find((i) => i.key === key);
    if (!item) { item = { key, name: l.name, dimension: base.dimension, qty: 0, checked: false, from: [], pantry: status.get(l.name) === 'pantry', price: null }; list.push(item); }
    item.qty += base.value; added++;
    if (!item.from.includes(recipe.name)) item.from.push(recipe.name);
    if (l.price && !item.price) item.price = l.price;
    item.checked = false;
  }
  setList(list);
  return added;
}
export function toggleItem(key) { setList(getList().map((i) => (i.key === key ? { ...i, checked: !i.checked } : i))); }
export function removeItem(key) { setList(getList().filter((i) => i.key !== key)); }
export function clearList() { setList([]); }
export const displayQty = (item) => formatBase(item.qty, item.dimension);

// ---- last form, conflict decisions ----
export const getForm = () => read(KEYS.form, null);
export const saveForm = (f) => write(KEYS.form, f);
export const getDecisions = () => read(KEYS.decisions, {});
export function setDecision(topic, choice) { const d = getDecisions(); d[topic] = { ...choice, at: new Date().toISOString() }; write(KEYS.decisions, d); emit(); }
