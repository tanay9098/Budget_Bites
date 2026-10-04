import { h, rupees, safeUrl } from '../dom.js';
import { getDecisions, setDecision } from '../store.js';
import { toast } from '../dom.js';

export const dietBadge = (diet) => h('span', { class: `badge ${diet === 'veg' ? 'badge--veg' : 'badge--nv'}` }, diet === 'veg' ? '● Veg' : '▲ Non-Veg');

/** Budget status always pairs colour + icon + words. */
export function budgetBadges(budget) {
  const out = [];
  const s = budget?.state;
  if (s === 'within') out.push(h('span', { class: 'badge' }, `✓ Within budget · ${rupees(budget.left)} left`));
  else if (s === 'near') out.push(h('span', { class: 'badge badge--near' }, `ⓘ Near limit · ${rupees(budget.left)} left`));
  else if (s === 'over') out.push(h('span', { class: 'badge badge--over' }, `⚠ Over budget by ${rupees(budget.delta)}`));
  else out.push(h('span', { class: 'badge badge--unknown' }, '? Budget unconfirmed'));
  if (budget?.uncertain) out.push(h('span', { class: 'badge badge--est' }, 'Estimate'));
  return out;
}
export const meterFor = (cost, budgetPer) => {
  const pct = cost?.perServing != null && budgetPer ? Math.min(100, (cost.perServing / budgetPer) * 100) : 0;
  const cls = pct > 100 ? 'over' : pct >= 85 ? 'near' : '';
  return h('div', { class: `meter ${cls ? 'meter--' + cls : ''}`, role: 'img', 'aria-label': `${Math.round(pct)} percent of budget used` }, h('i', { style: `width:${pct}%` }));
};
export const statusBadge = (s) => h('span', { class: `badge ${s === 'kitchen' ? '' : s === 'buy' ? 'badge--buy' : 'badge--pantry'}` }, s === 'kitchen' ? 'In your kitchen' : s === 'buy' ? 'Need to buy' : 'Pantry basic');

/** One piece of evidence: only fields that retrieval actually returned are shown. */
export function sourceCard(src, { quote, why } = {}) {
  const url = safeUrl(src.url);
  return h('article', { class: 'src' },
    h('div', { class: 'src__t' }, h('span', { class: 'badge badge--sourced' }, 'Sourced'), ' ', src.title ?? src.path),
    h('div', { class: 'hint' }, `Document: ${src.path}`, src.kbId ? ` · KB ${src.kbId}` : '', src.date ? ` · ${src.date}` : '', src.version ? ` · v${src.version}` : ''),
    url ? h('a', { href: url, target: '_blank', rel: 'noopener noreferrer' }, url) : h('span', { class: 'hint' }, 'No original URL was returned for this source.'),
    quote ? h('blockquote', {}, quote) : null,
    why ? h('p', { class: 'hint' }, `Why it matters: ${why}`) : null);
}

export function conflictCard(c) {
  const decision = getDecisions()[c.topic];
  return h('section', { class: 'conflict card', 'aria-label': `Conflicting sources: ${c.topic}` },
    h('h4', {}, '⚠ Sources disagree: ', c.topic),
    h('p', { class: 'hint' }, 'Agent-detected disagreement between retrieved sources. Sanity did not flag this.'),
    h('div', { class: 'vs' }, c.claims.map((cl, i) => h('div', { class: 'claim' }, h('b', {}, `Claim ${String.fromCharCode(65 + i)}`), h('p', {}, cl.statement), sourceCard(cl.evidence.source, { quote: cl.evidence.quote })))),
    c.whyItMatters ? h('p', {}, h('b', {}, 'Why it matters: '), c.whyItMatters) : null,
    c.resolved ? h('div', { class: 'notice notice--ok' }, h('b', {}, 'Evidence-based resolution'), c.resolution.text) : h('div', { class: 'notice notice--warn' }, h('b', {}, 'Unresolved'), 'The retrieved evidence does not settle this. Use your own judgment or your equipment manual.'),
    h('div', { class: 'actions' }, c.claims.map((cl, i) => h('button', { class: 'btn btn--ghost btn--sm', type: 'button', 'aria-pressed': String(decision?.index === i), onclick: () => { setDecision(c.topic, { index: i, source: cl.evidence.source.title ?? cl.evidence.source.path }); toast('Choice saved on this device only. Nothing was sent to Sanity.'); } }, `I'll follow Claim ${String.fromCharCode(65 + i)}`))),
    decision ? h('p', { class: 'hint' }, `Your choice: Claim ${String.fromCharCode(65 + decision.index)} (${decision.source}). Stored in this browser only.`) : null);
}

export const emptyBlock = (icon, title, body, ...actions) => h('div', { class: 'empty card' }, h('div', { class: 'big', 'aria-hidden': 'true' }, icon), h('h3', {}, title), h('p', { class: 'muted' }, body), h('div', { class: 'actions' }, actions));

export function uniqueSources(recipe) {
  const m = new Map();
  const add = (s, role, quote) => { if (!s) return; const e = m.get(s.key) ?? { src: s, roles: new Set(), quotes: [] }; e.roles.add(role); if (quote && !e.quotes.includes(quote)) e.quotes.push(quote); m.set(s.key, e); };
  add(recipe.evidence?.source, 'Recipe', recipe.evidence?.quote);
  (recipe.cost?.lines ?? []).forEach((l) => add(l.price?.evidence?.source, 'Price', l.price?.evidence?.quote));
  (recipe.substitutions ?? []).forEach((s) => add(s.evidence.source, 'Substitution', s.evidence.quote));
  (recipe.safety ?? []).forEach((s) => add(s.evidence.source, 'Safety', s.evidence.quote));
  return [...m.values()];
}
