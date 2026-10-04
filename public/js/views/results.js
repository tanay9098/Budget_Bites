import { h, clear, append, rupees, toast } from '../dom.js';
import { getCurrent } from '../state.js';
import { isSaved, saveRecipe, removeSaved, addToList, onChange } from '../store.js';
import { dietBadge, budgetBadges, meterFor, conflictCard, emptyBlock, uniqueSources } from './components.js';

export function recipeCard(r, request, extra = {}) {
  const cost = r.cost;
  const saved = () => isSaved(r.id);
  const saveBtn = h('button', { class: 'iconbtn', type: 'button', 'aria-pressed': String(saved()), 'aria-label': `${saved() ? 'Remove' : 'Save'} ${r.name}`, title: saved() ? 'Remove from saved' : 'Save recipe', onclick: () => {
    if (saved()) { removeSaved(r.id); toast('Removed from saved recipes'); } else { saveRecipe(r, request.servings, { conflicts: extra.conflicts ?? [] }) ? toast('Saved on this device') : toast('Could not save: browser storage is unavailable'); }
  } }, saved() ? '♥' : '♡');
  const un = onChange(() => { if (!saveBtn.isConnected) return un(); const s = saved(); saveBtn.setAttribute('aria-pressed', String(s)); saveBtn.textContent = s ? '♥' : '♡'; saveBtn.setAttribute('aria-label', `${s ? 'Remove' : 'Save'} ${r.name}`); });
  const main = r.ingredients.filter((i) => !['salt', 'cooking oil'].includes(i.name)).slice(0, 5).map((i) => i.name).join(', ');
  return h('article', { class: `card rc ${r.classification.diet === 'nonveg' ? 'rc--nv' : ''}` },
    h('div', { class: 'rc__art', 'aria-hidden': 'true' }, r.classification.diet === 'nonveg' ? '🍗' : '🍛'),
    h('div', { class: 'rc__body' },
      h('div', { class: 'rc__top' }, dietBadge(r.classification.diet), budgetBadges(r.budget)),
      h('h3', {}, h('a', { href: `#/recipe/${encodeURIComponent(r.id)}` }, r.name)),
      h('div', {}, h('span', { class: 'price' }, rupees(cost.perServing), cost.complete ? '' : '+', ' ', h('small', {}, 'per serving')), h('div', { class: 'muted', style: 'font-size:13px' }, `${rupees(cost.total)}${cost.complete ? '' : '+'} for ${cost.servings}${cost.complete ? '' : ' (some prices missing)'}`), meterFor(cost, request.budget)),
      h('div', { class: 'meta' }, h('span', {}, `⏱ ${r.prepMinutes} min prep + ${r.cookMinutes} min cook`), r.equipment.filter((e) => e !== 'stove').length ? h('span', {}, `🍳 ${r.equipment.filter((e) => e !== 'stove').join(', ')}`) : null),
      h('p', {}, h('b', {}, 'Main ingredients: '), main),
      h('ul', { class: 'fit', 'aria-label': 'Why this fits' }, r.fit.map((f) => h('li', {}, f))),
      r.warnings.map((w) => h('p', { class: 'warn' }, '⚠ ', w.message)),
      h('div', { class: 'actions' },
        h('a', { class: 'btn btn--primary btn--sm', href: `#/recipe/${encodeURIComponent(r.id)}` }, 'View full recipe'),
        h('button', { class: 'btn btn--ghost btn--sm', type: 'button', onclick: () => { const n = addToList(r, cost.lines, r.ingredientStatus); toast(n ? `Added ${n} items to your shopping list` : 'Everything is already in your kitchen'); } }, '+ Shopping list'),
        saveBtn)));
}

export function renderResults(root, nav) {
  const cur = getCurrent();
  if (!cur) { append(clear(root), emptyBlock('🍲', 'No results yet', 'Build a recipe first and it will show up here.', h('a', { class: 'btn btn--primary', href: '#/' }, 'Build My Recipe'))); return; }
  const { request, result } = cur;
  append(clear(root),
    h('div', { class: 'results-head' }, h('div', {}, h('h2', {}, result.recipes.length ? "Here's what you can cook." : 'No matching recipe'), h('p', { class: 'muted' }, `${request.diet === 'veg' ? 'Veg' : 'Non-veg'} · ₹${request.budget}/serving · ${request.mealType} · ${request.servings} serving${request.servings > 1 ? 's' : ''}`)), h('a', { class: 'btn btn--ghost', href: '#/' }, '← Edit rules')),
    result.mode === 'dev-mock' ? h('div', { class: 'notice notice--warn' }, h('b', {}, 'Development mock mode'), 'These results came from local seed files via a mock MCP server, not from a Sanity Knowledge Base.') : null,
    result.notes.map((n) => h('div', { class: 'notice notice--warn', style: 'margin-bottom:12px' }, n)),
    result.conflicts.length ? h('div', { style: 'display:grid;gap:12px;margin-bottom:16px' }, h('div', { class: 'notice notice--warn' }, h('b', {}, `${result.conflicts.length} conflict${result.conflicts.length > 1 ? 's' : ''} found between sources`), 'Review before cooking.'), result.conflicts.map(conflictCard)) : null,
    result.recipes.length ? h('div', { class: 'grid' }, result.recipes.map((r) => recipeCard(r, request, { conflicts: result.conflicts }))) : noMatch(result, request),
    result.rejected.length ? h('details', { class: 'card', style: 'margin-top:16px' }, h('summary', {}, `Considered but excluded (${result.rejected.length})`), h('div', {}, h('p', { class: 'muted' }, 'These recipes were found in the Knowledge Base but break one of your constraints, so they are not recommended.'), h('ul', {}, result.rejected.map((r) => h('li', {}, h('b', {}, r.name), ': ', r.failures.map((f) => f.message).join(' ')))))) : null,
    h('details', { class: 'card', style: 'margin-top:16px' }, h('summary', {}, `Evidence retrieved (${result.retrieved.length} entries)`), h('div', {}, h('ol', {}, result.trace.map((t) => h('li', {}, t.text))), h('p', { class: 'hint' }, 'Retrieved: ', result.retrieved.map((s) => s.title ?? s.path).join(' · ')))));
}

function noMatch(result, request) {
  const nm = result.noMatch;
  return h('div', { class: 'card', style: 'display:grid;gap:12px' }, h('div', { class: 'empty' }, h('div', { class: 'big', 'aria-hidden': 'true' }, '🥣'), h('h3', {}, 'Nothing fits every rule'), h('p', { class: 'muted' }, nm?.message ?? 'No recipe satisfied all constraints.')),
    nm?.relax?.length ? h('div', { class: 'notice' }, h('b', {}, 'Try relaxing one of these:'), h('ul', {}, nm.relax.map((r) => h('li', {}, r)))) : null,
    h('div', { class: 'actions', style: 'justify-content:center' }, h('a', { class: 'btn btn--primary', href: '#/' }, 'Change my rules')));
}
