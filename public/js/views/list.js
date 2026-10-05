import { h, clear, append, rupees, toast } from '../dom.js';
import { getList, toggleItem, removeItem, clearList, displayQty } from '../store.js';
import { emptyBlock } from './components.js';
import { toBase } from '/shared/units.js';

function estimate(items) {
  let total = 0, unpriced = 0, uncertain = false;
  for (const i of items) {
    const p = i.price, pk = p && toBase(p.packageQty, p.unit);
    if (!pk || pk.dimension !== i.dimension) { unpriced++; continue; }
    total += p.packagePrice * Math.max(1, Math.ceil(i.qty / pk.value - 1e-9));
    if (p.freshness && p.freshness !== 'fresh') uncertain = true;
  }
  return { total, unpriced, uncertain };
}

export function renderList(root) {
  const draw = () => {
    const items = getList();
    clear(root);
    const open = items.filter((i) => !i.checked);
    const est = estimate(open);
    append(root, h('div', { class: 'results-head' }, h('div', {}, h('h2', {}, 'Shopping list'), h('p', { class: 'muted' }, 'Compatible items from different recipes are combined. Stored in this browser only.')),
      items.length ? h('button', { class: 'btn btn--ghost btn--danger', type: 'button', onclick: () => { if (confirm('Clear the whole shopping list?')) { clearList(); toast('Shopping list cleared'); draw(); } } }, 'Clear list') : null),
      items.length ? [
        h('ul', { class: 'shop' }, items.map((i) => { const q = displayQty(i); return h('li', { class: i.checked ? 'done' : '' },
          h('label', { class: 'check', style: 'flex:1' }, h('input', { type: 'checkbox', checked: i.checked, onchange: () => { toggleItem(i.key); draw(); } }), h('span', { class: 'shop__n' }, h('b', { class: 'shop__n' }, `${i.name} · ${q.qty} ${q.unit}`), h('small', { class: 'muted' }, `For ${i.from.join(', ')}${i.pantry ? ' · pantry basic' : ''}`))),
          h('button', { class: 'iconbtn', type: 'button', 'aria-label': `Remove ${i.name}`, onclick: () => { removeItem(i.key); draw(); } }, '×')); })),
        h('div', { class: 'card', style: 'margin-top:16px' }, open.length ? (est.total > 0 ? [h('div', { class: 'price' }, `≈ ${rupees(Math.round(est.total))}`, h('small', {}, ' upper bound: buying the full priced unit (e.g. 1 kg) of each unchecked item')), est.unpriced ? h('p', { class: 'hint' }, `${est.unpriced} item(s) have no usable price and are not included.`) : null, h('p', { class: 'hint' }, 'Based on prices from the Knowledge Base at the time you added the items. National averages differ from your local shop, and smaller packs usually cost less in total.')] : h('p', { class: 'muted' }, 'No estimate: none of the remaining items has a usable price.')) : h('p', { class: 'muted' }, 'Everything is checked off.')),
      ] : emptyBlock('🛒', 'Your list is empty', 'Add the ingredients you need from any recipe.', h('a', { class: 'btn btn--primary', href: '#/' }, 'Build My Recipe')));
  };
  draw();
}
