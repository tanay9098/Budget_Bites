import { h, clear, append, toast } from '../dom.js';
import { getSaved, removeSaved, addToList } from '../store.js';
import { dietBadge, emptyBlock } from './components.js';
import { rupees } from '../dom.js';

export function renderSaved(root) {
  const draw = () => {
    const items = getSaved();
    clear(root);
    append(root, h('div', { class: 'results-head' }, h('div', {}, h('h2', {}, 'Saved recipes'), h('p', { class: 'muted' }, 'Stored in this browser only. Clearing site data removes them. Not synced to any account.'))),
      items.length ? h('div', { class: 'grid' }, items.map(({ recipe: r, servings, savedAt }) => h('article', { class: 'card', style: 'display:grid;gap:10px;align-content:start' },
        h('div', {}, dietBadge(r.classification.diet)), h('h3', {}, h('a', { href: `#/recipe/${encodeURIComponent(r.id)}`, style: 'color:inherit' }, r.name)),
        h('p', { class: 'muted' }, `Saved ${new Date(savedAt).toLocaleDateString()} · ${rupees(r.cost.perServing)}${r.cost.complete ? '' : '+'} per serving at save time`),
        h('p', { class: 'hint' }, `${r.evidence.source.title ?? r.evidence.source.path} · ${r.evidence.source.date ?? 'undated source'}`),
        h('div', { class: 'actions' }, h('a', { class: 'btn btn--primary btn--sm', href: `#/recipe/${encodeURIComponent(r.id)}` }, 'View'),
          h('button', { class: 'btn btn--ghost btn--sm', type: 'button', onclick: () => { const n = addToList(r, r.cost.lines, r.ingredientStatus); toast(n ? `Added ${n} items to your shopping list` : 'Nothing to add'); } }, '+ Shopping list'),
          h('button', { class: 'btn btn--text btn--sm btn--danger', type: 'button', onclick: () => { removeSaved(r.id); toast('Removed'); draw(); } }, 'Remove'))))) :
        emptyBlock('♡', 'Nothing saved yet', 'Tap the heart on a recipe to keep it here, with its sources.', h('a', { class: 'btn btn--primary', href: '#/' }, 'Build My Recipe')));
  };
  draw();
}
