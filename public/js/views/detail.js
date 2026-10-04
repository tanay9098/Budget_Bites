import { h, clear, append, rupees, toast } from '../dom.js';
import { getCurrent } from '../state.js';
import { getSaved, isSaved, saveRecipe, removeSaved, addToList } from '../store.js';
import { recipeCost, buildPriceBook, budgetStatus } from '/shared/cost.js';
import { dietBadge, budgetBadges, statusBadge, sourceCard, conflictCard, emptyBlock, uniqueSources } from './components.js';

export function findRecipe(id) {
  const cur = getCurrent();
  const live = cur?.result.recipes.find((r) => r.id === id);
  if (live) return { recipe: live, request: cur.request, servings: cur.request.servings, conflicts: cur.result.conflicts, from: 'results' };
  const s = getSaved().find((x) => x.recipe.id === id);
  if (s) return { recipe: s.recipe, request: { budget: s.recipe.cost ? null : null }, servings: s.servings, conflicts: s.sources?.conflicts ?? [], from: 'saved', savedAt: s.savedAt };
  return null;
}

export function renderDetail(root, id) {
  const found = findRecipe(id);
  if (!found) { append(clear(root), emptyBlock('🔍', 'Recipe not found', 'It may belong to an earlier search. Build again or open one of your saved recipes.', h('a', { class: 'btn btn--primary', href: '#/' }, 'Build My Recipe'), h('a', { class: 'btn btn--ghost', href: '#/saved' }, 'Saved recipes'))); return; }
  const { recipe: r } = found;
  const budgetPer = found.request?.budget ?? r.budgetPerServing ?? null;
  let servings = found.servings;
  const book = buildPriceBook(r.priceBook ?? []);
  const view = h('div', { class: 'detail' });

  const draw = () => {
    const cost = recipeCost(r, servings, book);
    const budget = budgetPer ? budgetStatus(cost, budgetPer) : { state: 'unknown' };
    const subsFor = (name) => r.substitutions.filter((s) => s.ingredient === name.toLowerCase() || (r.ingredients.find((i) => i.name === name)?.aliases ?? []).includes(s.ingredient));
    const saved = isSaved(r.id);
    clear(view);
    append(view,
      h('div', { class: 'crumb' }, h('a', { href: found.from === 'saved' ? '#/saved' : '#/results' }, found.from === 'saved' ? '← Saved recipes' : '← Back to results')),
      h('div', { class: 'detail__head' }, h('div', { class: 'rc__top' }, dietBadge(r.classification.diet), budgetPer ? budgetBadges(budget) : null), h('h2', {}, r.name),
        h('div', { class: 'meta' }, h('span', {}, `⏱ ${r.prepMinutes} min prep + ${r.cookMinutes} min cook`), r.equipment.length ? h('span', {}, `🍳 ${r.equipment.join(', ')}`) : null, r.cuisine ? h('span', {}, r.cuisine) : null),
        h('div', { class: 'actions' },
          h('button', { class: 'btn btn--primary', type: 'button', onclick: () => { const n = addToList(r, cost.lines, r.ingredientStatus); toast(n ? `Added ${n} items to your shopping list` : 'Everything is already in your kitchen'); } }, '+ Add to shopping list'),
          h('button', { class: 'btn btn--ghost', type: 'button', 'aria-pressed': String(saved), onclick: () => { if (saved) { removeSaved(r.id); toast('Removed from saved recipes'); } else { saveRecipe(r, servings, { conflicts: found.conflicts }); toast('Saved on this device'); } draw(); } }, saved ? '♥ Saved' : '♡ Save recipe'))),
      h('section', { class: 'card' }, h('div', { class: 'rowcard' }, h('div', {}, h('div', { class: 'price' }, rupees(cost.perServing), cost.complete ? '' : '+', ' ', h('small', {}, 'per serving')), h('div', { class: 'muted' }, `${rupees(cost.total)}${cost.complete ? '' : '+'} for ${servings} serving${servings > 1 ? 's' : ''} (ingredients consumed)`)),
        h('div', { class: 'field' }, h('span', { class: 'label' }, 'Servings'), h('div', { class: 'stepper', role: 'group', 'aria-label': 'Scale servings' }, h('button', { type: 'button', 'aria-label': 'Fewer servings', disabled: servings <= 1, onclick: () => { servings--; draw(); } }, '−'), h('output', { 'aria-live': 'polite' }, String(servings)), h('button', { type: 'button', 'aria-label': 'More servings', disabled: servings >= 12, onclick: () => { servings++; draw(); } }, '+'))))),
      found.conflicts.length ? h('div', { style: 'display:grid;gap:12px' }, h('div', { class: 'notice notice--warn' }, h('b', {}, 'Unresolved contradictions in the sources'), 'These may affect how you cook this dish.'), found.conflicts.map(conflictCard)) : null,
      h('div', { class: 'cols' },
        h('section', { class: 'card', 'aria-labelledby': 'h-ing' }, h('h3', { id: 'h-ing', class: 'section-title' }, 'Ingredients'),
          h('div', { class: 'tablewrap' }, h('table', {}, h('thead', {}, h('tr', {}, h('th', {}, 'Ingredient'), h('th', { class: 'num' }, 'Qty'), h('th', {}, 'Status'))),
            h('tbody', {}, cost.lines.map((l) => { const st = r.ingredientStatus.find((s) => s.name === l.name)?.status ?? 'pantry'; const subs = st === 'buy' ? subsFor(l.name) : []; return [
              h('tr', {}, h('td', {}, l.name, l.optional ? ' (optional)' : ''), h('td', { class: 'num' }, `${l.qty} ${l.unit}`), h('td', {}, statusBadge(st))),
              st === 'buy' ? h('tr', {}, h('td', { colspan: 3 }, h('div', { class: 'hint' }, subs.length ? subs.map((s) => h('div', {}, h('b', {}, `Don't have ${l.name}? `), `${s.substitute}`, s.check.ok ? h('span', { class: 'badge', style: 'margin-left:6px' }, '✓ Fits your diet and exclusions') : h('span', { class: 'badge badge--over', style: 'margin-left:6px' }, `✗ ${s.check.reasons.join('; ')}`), s.note ? ` — ${s.note}` : '', ' ', h('span', { class: 'badge badge--sourced' }, `Source: ${s.evidence.source.title ?? s.evidence.source.path}`))) : `No evidence-backed substitute for ${l.name} was found in the Knowledge Base, so none is suggested.`))) : null]; })))),
          h('p', { class: 'hint' }, 'Quantities scale linearly with servings. Spices may need tasting and adjusting.')),
        h('section', { class: 'card', 'aria-labelledby': 'h-steps' }, h('h3', { id: 'h-steps', class: 'section-title' }, 'Method'), h('ol', { class: 'steps' }, r.steps.map((s) => h('li', {}, s))),
          r.safety.length ? h('div', { class: 'notice notice--warn', style: 'margin-top:12px' }, h('b', {}, 'Safety notes'), h('ul', { style: 'margin:0;padding-left:18px' }, r.safety.map((s) => h('li', {}, s.text, ' ', h('span', { class: 'badge badge--sourced' }, `Source: ${s.evidence.source.title ?? s.evidence.source.path}`))))) : null,
          r.warnings.length ? r.warnings.map((w) => h('p', { class: 'warn' }, '⚠ ', w.message)) : null)),
      costSection(cost, budgetPer, budget),
      h('details', { class: 'card', open: true }, h('summary', {}, 'Sources and evidence'), h('div', {},
        h('p', { class: 'hint' }, 'Every source below was returned by the Knowledge Base at request time. Quotes are verbatim and were verified against the retrieved text.'),
        uniqueSources(r).map(({ src, roles, quotes }) => sourceCard(src, { quote: quotes[0], why: `Supports: ${[...roles].join(', ').toLowerCase()}` })))),
      found.from === 'saved' ? h('p', { class: 'hint' }, `Saved ${new Date(found.savedAt).toLocaleDateString()} on this device. Prices and sources are as they were when saved.`) : null);
  };
  append(clear(root), view); draw();
}

