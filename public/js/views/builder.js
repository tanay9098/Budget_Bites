import { h, clear, append } from '../dom.js';
import { INGREDIENTS, MEALS, BUDGETS, EQUIPMENT, CUISINES, EXCLUSIONS, TIMES } from '../catalog.js';
import { getForm, saveForm } from '../store.js';
import { buildRecipes, ApiError } from '../api.js';
import { setCurrent } from '../state.js';

const DEFAULT = { diet: 'veg', budget: 30, ingredients: [], mealType: 'lunch', cuisine: 'Any', maxMinutes: 45, equipment: ['gas stove'], servings: 2, exclusions: [], preferences: { highProtein: false, lowCost: false, fewIngredients: false, substitutions: false } };
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const STEPS = { connect: 'Connecting to the Knowledge Base', outline: 'Reading the outline', select: 'Choosing relevant entries', read: 'Retrieving entries and sources', extract: 'Extracting recipes and prices from the evidence', retry: 'Looking for missing evidence', verify: 'Verifying quotes, diet, budget and equipment', done: 'Finished' };

export function renderBuilder(root, nav) {
  const form = { ...DEFAULT, ...(getForm() ?? {}), preferences: { ...DEFAULT.preferences, ...(getForm()?.preferences ?? {}) } };
  let showAll = false, query = '', errors = {}, busy = false, status = null, progress = [];
  const customBudget = () => !BUDGETS.includes(form.budget);

  const draw = () => {
    saveForm(form);
    const active = document.activeElement?.id;
    clear(root);
    append(root, h('section', { class: 'hero' }, h('h1', {}, 'Your rules. ', h('em', {}, 'Your meal.')), h('p', {}, 'Tell us your budget, what is in your kitchen and what you have to cook with. We build practical Indian meals and show the sources behind every claim.')),
      h('form', { class: 'builder', novalidate: true, onsubmit: submit, 'aria-describedby': 'form-status' },
        h('div', { class: 'stack', style: 'display:grid;gap:16px' }, dietCard(), budgetCard(), ingredientCard(), kitchenCard(), prefCard()),
        summary()));
    if (active) document.getElementById(active)?.focus();
  };

  const err = (k) => (errors[k] ? h('p', { class: 'error', id: `err-${k}`, role: 'alert' }, '⚠ ', errors[k]) : null);

  function dietCard() {
    const card = (v, ico, t, sub, extra) => h('button', { type: 'button', role: 'radio', 'aria-checked': String(form.diet === v), class: `rcard ${extra}`, onclick: () => { form.diet = v; draw(); } }, h('span', { class: 'rcard__ico', 'aria-hidden': 'true' }, ico), h('span', {}, h('b', {}, t), h('small', {}, form.diet === v ? 'Selected' : sub)), h('span', { class: 'rcard__tick', 'aria-hidden': 'true' }, form.diet === v ? '✓' : ''));
    return h('section', { class: 'card', 'aria-labelledby': 'h-diet' }, h('h3', { id: 'h-diet', class: 'section-title' }, 'Dietary mode'),
      h('div', { class: 'radiocards', role: 'radiogroup', 'aria-label': 'Dietary mode' }, card('veg', '🌿', 'Veg Mode', 'No egg, meat or fish', ''), card('nonveg', '🍳', 'Non-Veg Mode', 'Veg and non-veg recipes', 'rcard--nv')),
      h('p', { class: 'hint' }, form.diet === 'veg' ? 'Dairy is allowed unless you exclude it below.' : 'Non-veg mode can still return vegetarian recipes. Your exclusions still apply.'), err('diet'));
  }

  function budgetCard() {
    return h('section', { class: 'card', 'aria-labelledby': 'h-budget' }, h('h3', { id: 'h-budget', class: 'section-title' }, 'Your budget per serving'),
      h('div', { class: 'chips', role: 'radiogroup', 'aria-label': 'Budget per serving' }, BUDGETS.map((b) => h('button', { type: 'button', role: 'radio', class: 'chip', 'aria-checked': String(form.budget === b), onclick: () => { form.budget = b; draw(); } }, `₹${b}`))),
      h('div', { class: 'field' }, h('label', { class: 'label', for: 'budget' }, 'Or enter your own'),
        h('div', { class: 'rupee' }, h('span', { 'aria-hidden': 'true' }, '₹'), h('input', { id: 'budget', class: 'input tnum', type: 'number', inputmode: 'numeric', min: 5, max: 1000, value: form.budget, 'aria-invalid': errors.budget ? 'true' : null, 'aria-describedby': errors.budget ? 'err-budget' : null, oninput: (e) => { form.budget = Number(e.target.value); saveForm(form); refreshSummary(); }, onchange: draw })), err('budget')));
  }

  function ingredientCard() {
    const q = query.trim().toLowerCase();
    const pool = INGREDIENTS.filter((i) => !q || i.toLowerCase().includes(q));
    const shown = q || showAll ? pool : pool.slice(0, 8);
    const sel = (n) => form.ingredients.map((x) => x.toLowerCase()).includes(n.toLowerCase());
    const toggle = (n) => { form.ingredients = sel(n) ? form.ingredients.filter((x) => x.toLowerCase() !== n.toLowerCase()) : [...form.ingredients, n]; draw(); };
    const input = h('input', { id: 'ing-search', class: 'input', type: 'search', placeholder: 'Search ingredients', value: query, autocomplete: 'off', 'aria-label': 'Search ingredients', oninput: (e) => { query = e.target.value; drawList(); } });
    const listBox = h('div', { class: 'chips', id: 'ing-list' });
    const drawList = () => { const q2 = query.trim().toLowerCase(); const p2 = INGREDIENTS.filter((i) => !q2 || i.toLowerCase().includes(q2)); const s2 = q2 || showAll ? p2 : p2.slice(0, 8); clear(listBox); append(listBox, s2.length ? s2.map(chip) : h('p', { class: 'hint' }, 'No match. Add it as a custom ingredient below.'), !q2 && p2.length > 8 ? h('button', { type: 'button', class: 'chip chip--dashed', onclick: () => { showAll = !showAll; drawList(); } }, showAll ? 'Show fewer' : `Show all ${p2.length}`) : null); };
    const chip = (n) => h('button', { type: 'button', class: 'chip chip--ing', 'aria-pressed': String(sel(n)), onclick: () => toggle(n) }, h('span', { class: 'dot', 'aria-hidden': 'true' }), n);
    append(listBox, shown.map(chip), !q && pool.length > 8 ? h('button', { type: 'button', class: 'chip chip--dashed', onclick: () => { showAll = !showAll; drawList(); } }, showAll ? 'Show fewer' : `Show all ${pool.length}`) : null);
    const custom = h('input', { id: 'ing-custom', class: 'input', type: 'text', maxlength: 40, placeholder: 'Add a custom ingredient', 'aria-label': 'Add a custom ingredient', onkeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } } });
    const addCustom = () => { const v = custom.value.trim(); if (v && !sel(v) && form.ingredients.length < 40) { form.ingredients.push(v.slice(0, 40)); draw(); document.getElementById('ing-custom')?.focus(); } };
    return h('section', { class: 'card', 'aria-labelledby': 'h-ing' }, h('h3', { id: 'h-ing', class: 'section-title' }, 'What is in your kitchen?'),
      h('div', { class: 'search' }, h('svg', { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'aria-hidden': 'true' }, h('circle', { cx: 11, cy: 11, r: 7 }), h('path', { d: 'm20 20-3.5-3.5' })), input),
      listBox,
      form.ingredients.length ? h('div', { class: 'chips', 'aria-label': 'Selected ingredients' }, form.ingredients.map((n) => h('span', { class: 'chip chip--sel' }, h('span', { class: 'dot', style: 'width:14px;height:14px;border-radius:50%', 'aria-hidden': 'true' }), n, h('button', { type: 'button', 'aria-label': `Remove ${n}`, onclick: () => toggle(n) }, '×')))) : h('p', { class: 'hint' }, 'Optional. Picking what you have ranks recipes that use it first.'),
      h('div', { style: 'display:flex;gap:8px' }, custom, h('button', { type: 'button', class: 'btn btn--ghost', onclick: addCustom }, 'Add')));
  }

  function kitchenCard() {
    const eq = (e) => form.equipment.includes(e);
    return h('section', { class: 'card', 'aria-labelledby': 'h-kit' }, h('h3', { id: 'h-kit', class: 'section-title' }, 'Meal and kitchen'),
      h('div', { class: 'field' }, h('span', { class: 'label', id: 'l-meal' }, 'Meal type'), h('div', { class: 'seg', role: 'radiogroup', 'aria-labelledby': 'l-meal' }, MEALS.map((m) => h('button', { type: 'button', role: 'radio', 'aria-checked': String(form.mealType === m), onclick: () => { form.mealType = m; draw(); } }, cap(m))))),
      h('div', { class: 'two' },
        h('div', { class: 'field' }, h('label', { class: 'label', for: 'cuisine' }, 'Cuisine or region'), h('select', { id: 'cuisine', class: 'select', onchange: (e) => { form.cuisine = e.target.value; saveForm(form); } }, CUISINES.map((c) => h('option', { value: c, selected: form.cuisine === c }, c)))),
        h('div', { class: 'field' }, h('label', { class: 'label', for: 'time' }, 'Maximum preparation + cooking time'), h('select', { id: 'time', class: 'select', 'aria-invalid': errors.maxMinutes ? 'true' : null, onchange: (e) => { form.maxMinutes = Number(e.target.value); saveForm(form); refreshSummary(); } }, TIMES.map(([v, l]) => h('option', { value: v, selected: form.maxMinutes === v }, l))), err('maxMinutes'))),
      h('div', { class: 'field' }, h('span', { class: 'label', id: 'l-eq' }, 'Equipment you have'), h('div', { class: 'chips', role: 'group', 'aria-labelledby': 'l-eq' }, EQUIPMENT.map((e) => h('button', { type: 'button', class: 'chip', 'aria-pressed': String(eq(e)), onclick: () => { form.equipment = eq(e) ? form.equipment.filter((x) => x !== e) : [...form.equipment, e]; draw(); } }, cap(e)))), h('p', { class: 'hint' }, 'Basic pans, pots and a tawa are assumed.'), err('equipment')),
      h('div', { class: 'field' }, h('span', { class: 'label' }, 'Servings'), h('div', { class: 'stepper', role: 'group', 'aria-label': 'Servings' }, h('button', { type: 'button', 'aria-label': 'Fewer servings', disabled: form.servings <= 1, onclick: () => { form.servings--; draw(); } }, '−'), h('output', { 'aria-live': 'polite' }, String(form.servings)), h('button', { type: 'button', 'aria-label': 'More servings', disabled: form.servings >= 12, onclick: () => { form.servings++; draw(); } }, '+'))));
  }

  function prefCard() {
    const tog = (k, label, sub) => h('button', { type: 'button', role: 'switch', class: 'toggle', 'aria-checked': String(form.preferences[k]), onclick: () => { form.preferences[k] = !form.preferences[k]; draw(); } }, h('span', {}, h('b', {}, label), h('br'), h('small', { class: 'muted' }, sub)), h('i', { 'aria-hidden': 'true' }));
    return h('section', { class: 'card', 'aria-labelledby': 'h-pref' }, h('h3', { id: 'h-pref', class: 'section-title' }, 'Preferences'),
      h('div', { class: 'field' }, h('span', { class: 'label', id: 'l-ex' }, 'Avoid these ingredients'), h('div', { class: 'chips', role: 'group', 'aria-labelledby': 'l-ex' }, EXCLUSIONS.map((e) => h('button', { type: 'button', class: 'chip', 'aria-pressed': String(form.exclusions.includes(e)), onclick: () => { form.exclusions = form.exclusions.includes(e) ? form.exclusions.filter((x) => x !== e) : [...form.exclusions, e]; draw(); } }, cap(e))))),
      h('div', { class: 'two' }, tog('highProtein', 'Higher protein', 'Rank recipes with pulses, soy, egg or meat first'), tog('lowCost', 'Lowest cost first', 'Sort by estimated cost per serving'), tog('fewIngredients', 'Fewer ingredients', 'Prefer shorter shopping lists'), tog('substitutions', 'Show substitutions', 'Highlight supported swaps for items you lack')));
  }

  let summaryEl;
  function summary() {
    summaryEl = h('aside', { class: 'summary', 'aria-label': 'Summary' });
    fillSummary();
    return summaryEl;
  }
  const refreshSummary = () => { if (summaryEl) { clear(summaryEl); fillSummary(); } };
  function fillSummary() {
    append(summaryEl, h('h3', {}, 'Your rules'),
      h('dl', {}, row('Mode', form.diet === 'veg' ? 'Vegetarian' : 'Non-vegetarian'), row('Budget', `₹${form.budget || '—'} per serving`), row('Meal', `${cap(form.mealType)} · ${form.servings} serving${form.servings > 1 ? 's' : ''}`), row('Time', form.maxMinutes ? `Up to ${form.maxMinutes} min` : 'No limit'), row('Equipment', form.equipment.map(cap).join(', ') || 'None selected'), row('Ingredients', form.ingredients.join(', ') || 'Any'), row('Avoiding', form.exclusions.join(', ') || 'Nothing')),
      busy ? h('div', { class: 'progress', 'aria-live': 'polite' }, h('ul', {}, progress.map((p, i) => h('li', {}, i === progress.length - 1 && p.id !== 'done' ? h('span', { class: 'spin', 'aria-hidden': 'true' }) : h('span', { class: 'donechk', 'aria-hidden': 'true' }, '✓'), STEPS[p.id] ?? p.text)))) : null,
      status ? h('div', { class: `notice ${status.kind === 'err' ? 'notice--err' : 'notice--warn'}`, id: 'form-status', role: 'alert', style: 'color:var(--ink)' }, h('b', {}, status.title), status.text) : h('span', { id: 'form-status' }),
      h('button', { class: 'btn btn--lg', type: 'submit', disabled: busy, 'aria-busy': String(busy) }, busy ? 'Building…' : 'Build My Recipe'),
      h('p', { style: 'font-size:12px;opacity:.8' }, 'Answers come from sources retrieved from the Knowledge Base at request time.'));
  }
  const row = (t, v) => h('div', {}, h('dt', {}, t), h('dd', {}, v));

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    errors = {}; status = null;
    if (!form.budget || form.budget < 5 || form.budget > 1000) errors.budget = 'Enter a budget between ₹5 and ₹1000 per serving.';
    if (!form.equipment.length) errors.equipment = 'Select at least one cooking equipment option.';
    if (Object.keys(errors).length) { status = { kind: 'warn', title: 'Check the form. ', text: Object.values(errors).join(' ') }; draw(); const first = document.querySelector('[role=alert][id^=err-]'); first?.closest('section')?.scrollIntoView({ block: 'center' }); return; }
    busy = true; progress = []; draw();
    try {
      const out = await buildRecipes(form, (p) => { progress.push(p); refreshSummary(); });
      setCurrent({ request: out.request, result: out.result, at: Date.now() });
      nav('#/results');
    } catch (ex) {
      busy = false;
      if (ex instanceof ApiError && ex.code === 'validation') { errors = ex.fields ?? {}; status = { kind: 'warn', title: 'Check the form. ', text: ex.message }; }
      else status = errorStatus(ex);
      draw();
    }
  }
  draw();
}

function errorStatus(ex) {
  const m = {
    mcp_unavailable: ['Knowledge Base unavailable. ', `${ex.message} No recipes were generated from guesswork. Your saved recipes and shopping list still work.`],
    mcp_bad_response: ['Knowledge Base error. ', ex.message],
    model_unavailable: ['Model provider unavailable. ', `${ex.message} Retrieval may have worked, but no answer was produced.`],
    not_configured: ['Not configured. ', ex.message],
    insufficient_evidence: ['Not enough evidence. ', ex.message],
    rate_limited: ['Slow down. ', ex.message],
    network: ['Offline. ', ex.message],
  }[ex.code] ?? ['Something went wrong. ', ex.message ?? 'Please try again.'];
  return { kind: 'err', title: m[0], text: m[1] };
}