function costSection(cost, budgetPer, budget) {
  const caveats = [];
  if (cost.caveats.includes('placeholder_price')) caveats.push('Some prices are placeholder values from the seed data and are not real market prices.');
  if (cost.caveats.includes('stale_price')) caveats.push('Some prices are older than 180 days.');
  if (cost.caveats.includes('undated_price')) caveats.push('Some prices have no date.');
  if (cost.caveats.includes('missing_price')) caveats.push('Some ingredients have no price in the Knowledge Base, so the total is incomplete (shown with +).');
  if (cost.caveats.includes('incompatible_units')) caveats.push('Some prices use units that cannot be safely converted (for example grams vs millilitres).');
  const regions = cost.caveats.filter((c) => c.startsWith('region:')).map((c) => c.slice(7));
  if (regions.length) caveats.push(`Price region: ${regions.join(', ')}.`);
  return h('section', { class: 'card', 'aria-labelledby': 'h-cost' }, h('h3', { id: 'h-cost', class: 'section-title' }, 'Cost breakdown'),
    h('div', { class: 'tablewrap' }, h('table', {}, h('thead', {}, h('tr', {}, h('th', {}, 'Ingredient'), h('th', { class: 'num' }, 'Used'), h('th', {}, 'Price basis'), h('th', { class: 'num' }, 'Cost'))),
      h('tbody', {}, cost.lines.map((l) => h('tr', {}, h('td', {}, l.name), h('td', { class: 'num' }, `${l.qty} ${l.unit}`), h('td', {}, l.price ? `${rupees(l.price.packagePrice)} per ${l.price.packageQty} ${l.price.unit}${l.price.asOf ? ` · ${l.price.asOf}` : ''}${l.price.freshness && l.price.freshness !== 'fresh' ? ` · ${l.price.freshness}` : ''}` : 'Price unavailable'), h('td', { class: 'num' }, l.cost == null ? '—' : rupees(l.cost))))),
      h('tfoot', {}, h('tr', {}, h('th', { colspan: 3 }, 'Consumed cost (ingredients actually used)'), h('th', { class: 'num' }, `${rupees(cost.total)}${cost.complete ? '' : '+'}`))))),
    cost.purchaseComplete ? h('p', {}, h('b', {}, 'To buy whole packages: '), `about ${rupees(cost.purchaseTotal)} (you will have leftovers for later meals).`) : h('p', { class: 'muted' }, 'Whole-package shopping cost is unavailable because some prices are missing.'),
    budgetPer ? h('p', {}, h('b', {}, 'Budget check: '), budgetBadges(budget)) : null,
    caveats.length ? h('div', { class: 'notice notice--warn' }, h('b', {}, 'Treat this as an estimate'), h('ul', { style: 'margin:0;padding-left:18px' }, caveats.map((c) => h('li', {}, c)))) : null,
    h('p', { class: 'hint' }, 'Formula: package price × quantity used ÷ package quantity, calculated by the app, not by the AI. Nutrition values are not shown because the Knowledge Base provided none.'));
}
