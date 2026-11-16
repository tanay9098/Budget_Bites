/* BudgetBites visual prototype. SAMPLE DATA ONLY — no AI, no Sanity retrieval. */
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const inr = n => '₹' + Math.round(n).toLocaleString('en-IN');

/* ---------- sample data ---------- */
const ING = [
  { k: 'rice', n: 'Rice', c: '#EFE6C8' }, { k: 'atta', n: 'Atta', c: '#D9B778' }, { k: 'potato', n: 'Potatoes', c: '#C9974F' },
  { k: 'onion', n: 'Onions', c: '#B9588F' }, { k: 'tomato', n: 'Tomatoes', c: '#D9654B' }, { k: 'dal', n: 'Dal', c: '#E9A23B' },
  { k: 'chana', n: 'Chana', c: '#A8793F' }, { k: 'soy', n: 'Soy chunks', c: '#C4A068' }, { k: 'paneer', n: 'Paneer', c: '#F4EEDC' },
  { k: 'bread', n: 'Bread', c: '#DDB26A' }, { k: 'poha', n: 'Poha', c: '#F2D77A' }, { k: 'peanuts', n: 'Peanuts', c: '#C08A55' },
  { k: 'lemon', n: 'Lemon', c: '#E8D74A' }, { k: 'curd', n: 'Curd', c: '#F6F3EA' },
  { k: 'egg', n: 'Eggs', c: '#F3E2B3', nv: 1 }, { k: 'chicken', n: 'Chicken', c: '#E7B79A', nv: 1 }
];
const ingBy = k => ING.find(i => i.k === k) || { n: k, c: '#ccc' };
const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert'];
const CUISINES = ['North Indian', 'South Indian', 'East Indian', 'West Indian', 'Any Indian cuisine'];
const TIMES = [['Under 15 minutes', 15], ['15–30 minutes', 30], ['30–45 minutes', 45], ['45–60 minutes', 60]];
const EQUIP = ['Gas stove', 'Induction cooktop', 'Electric kettle', 'Microwave', 'Rice cooker', 'Pressure cooker'];
const GOALS = [['Cheapest possible meal', 'Lowest total ingredient cost'], ['High protein for the money', 'Most protein per ₹'], ['Filling meal', 'Keeps you full for longer'], ['Balanced everyday meal', 'Carbs, protein and veg'], ['Use ingredients before they spoil', 'Prioritises what you already have']];

// c = estimated cost of the ingredient quantity used for 2 servings (not the whole pack). basic = pantry basic.
const R = [
  { id: 'aloo', name: 'Aloo Jeera with Roti', veg: 1, time: 25, diff: 'Easy', protein: 7, cuisine: 'North Indian', meals: ['Lunch', 'Dinner'], equip: ['Gas stove', 'Induction cooktop'], plate: ['#E8B94A', '#C9974F', '#F1E3C0'],
    desc: 'Jeera-tempered potatoes with soft rotis. The classic hostel-room staple.',
    ing: [['potato', 'Potatoes', 300, 'g', 9], ['atta', 'Atta', 120, 'g', 5], ['onion', 'Onion', 1, '', 3], ['oil', 'Oil', 15, 'ml', 3, 1], ['spice', 'Jeera, haldi, salt', 1, 'tsp', 1, 1]],
    steps: [['Boil the potatoes', 'Pressure-cook or boil potatoes until just soft, then peel and cube.', 10], ['Knead the dough', 'Mix atta with water and a pinch of salt. Rest it while the potatoes cook.', 5], ['Temper and fry', 'Heat oil, crackle jeera, add chopped onion, then potatoes and haldi. Toss for 4 minutes.', 6], ['Roll and roast rotis', 'Roll thin rotis and roast on a hot tawa. Serve with the aloo.', 8]],
    subs: ['No onion? Use a pinch of hing for flavour.', 'Out of atta? Rice or bread works instead of roti.'], tips: ['Cube the potatoes small so they cook in less time.'], nut: [420, 7, 78, 9], alg: 'Contains gluten (atta).' },
  { id: 'poha', name: 'Quick Vegetable Poha', veg: 1, time: 15, diff: 'Easy', protein: 6, cuisine: 'West Indian', meals: ['Breakfast', 'Snack'], equip: ['Gas stove', 'Induction cooktop', 'Microwave'], plate: ['#F2D77A', '#E8B94A', '#7bc79c'],
    desc: 'Fluffy poha with onion, peanuts and lemon. Ready before your chai.',
    ing: [['poha', 'Thick poha', 100, 'g', 6], ['onion', 'Onion', 1, '', 3], ['potato', 'Potato', 1, '', 3], ['peanuts', 'Peanuts', 20, 'g', 3], ['lemon', 'Lemon', 1, '', 2], ['oil', 'Oil', 15, 'ml', 3, 1]],
    steps: [['Rinse the poha', 'Rinse in a sieve until soft but not mushy. Drain well.', 3], ['Fry the base', 'Heat oil, fry peanuts, then onion and diced potato until soft.', 6], ['Add poha', 'Add poha, haldi and salt. Mix gently for 2 minutes.', 3], ['Finish', 'Squeeze lemon and serve hot.', 1]],
    subs: ['No peanuts? Skip, or use roasted chana.'], tips: ['Rinse, do not soak, or the poha turns mushy.'], nut: [330, 6, 52, 11], alg: 'Contains peanuts.' },
  { id: 'khichdi', name: 'Dal Tadka Khichdi', veg: 1, time: 30, diff: 'Easy', protein: 12, cuisine: 'Any Indian cuisine', meals: ['Lunch', 'Dinner'], equip: ['Pressure cooker', 'Rice cooker', 'Gas stove'], plate: ['#E9A23B', '#F2D77A', '#C9974F'],
    desc: 'One-pot rice and dal with a quick onion-tomato tadka. Cheap, filling, comforting.',
    ing: [['rice', 'Rice', 100, 'g', 5], ['dal', 'Dal', 80, 'g', 9], ['onion', 'Onion', 1, '', 3], ['tomato', 'Tomato', 1, '', 3], ['oil', 'Oil', 15, 'ml', 3, 1], ['spice', 'Jeera, haldi, salt', 1, 'tsp', 1, 1]],
    steps: [['Wash rice and dal', 'Rinse together until the water runs clear.', 3], ['Pressure-cook', 'Add 3 cups water, haldi and salt. Cook 3 whistles.', 15], ['Make the tadka', 'Fry jeera, onion and tomato in oil until soft.', 6], ['Combine', 'Stir the tadka into the khichdi and serve.', 2]],
    subs: ['Swap tomato for a squeeze of lemon at the end.'], tips: ['Add extra water for a porridge-like texture.'], nut: [470, 12, 82, 9], alg: 'No major allergens listed.' },
  { id: 'soy', name: 'Soy Chunk Masala', veg: 1, time: 25, diff: 'Medium', protein: 22, cuisine: 'North Indian', meals: ['Lunch', 'Dinner'], equip: ['Gas stove', 'Induction cooktop'], plate: ['#C0623F', '#8a3b22', '#E9A23B'],
    desc: 'High-protein soy chunks in a thick onion-tomato masala, served over rice.',
    ing: [['soy', 'Soy chunks', 60, 'g', 9], ['onion', 'Onions', 2, '', 6], ['tomato', 'Tomatoes', 2, '', 6], ['rice', 'Rice', 100, 'g', 5], ['oil', 'Oil', 20, 'ml', 4, 1], ['spice', 'Masala, salt', 2, 'tsp', 3, 1]],
    steps: [['Soak the soy', 'Soak soy chunks in hot water for 10 minutes, then squeeze dry.', 10], ['Start the rice', 'Cook rice in a pot or rice cooker.', 15], ['Build the masala', 'Fry onion, add tomato and masala, cook until oily.', 8], ['Simmer', 'Add soy chunks and a splash of water. Simmer 5 minutes.', 5]],
    subs: ['No soy chunks? Boiled chana is a lower-cost swap with less protein.'], tips: ['Squeeze the soy well, or the gravy turns bland.'], nut: [520, 22, 74, 12], alg: 'Contains soy.' },
  { id: 'chana', name: 'Chana Masala Bowl', veg: 1, time: 40, diff: 'Medium', protein: 13, cuisine: 'North Indian', meals: ['Lunch', 'Dinner'], equip: ['Pressure cooker'], plate: ['#A8793F', '#D9654B', '#F1E3C0'],
    desc: 'Pressure-cooked chickpeas in a tangy tomato gravy, with rice.',
    ing: [['chana', 'Chana (soaked)', 100, 'g', 10], ['onion', 'Onion', 1, '', 3], ['tomato', 'Tomatoes', 2, '', 6], ['rice', 'Rice', 100, 'g', 5], ['oil', 'Oil', 15, 'ml', 3, 1], ['spice', 'Chana masala, salt', 2, 'tsp', 3, 1]],
    steps: [['Soak overnight', 'Soak chana in water for 8 hours.', 0], ['Pressure-cook', 'Cook chana 6 whistles with salt.', 25], ['Make the gravy', 'Fry onion and tomato with masala.', 8], ['Combine', 'Add chana with its water and simmer 5 minutes.', 5]],
    subs: ['Use canned chickpeas to save 25 minutes (costs more).'], tips: ['Mash a few chana to thicken the gravy.'], nut: [510, 13, 86, 11], alg: 'No major allergens listed.' },
  { id: 'bhurji', name: 'Budget Egg Bhurji Rice', veg: 0, time: 20, diff: 'Easy', protein: 17, cuisine: 'North Indian', meals: ['Lunch', 'Dinner', 'Breakfast'], equip: ['Gas stove', 'Induction cooktop', 'Rice cooker'], plate: ['#F3C94B', '#D9654B', '#EFE6C8'],
    desc: 'Spiced scrambled eggs over fluffy rice. Maximum protein for minimum rupees.',
    ing: [['egg', 'Eggs', 3, '', 21], ['onion', 'Onion', 1, '', 3], ['tomato', 'Tomato', 1, '', 3], ['rice', 'Rice', 100, 'g', 5], ['oil', 'Oil', 15, 'ml', 3, 1], ['spice', 'Haldi, chilli, salt', 1, 'tsp', 2, 1]],
    steps: [['Cook the rice', 'Cook rice in a pot or rice cooker.', 15], ['Sauté the base', 'Fry onion and tomato with haldi and chilli.', 5], ['Scramble the eggs', 'Crack in eggs and stir until just set.', 3], ['Serve', 'Plate over rice.', 1]],
    subs: ['No tomato? Use a squeeze of lemon.'], tips: ['Take it off the heat while still glossy; residual heat finishes it.'], nut: [540, 17, 72, 18], alg: 'Contains egg.' },
  { id: 'chicken', name: 'One-Pot Chicken Rice', veg: 0, time: 45, diff: 'Medium', protein: 28, cuisine: 'Any Indian cuisine', meals: ['Lunch', 'Dinner'], equip: ['Pressure cooker', 'Rice cooker'], plate: ['#E7B79A', '#C9974F', '#EFE6C8'],
    desc: 'Chicken, rice and onion cooked together in one pot. Fewer dishes, fuller plate.',
    ing: [['chicken', 'Chicken (curry cut)', 200, 'g', 44], ['rice', 'Rice', 100, 'g', 5], ['onion', 'Onion', 1, '', 3], ['tomato', 'Tomato', 1, '', 3], ['oil', 'Oil', 15, 'ml', 3, 1], ['spice', 'Masala, salt', 2, 'tsp', 3, 1]],
    steps: [['Marinate', 'Coat chicken in masala and salt for 10 minutes.', 10], ['Brown', 'Fry onion and chicken until lightly golden.', 8], ['Add rice and water', 'Add washed rice, tomato and 1.5 cups water.', 3], ['Pressure-cook', 'Cook 2 whistles, rest 5 minutes before opening.', 15]],
    subs: ['Use egg instead of chicken to cut cost by about ₹23.'], tips: ['Cook chicken until no pink remains; internal temp 74 °C.'], nut: [610, 28, 70, 20], alg: 'No major allergens listed.' }
];
R.forEach(r => { r.cost2 = r.ing.reduce((a, i) => a + i[4], 0); r.req = r.ing.filter(i => !i[5]).map(i => i[0]); });

/* ---------- state ---------- */
const store = { get(k, d) { try { return JSON.parse(localStorage.getItem('bb_' + k)) ?? d; } catch { return d; } }, set(k, v) { try { localStorage.setItem('bb_' + k, JSON.stringify(v)); } catch { } } };
const S = {
  view: 'build', mode: 'veg', budget: 50, custom: '', have: new Set(['rice', 'onion', 'potato', 'tomato', 'dal']), search: '', extra: [],
  meal: 'Lunch', cuisine: 'Any Indian cuisine', time: 45, equip: new Set(['Gas stove', 'Pressure cooker']), fridge: true, goal: 0, servings: 2,
  onlyMine: false, suggest: true, sort: 'match', withinOnly: false, listTab: 'list',
  saved: new Set(store.get('saved', ['aloo'])), list: store.get('list', []), generating: false
};
const persist = () => { store.set('saved', [...S.saved]); store.set('list', S.list); };

/* ---------- helpers ---------- */
let pid = 0;
function plate(r) {
  const gid = 'g' + (++pid);
  const [a, b, c] = r.plate; let h = 0; for (const ch of r.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const rnd = i => ((h >> (i % 20)) & 15) / 15;
  let dots = ''; for (let i = 0; i < 16; i++) dots += `<circle cx="${150 + rnd(i) * 100}" cy="${115 + rnd(i + 5) * 70}" r="${3 + rnd(i + 9) * 5}" fill="${i % 3 ? b : c}" opacity=".85"/>`;
  return `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${esc(r.name)} (illustrative placeholder, not a photograph)"><defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${r.veg ? '#EAF3E6' : '#FBEBE4'}"/><stop offset="1" stop-color="${r.veg ? '#CFE4D2' : '#F5D2C6'}"/></linearGradient></defs><rect width="400" height="300" fill="url(#${gid})"/><ellipse cx="200" cy="170" rx="128" ry="104" fill="#fff" opacity=".95"/><ellipse cx="200" cy="165" rx="104" ry="84" fill="${a}"/><ellipse cx="200" cy="160" rx="82" ry="62" fill="${b}" opacity=".7"/>${dots}<path d="M270 90c20-30 50-34 74-24-8 28-34 44-74 24Z" fill="#287A52" opacity=".85"/></svg>`;
}
const leaf = `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#287A52" stroke-width="2" stroke-linecap="round"><path d="M5 19C5 10 10 5 20 4c0 10-5 15-14 15"/><path d="M5 19c3-5 6-8 10-10"/></svg>`;
const pot = `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#D9654B" stroke-width="2" stroke-linecap="round"><path d="M4 11h16v3a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6v-3Z"/><path d="M2 11h2M20 11h2M9 4c0 1.500 1 1.500 1 3M14 4c0 1.500 1 1.500 1 3"/></svg>`;
const ico = (p, s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const I = {
  clock: ico('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', 14), flame: ico('<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9Z"/>', 14),
  prot: ico('<path d="M6 12a6 6 0 0 1 12 0 6 6 0 0 1-12 0Z"/><path d="M12 6v12"/>', 14), heart: ico('<path d="M12 20s-7-4.500-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.500-7 10-7 10Z"/>', 20),
  check: ico('<path d="m5 12 5 5 9-10"/>', 14), warn: ico('<path d="M12 4 2 20h20L12 4Zm0 6v5m0 3v.01"/>', 14), clock2: ico('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', 14),
  chef: ico('<path d="M7 14V9a3 3 0 0 1 1-5.800A4 4 0 0 1 16 3.200 3 3 0 0 1 17 9v5M7 14h10v5a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-5Z"/>', 20), x: ico('<path d="M6 6l12 12M18 6 6 18"/>', 18),
  search: ico('<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>', 18)
};
function status(cost, budget) {
  const p = cost / budget;
  if (cost > budget) return { c: 'over', t: `Over budget by ${inr(cost - budget)}`, i: I.warn, p: 100 };
  if (p > .85) return { c: 'near', t: `Near limit · ${inr(budget - cost)} left`, i: I.warn, p: p * 100 };
  return { c: 'within', t: `Within budget · ${inr(budget - cost)} left`, i: I.check, p: p * 100 };
}
const scaled = (r, sv = S.servings) => r.ing.map(i => ({ k: i[0], n: i[1], q: i[2] * sv / 2, u: i[3], c: i[4] * sv / 2, basic: !!i[5] }));
const costOf = (r, sv = S.servings) => r.cost2 * sv / 2;
const fmtQ = (q, u) => { const v = q >= 10 ? Math.round(q) : Math.round(q * 2) / 2; return (v + (u ? ' ' + u : '')).trim(); };
function toast(m) { const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = I.check + esc(m); $('#toasts').append(t); setTimeout(() => t.remove(), 2600); }
function matchInfo(r) { const need = r.req, have = need.filter(k => S.have.has(k)); return { have: have.length, total: need.length, missing: need.filter(k => !S.have.has(k)) }; }

/* ---------- views ---------- */
const V = {};
V.build = () => {
  const vis = ING.filter(i => (S.mode === 'nonveg' || !i.nv) && i.n.toLowerCase().includes(S.search.toLowerCase()));
  const sel = [...S.have].map(k => ingBy(k)), extras = S.extra;
  return `
<section class="hero"><div class="wrap">
  <div><span class="eyebrow">${leaf.replace(/30/g, '16')} Made for Indian student budgets</span>
    <h1>Your kitchen. Your budget. <em>Your rules.</em></h1>
    <p>Turn everyday ingredients into delicious, affordable meals made for student life.</p>
    <div class="trust">${I.check} Eat better. Spend less. Cook smarter.</div></div>
  <div class="hero-art" aria-hidden="true">${plate(R[3])}</div>
</div></section>
<div class="wrap">
  <div class="modes" role="radiogroup" aria-label="Cooking mode">
    <button class="mode" role="radio" data-m="veg" aria-checked="${S.mode === 'veg'}"><span class="mi">${leaf}</span><span><h3>Veg Mode</h3><small>Plant-powered everyday meals</small><span class="ex">Dal, poha, chana, seasonal sabzi, soy chunks</span></span><span class="radio">${ico('<path d="m5 12 5 5 9-10"/>', 14).replace('currentColor', '#fff')}</span></button>
    <button class="mode" role="radio" data-m="nonveg" aria-checked="${S.mode === 'nonveg'}"><span class="mi">${pot}</span><span><h3>Non-Veg Mode</h3><small>Eggs, chicken, fish and more</small><span class="ex">Egg bhurji, egg curry, chicken rice</span></span><span class="radio">${ico('<path d="m5 12 5 5 9-10"/>', 14).replace('currentColor', '#fff')}</span></button>
  </div>
  <div class="builder">
    <div class="col">
      <section class="card" aria-labelledby="sa"><div class="sec-h"><h2 id="sa"><span class="step">1</span>Your budget</h2><span class="hint">Estimated ingredient cost for your selected servings.</span></div>
        <div class="budget-row"><span class="big-rupee" aria-hidden="true">₹</span>
          <div class="row" role="radiogroup" aria-label="Budget">${[20, 30, 50, 75, 100].map(b => `<button class="chip" role="radio" data-budget="${b}" aria-checked="${S.budget === b && !S.custom}">₹${b}</button>`).join('')}</div></div>
        <label class="lbl" for="cb">Custom budget</label>
        <div class="rupee-input"><span>₹</span><input id="cb" inputmode="numeric" placeholder="e.g. 60" value="${esc(S.custom)}" aria-describedby="cbh"></div>
        <p class="hint" id="cbh" style="margin-top:8px">We count only what you use, not the full pack price.</p></section>

      <section class="card" aria-labelledby="sb"><div class="sec-h"><h2 id="sb"><span class="step">2</span>Ingredients you have</h2><span class="hint tnum">${S.have.size + extras.length} selected</span></div>
        <div class="selected-box row" aria-live="polite">${sel.length + extras.length ? sel.map(i => `<button class="chip ing" aria-pressed="true" data-rm="${i.k}" aria-label="Remove ${i.n}"><span class="dot" style="background:${i.c}"></span>${i.n}<span class="x" aria-hidden="true">×</span></button>`).join('') + extras.map((e, ix) => `<button class="chip ing" aria-pressed="true" data-rmx="${ix}" aria-label="Remove ${esc(e)}" style="border-style:dashed"><span class="dot" style="background:#fff"></span>${esc(e)}<span class="x" aria-hidden="true">×</span></button>`).join('') : '<span class="hint">Nothing selected yet. Tap ingredients below.</span>'}</div>
        <div class="row" style="margin-bottom:12px"><label class="search">${I.search}<input id="q" type="search" placeholder="Search ingredients" value="${esc(S.search)}" aria-label="Search ingredients"></label>
          <form id="addForm" class="row" style="flex:1;min-width:200px"><input class="input" id="addIng" placeholder="Add a custom ingredient" style="flex:1" aria-label="Custom ingredient"><button class="btn btn-ghost" type="submit">Add</button></form></div>
        <div class="row">${vis.length ? vis.filter(i => !S.have.has(i.k)).map(i => `<button class="chip ing" aria-pressed="false" data-add="${i.k}"><span class="dot" style="background:${i.c}"></span>${i.n}</button>`).join('') : `<span class="hint">No ingredients match “${esc(S.search)}”. Add it as a custom ingredient.</span>`}</div>
        <div class="switch-grid">
          <button class="switch" role="switch" aria-checked="${S.onlyMine}" data-sw="onlyMine">Use only ingredients I have<i></i></button>
          <button class="switch" role="switch" aria-checked="${S.suggest}" data-sw="suggest">Suggest affordable ingredients to buy<i></i></button></div></section>
      <section class="card" aria-labelledby="sf"><div class="sec-h"><h2 id="sf"><span class="step">3</span>Servings</h2><div class="stepper"><button data-sv="-1" aria-label="Fewer servings">−</button><output aria-live="polite">${S.servings}</output><button data-sv="1" aria-label="More servings">+</button></div></div></section>
    </div>
    <div class="col">
      <section class="card" aria-labelledby="sc"><div class="sec-h"><h2 id="sc"><span class="step">4</span>Meal preferences</h2></div>
        <span class="lbl" id="lm">Meal</span><div class="seg" role="radiogroup" aria-labelledby="lm">${MEALS.map(m => `<button role="radio" data-meal="${m}" aria-checked="${S.meal === m}">${m}</button>`).join('')}</div>
        <label class="lbl" for="cu">Cuisine</label><select class="select" id="cu">${CUISINES.map(c => `<option ${S.cuisine === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
        <span class="lbl" id="lt">Cooking time</span><div class="row" role="radiogroup" aria-labelledby="lt">${TIMES.map(t => `<button class="chip" role="radio" data-time="${t[1]}" aria-checked="${S.time === t[1]}">${t[0]}</button>`).join('')}</div></section>
      <section class="card" aria-labelledby="sd"><div class="sec-h"><h2 id="sd"><span class="step">5</span>Cooking equipment</h2><span class="hint">Pick all that apply</span></div>
        <div class="tiles">${EQUIP.map(e => `<button class="tile" aria-pressed="${S.equip.has(e)}" data-eq="${e}"><span class="ic">${ico('<path d="M5 13h14v2a5 5 0 0 1-5 5h-4a5 5 0 0 1-5-5v-2ZM9 4v5M15 4v5"/>', 16)}</span>${e}</button>`).join('')}</div>
        <button class="switch" role="switch" aria-checked="${S.fridge}" data-sw="fridge" style="margin-top:12px">I have a refrigerator<i></i></button></section>
      <section class="card" aria-labelledby="se"><div class="sec-h"><h2 id="se"><span class="step">6</span>Your goal</h2></div>
        <div class="goals" role="radiogroup" aria-label="Goal">${GOALS.map((g, i) => `<button class="goal" role="radio" data-goal="${i}" aria-checked="${S.goal === i}"><span class="rd"></span><span>${g[0]}<small>${g[1]}</small></span></button>`).join('')}</div></section>

    </div>
  </div>
  <div class="cta-card"><div><b>Personalized around your ingredients, time, and budget.</b><p>Prototype: results come from sample recipes, not live AI.</p></div>
    <button class="btn btn-primary btn-lg" id="build">${I.chef} Build My Recipe</button></div>
  <p class="proto-note">Visual prototype · sample data · no live AI integration</p>
</div>`;
};

function filtered() {
  let out = R.filter(r => (S.mode === 'nonveg' || r.veg) && r.time <= S.time && (!S.equip.size || r.equip.some(e => S.equip.has(e))) && (S.cuisine === 'Any Indian cuisine' || r.cuisine === S.cuisine || r.cuisine === 'Any Indian cuisine'));
  if (S.onlyMine) out = out.filter(r => matchInfo(r).missing.length === 0);
  return out;
}
function sorted(list) {
  const f = { match: (a, b) => matchInfo(b).have / matchInfo(b).total - matchInfo(a).have / matchInfo(a).total || costOf(a) - costOf(b), cost: (a, b) => costOf(a) - costOf(b), time: (a, b) => a.time - b.time, protein: (a, b) => b.protein - a.protein }[S.sort];
  return [...list].sort(f);
}
function card(r) {
  const cost = costOf(r), st = status(cost, S.budget), m = matchInfo(r), per = cost / S.servings;
  return `<article class="rc s-${st.c}">
  <div class="img">${plate(r)}<span class="badge ${r.veg ? 'b-veg' : 'b-nonveg'}">${r.veg ? leaf.replace(/30/g, '12') : pot.replace(/30/g, '12')} ${r.veg ? 'Veg' : 'Non-Veg'}</span>
    <button class="heart" aria-pressed="${S.saved.has(r.id)}" data-save="${r.id}" aria-label="${S.saved.has(r.id) ? 'Unsave' : 'Save'} ${esc(r.name)}">${I.heart}</button></div>
  <div class="body"><h3>${r.name}</h3><p>${r.desc}</p>
    <div><div class="price"><span class="rupee">${inr(cost)}</span><small>total · ${inr(per)}/serving · est.</small></div>
      <div class="meter" role="img" aria-label="${st.t}"><i style="width:${Math.min(100, st.p)}%"></i></div><div class="status">${st.i} ${st.t}</div></div>
    <div class="meta"><span>${I.clock} ${r.time} min</span><span>${I.prot} ~${r.protein * S.servings / S.servings} g protein</span><span>${I.flame} ${r.diff}</span></div>
    <div class="have">${m.missing.length ? `<span class="badge b-need">Need ${m.missing.length}: ${m.missing.map(k => ingBy(k).n).join(', ')}</span>` : '<span class="badge b-in">You have everything</span>'}</div>
    <div class="actions"><button class="btn btn-primary btn-sm" data-open="${r.id}">View Recipe</button><button class="btn btn-ghost btn-sm" data-remix="${r.id}">Remix</button></div></div></article>`;
}
function resultsBody(list) {
  if (!list.length) return emptyState('nocompat');
  const allOver = list.every(r => costOf(r) > S.budget);
  const shown = S.withinOnly ? list.filter(r => costOf(r) <= S.budget) : list;
  if (allOver && S.withinOnly) return emptyState('budget');
  return (allOver ? emptyState('budget', 1) : '') + `<div class="grid">${shown.map(card).join('')}</div>`;
}
V.results = () => {
  const list = sorted(filtered());
  return `<div class="wrap page">
  <div class="page-h"><div><span class="badge ${S.mode === 'veg' ? 'b-veg' : 'b-nonveg'}">${S.mode === 'veg' ? 'Veg Mode' : 'Non-Veg Mode'}</span><h1 style="margin-top:10px">Here's what you can cook.</h1><p class="muted" style="margin-top:6px">Meals matched to your ingredients, budget, and kitchen setup.</p></div>
    <button class="btn btn-ghost" data-go="build">Edit preferences</button></div>
  <div class="summary"><span class="badge b-near">Budget ${inr(S.budget)} for ${S.servings}</span><span class="badge b-in">${S.have.size + S.extra.length} ingredients</span><span class="badge">${S.meal}</span><span class="badge">${S.cuisine}</span><span class="badge">≤ ${S.time} min</span><span class="badge b-sample">Sample data</span></div>
  <div class="toolbar"><b class="tnum" id="rc">${list.length} ${list.length === 1 ? 'recipe' : 'recipes'}</b>
    <div class="row"><button class="chip" role="switch" aria-checked="${S.withinOnly}" data-within style="${S.withinOnly ? 'background:var(--text);color:#fff' : ''}">Within budget only</button>
    <label class="sr" for="sort">Sort</label><select class="select" id="sort">${[['match', 'Best match'], ['cost', 'Lowest cost'], ['time', 'Fastest'], ['protein', 'Most protein']].map(o => `<option value="${o[0]}" ${S.sort === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')}</select></div></div>
  ${resultsBody(list)}</div>`;
};
V.discover = () => {
  const list = R.filter(r => S.mode === 'nonveg' || r.veg);
  return `<div class="wrap page"><div class="page-h"><div><h1>Discover</h1><p class="muted" style="margin-top:6px">Sample student-friendly meals. Costs are estimates for ${S.servings} servings.</p></div>
    <div class="row"><button class="chip" aria-pressed="${S.mode === 'veg'}" data-m2="veg">Veg</button><button class="chip" aria-pressed="${S.mode === 'nonveg'}" data-m2="nonveg">Veg + Non-Veg</button></div></div>
  <div class="grid">${list.map(card).join('')}</div></div>`;
};
function savedRows() {
  const list = R.filter(r => S.saved.has(r.id));
  const f = S.savedFilter || 'all';
  const shown = list.filter(r => f === 'all' || (f === 'veg' ? r.veg : !r.veg));
  return { list, shown, f };
}
V.saved = () => {
  const { list, shown, f } = savedRows();
  return `<div class="wrap page"><div class="page-h"><div><h1>Saved Recipes</h1><p class="muted" style="margin-top:6px">Meals you want to cook again.</p></div></div>
  <div class="tabs" role="tablist"><button role="tab" aria-selected="true">Recipes <span class="badge-count">${list.length}</span></button><button role="tab" aria-selected="false" data-go="list">Shopping list <span class="badge-count">${S.list.length}</span></button></div>
  ${list.length ? `<div class="row" style="margin-bottom:16px">${[['all', 'All'], ['veg', 'Veg'], ['nonveg', 'Non-Veg']].map(o => `<button class="chip" role="radio" aria-checked="${f === o[0]}" data-sf="${o[0]}">${o[1]}</button>`).join('')}</div>
  ${shown.length ? shown.map(r => `<div class="saved-row"><div class="thumb">${plate(r)}</div><div><h3>${r.name}</h3><div class="meta" style="margin-top:4px"><span class="rupee" style="color:var(--text);font-size:15px">${inr(costOf(r, 2))}</span><span>${I.clock} ${r.time} min</span><span class="badge ${r.veg ? 'b-veg' : 'b-nonveg'}">${r.veg ? 'Veg' : 'Non-Veg'}</span></div></div>
    <div class="btns row"><button class="btn btn-primary btn-sm" data-open="${r.id}">View</button><button class="btn btn-ghost btn-sm" data-save="${r.id}" aria-label="Remove ${esc(r.name)} from saved">Remove</button></div></div>`).join('') : `<div class="empty"><h3>No ${f === 'veg' ? 'Veg' : 'Non-Veg'} recipes saved</h3><button class="btn btn-ghost" data-sf="all">Show all</button></div>`}` : emptyState('nosaved')}</div>`;
};
V.list = () => {
  const done = S.list.filter(i => i.done).length, total = S.list.filter(i => !i.done).reduce((a, i) => a + i.c, 0);
  return `<div class="wrap page"><div class="page-h"><div><h1>Shopping list</h1><p class="muted" style="margin-top:6px">Only what you are missing. Costs are estimates.</p></div></div>
  <div class="tabs" role="tablist"><button role="tab" aria-selected="false" data-go="saved">Recipes <span class="badge-count">${S.saved.size}</span></button><button role="tab" aria-selected="true">Shopping list <span class="badge-count">${S.list.length}</span></button></div>
  ${S.list.length ? `<div class="row" style="margin-bottom:14px"><button class="btn btn-ghost btn-sm" id="clearDone" ${done ? '' : 'disabled'}>Clear completed (${done})</button><button class="btn btn-ghost btn-sm" id="copyList">Copy list</button><button class="btn btn-ghost btn-sm" id="shareList">Share</button></div>
  ${S.list.map((it, ix) => `<div class="list-item ${it.done ? 'done' : ''}"><input type="checkbox" ${it.done ? 'checked' : ''} data-done="${ix}" aria-label="Mark ${esc(it.n)} as purchased"><div><div class="nm">${esc(it.n)}</div><div class="hint">${esc(it.q)} · for ${esc(it.r)}</div></div><span class="badge ${it.pantry ? 'b-in' : 'b-need'}">${it.pantry ? 'In pantry' : 'Need to buy'}</span><div style="display:flex;gap:6px;align-items:center"><span class="rupee">${inr(it.c)}</span><button class="btn btn-text btn-icon" style="width:36px;min-height:36px" data-del="${ix}" aria-label="Remove ${esc(it.n)}">${I.x}</button></div></div>`).join('')}
  <div class="list-total"><div><small style="color:#cfe6d8">Estimated shopping total (${S.list.filter(i => !i.done).length} items left)</small><div class="rupee">${inr(total)}</div></div><span class="badge b-sample">Estimate · sample prices</span></div>` : emptyState('nolist')}</div>`;
};

/* empty / error states */
const E = {
  nocompat: ['', 'No compatible recipes found', 'Nothing matches this exact mix of time, equipment and cuisine. Loosen one filter to see more.', [['Any time', 'relax-time'], ['Edit preferences', 'build']], ico('<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4M8 11h6"/>', 30)],
  budget: ['warn', 'Budget too restrictive', `Every matching recipe costs more than ${inr(S.budget)} for ${S.servings} servings. Try a higher budget or fewer servings. Nothing below is marked as within budget.`, [['Raise budget to ₹75', 'raise'], ['Edit preferences', 'build']], ico('<path d="M12 3v18M7 8c0-2 2-3 5-3s5 1 5 3-2 3-5 3-5 1-5 3 2 3 5 3 5-1 5-3"/>', 30)],
  missing: ['warn', 'You are missing key ingredients', 'These recipes need ingredients you have not selected. We have added affordable ones to your shopping list.', [['Open shopping list', 'list']], ico('<path d="M5 7h14l-1 12H6L5 7Zm4 0a3 3 0 0 1 6 0"/>', 30)],
  sanity: ['warn', 'Knowledge source unavailable', 'We could not reach the culinary knowledge source. Recipes are shown without sourced explanations, and are labelled as generated suggestions.', [['Try again', 'retry'], ['Continue without sources', 'build']], ico('<path d="M3 12a9 9 0 0 1 15-6M21 12a9 9 0 0 1-15 6M18 3v4h-4M6 21v-4h4"/>', 30)],
  failed: ['err', 'We could not build that recipe', 'Something went wrong on our side. Your choices are safe. Try again, or adjust the budget or ingredients.', [['Try again', 'retry'], ['Edit preferences', 'build']], ico('<path d="M12 4 2 20h20L12 4Zm0 6v5m0 3v.01"/>', 30)],
  nosaved: ['', 'No saved recipes yet', 'Tap the heart on any recipe to keep it here for later.', [['Build a recipe', 'build'], ['Discover meals', 'discover']], ico('<path d="M12 20s-7-4.500-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.500-7 10-7 10Z"/>', 30)],
  nolist: ['', 'Your shopping list is empty', 'Open a recipe and add the ingredients you are missing.', [['Discover meals', 'discover']], ico('<path d="M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/>', 30)],
  nosearch: ['', 'No results for “paneer tikka”', 'Check the spelling, or add it as a custom ingredient.', [['Clear search', 'clear'], ['Add as custom ingredient', 'build']], ico('<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>', 30)]
};
function emptyState(k, banner) {
  const [cls, h, p, btns, ic] = E[k];
  return `<div class="empty ${cls}" ${banner ? 'style="margin-bottom:20px"' : ''}><div class="em-ic">${ic}</div><h3>${h}</h3><p>${p}</p><div class="row" style="justify-content:center">${btns.map((b, i) => `<button class="btn ${i ? 'btn-ghost' : 'btn-primary'}" data-act="${b[1]}">${b[0]}</button>`).join('')}</div></div>`;
}
const skelCards = n => `<div class="grid">${Array.from({ length: n }, () => `<div class="skel-card"><div class="skel" style="aspect-ratio:4/3"></div><div style="padding:16px;display:grid;gap:10px"><div class="skel" style="height:20px;width:70%"></div><div class="skel" style="height:14px"></div><div class="skel" style="height:28px;width:40%"></div><div class="skel" style="height:40px"></div></div></div>`).join('')}</div>`;
V.generating = () => `<div class="wrap page"><div class="loading-msg"><span class="spin"></span>Finding the best meal for your budget...</div>${skelCards(3)}</div>`;
V.states = () => `<div class="wrap page sys"><h1>UI states</h1><p class="muted" style="margin-top:6px">Every loading, empty and error state in the brief.</p>
  <h2>Loading</h2><div class="loading-msg"><span class="spin"></span>Finding the best meal for your budget...</div>${skelCards(3)}
  <h2>Loading recipe image</h2><div class="states"><div class="skel-card"><div class="skel" style="aspect-ratio:4/3"></div></div></div>
  <h2>Empty and error</h2><div class="states">${['nocompat', 'budget', 'missing', 'sanity', 'failed', 'nosaved', 'nolist', 'nosearch'].map(emptyState).join('')}</div>
  <h2>Toast</h2><button class="btn btn-dark" data-act="toast">Show toast</button></div>`;
V.system = () => `<div class="wrap page sys"><h1>Design system</h1><p class="muted" style="margin-top:6px">Plus Jakarta Sans · 8 px grid · tokens in <code>styles.css</code></p>
  <h2>Colour</h2><div class="swatches">${[['Primary green', '#287A52'], ['Deep forest', '#194D36'], ['Pale mint', '#E7F3E9'], ['Warm cream', '#FFF9F0'], ['Saffron', '#E9A23B'], ['Tomato', '#D9654B'], ['Main text', '#24352B'], ['Secondary text', '#758176'], ['Border', '#E7E8DF']].map(c => `<div class="sw"><div style="background:${c[1]}"></div><p><b>${c[0]}</b><br>${c[1]}</p></div>`).join('')}</div>
  <p class="hint" style="margin-top:8px">Small secondary text uses #5C6A60 for AA contrast; #758176 is for icons and large text.</p>
  <h2>Type</h2><div class="card" style="display:grid;gap:10px"><div style="font-size:52px;font-weight:800;letter-spacing:-.02em">Your rules.</div><div style="font-size:36px;font-weight:800">Here's what you can cook.</div><div style="font-size:20px;font-weight:800">Ingredients</div><div style="font-size:17px;font-weight:700">Your budget</div><div>Body 15/400 — Turn everyday ingredients into affordable meals.</div><div class="rupee" style="font-size:26px">₹39 <small class="muted" style="font-size:13px">for 2</small></div></div>
  <h2>Buttons</h2><div class="row"><button class="btn btn-primary">Primary</button><button class="btn btn-dark">Dark</button><button class="btn btn-ghost">Ghost</button><button class="btn btn-text">Text</button><button class="btn btn-primary" disabled>Disabled</button></div>
  <h2>Badges and meters</h2><div class="row"><span class="badge b-veg">Veg</span><span class="badge b-nonveg">Non-Veg</span><span class="badge b-in">In your kitchen</span><span class="badge b-need">Need to buy</span><span class="badge">Pantry basic</span><span class="badge b-near">Near limit · ₹4 left</span><span class="badge b-src">Sourced</span><span class="badge b-gen">Generated suggestion</span><span class="badge">Estimate</span></div>
  <p class="hint" style="margin-top:10px">Budget status always pairs colour with an icon and words. A recipe is never marked within budget when its estimated cost is higher.</p></div>`;

/* ---------- render / routing ---------- */
const main = $('#main');
function go(v) {
  S.view = v; render(); window.scrollTo(0, 0);
  $$('[data-go]').forEach(b => b.matches('.nav-links button,.tabbar button') && b.setAttribute('aria-current', (b.dataset.go === (v === 'results' ? 'discover' : v === 'list' ? 'saved' : v)) ? 'page' : 'false'));
  document.title = 'BudgetBites — ' + ({ build: 'Build a Recipe', results: 'Results', discover: 'Discover', saved: 'Saved Recipes', list: 'Shopping list', states: 'UI states', system: 'Design system', generating: 'Building' }[v]);
}
function render(keepFocus) {
  document.body.dataset.mode = S.mode;
  const f = document.activeElement && document.activeElement.id; const y = window.scrollY;
  main.innerHTML = V[S.view](); $('#listCount').textContent = S.list.length;
  if (f) { const el = document.getElementById(f); if (el) { el.focus(); if (el.setSelectionRange && el.value) try { el.setSelectionRange(el.value.length, el.value.length) } catch { } } }
  if (keepFocus) window.scrollTo(0, y);
}

/* ---------- builder interactions (delegated) ---------- */
document.addEventListener('click', e => {
  const t = e.target.closest('button,a,[data-go]'); if (!t) return;
  const d = t.dataset;
  if (d.go) { e.preventDefault(); closeAll(); return go(d.go); }
  if (d.m) { setMode(d.m); return render(true); }
  if (d.m2) { S.mode = d.m2 === 'veg' ? 'veg' : 'nonveg'; return render(true); }
  if (d.budget) { S.budget = +d.budget; S.custom = ''; return render(true); }
  if (d.add) { S.have.add(d.add); return render(true); }
  if (d.rm) { S.have.delete(d.rm); return render(true); }
  if (d.rmx) { S.extra.splice(+d.rmx, 1); return render(true); }
  if (d.sw) { S[d.sw] = !S[d.sw]; return render(true); }
  if (d.meal) { S.meal = d.meal; return render(true); }
  if (d.time) { S.time = +d.time; return render(true); }
  if (d.eq) { S.equip.has(d.eq) ? S.equip.delete(d.eq) : S.equip.add(d.eq); return render(true); }
  if (d.goal) { S.goal = +d.goal; return render(true); }
  if (d.sv) { S.servings = Math.min(8, Math.max(1, S.servings + +d.sv)); if (S.view === 'build') return render(true); }
  if (d.save) { toggleSave(d.save); return; }
  if (d.open) return openDetail(d.open);
  if (d.remix) return openRemix(d.remix);
  if (d.sf) { S.savedFilter = d.sf; return render(true); }
  if ('within' in d) { S.withinOnly = !S.withinOnly; return render(true); }
  if (t.id === 'build') return build();
  if (t.id === 'clearDone') { S.list = S.list.filter(i => !i.done); persist(); toast('Cleared completed items'); return render(true); }
  if (t.id === 'copyList') return copyList();
  if (t.id === 'shareList') return shareList();
  if (d.del) { S.list.splice(+d.del, 1); persist(); return render(true); }
  if (d.act) return act(d.act);
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'cu') S.cuisine = t.value;
  else if (t.id === 'sort') { S.sort = t.value; render(true); }
  else if (t.dataset.done) { S.list[+t.dataset.done].done = t.checked; persist(); render(true); }
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'q') { S.search = t.value; render(true); }
  if (t.id === 'cb') { S.custom = t.value.replace(/\D/g, '').slice(0, 4); if (S.custom) S.budget = +S.custom; $$('[data-budget]').forEach(b => b.setAttribute('aria-checked', !S.custom && +b.dataset.budget === S.budget)); }
});
document.addEventListener('submit', e => {
  if (e.target.id === 'addForm') { e.preventDefault(); const v = $('#addIng').value.trim().slice(0, 30); if (v) { S.extra.push(v); render(true); toast(`Added “${v}”`); } }
});
function setMode(m) {
  S.mode = m;
  if (m === 'veg') { const rm = ['egg', 'chicken'].filter(k => S.have.delete(k)); if (rm.length) toast('Removed egg and chicken for Veg Mode'); }
}
function toggleSave(id) {
  S.saved.has(id) ? S.saved.delete(id) : S.saved.add(id); persist();
  toast(S.saved.has(id) ? 'Saved to your recipes' : 'Removed from saved');
  const open = $('#drawer').classList.contains('open');
  render(true); if (open) drawerSaveState(id);
}
function build() {
  if (!S.have.size && !S.extra.length) return toast('Select at least one ingredient first');
  S.view = 'generating'; render(); window.scrollTo(0, 0);
  setTimeout(() => { S.view = 'results'; render(); window.scrollTo(0, 0); }, 1400);
}
function act(a) {
  if (a === 'relax-time') { S.time = 60; S.view = 'results'; render(); }
  else if (a === 'raise') { S.budget = 75; render(); }
  else if (a === 'clear') { S.search = ''; go('build'); }
  else if (a === 'retry') toast('Prototype only: nothing to retry');
  else if (a === 'toast') toast('Recipe saved');
}
function listText() { return S.list.map(i => `${i.done ? '[x]' : '[ ]'} ${i.n} — ${i.q} (${inr(i.c)})`).join('\n'); }
function copyList() { const t = listText(); (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast('List copied'), () => toast('Copy not available here')); }
function shareList() { if (navigator.share) navigator.share({ title: 'BudgetBites list', text: listText() }).catch(() => { }); else copyList(); }

/* ---------- recipe detail drawer ---------- */
let cur = null, curSv = 2, missingSet = new Set(), lastFocus = null;
function closeAll() { ['#drawer', '#remix', '#prefs'].forEach(s => $(s).classList.remove('open')); $('#scrim').classList.remove('open'); $('#cook').classList.remove('open'); document.body.style.overflow = ''; lastFocus && lastFocus.focus && lastFocus.focus(); }
function openLayer(sel) { lastFocus = document.activeElement; $(sel).classList.add('open'); $('#scrim').classList.add('open'); document.body.style.overflow = 'hidden'; const f = $(sel + ' [data-focus]') || $(sel + ' button'); f && f.focus(); }
$('#scrim').addEventListener('click', closeAll);
document.addEventListener('keydown', e => { if (e.key === 'Escape') { if ($('#cook').classList.contains('open')) $('#cook').classList.remove('open'); else closeAll(); } });
function openDetail(id) {
  cur = R.find(r => r.id === id); curSv = S.servings; missingSet = new Set(cur.ing.filter(i => !i[5] && !S.have.has(i[0])).map(i => i[0]));
  drawer(); openLayer('#drawer');
}
function drawerSaveState(id) { const b = $('#dSave'); if (b) { b.textContent = S.saved.has(id) ? '♥ Saved' : '♡ Save'; } }
function drawer() {
  const r = cur, items = scaled(r, curSv), cost = costOf(r, curSv), st = status(cost, S.budget);
  const need = items.filter(i => missingSet.has(i.k));
  $('#drawer').innerHTML = `
  <div class="drawer-top"><button class="btn btn-text" data-act="x" id="dClose" data-focus>← Back</button><span class="badge b-sample">Sample data</span></div>
  <div class="drawer-scroll">
    <div class="d-hero">${plate(r)}<span class="badge ${r.veg ? 'b-veg' : 'b-nonveg'}">${r.veg ? 'Veg' : 'Non-Veg'}</span></div>
    <div class="d-pad"><h2>${r.name}</h2><p class="muted" style="margin-top:6px">${r.desc}</p>
    <div class="stats"><div class="stat"><small>Total cost (est.)</small><b>${inr(cost)}</b></div><div class="stat"><small>Per serving</small><b>${inr(cost / curSv)}</b></div><div class="stat"><small>Prep + cook</small><b>${r.time} min</b></div><div class="stat"><small>Protein</small><b>~${r.protein} g</b></div></div>
    <div class="s-${st.c}"><div class="status">${st.i} ${st.t} (${inr(S.budget)} budget)</div></div>
    <section class="d-sec"><h3>Ingredients <span class="stepper"><button data-dsv="-1" aria-label="Fewer servings">−</button><output>${curSv} servings</output><button data-dsv="1" aria-label="More servings">+</button></span></h3>
      <div class="ing-list">${items.map(i => `<div class="ing-row"><label><input type="checkbox" data-have="${i.k}" ${missingSet.has(i.k) ? '' : 'checked'} ${i.basic ? 'disabled checked' : ''}>${i.n}</label><span class="q">${fmtQ(i.q, i.u)}</span><span class="badge ${i.basic ? '' : missingSet.has(i.k) ? 'b-need' : 'b-in'}">${i.basic ? 'Pantry basic' : missingSet.has(i.k) ? 'Need to buy' : 'In your kitchen'}</span><span class="rupee">${inr(i.c)}</span></div>`).join('')}
      <div class="total-row"><span>Estimated total</span><span class="rupee">${inr(cost)}</span></div></div>
      <p class="hint" style="margin-top:8px">Ticked = you have it. Costs reflect only the quantity used, not full pack prices.</p></section>
    <section class="d-sec"><h3>Instructions <button class="btn btn-dark btn-sm" id="startCook">${I.chef} Cooking mode</button></h3>${r.steps.map((s, i) => `<div class="stepcard"><span class="n">${i + 1}</span><div><h4>${s[0]}${s[2] ? ` <span class="badge" style="margin-left:6px">${s[2]} min</span>` : ''}</h4><p>${s[1]}</p></div></div>`).join('')}</section>
    <section class="d-sec"><h3>Why this recipe works</h3><ul class="prov" style="padding:16px;margin:0">
      <li><span class="badge b-gen">Generated suggestion</span><span>The ingredients share one cooking method, so everything finishes in one pass.</span></li>
      <li><span class="badge">Estimate</span><span>Cost = quantity used × typical unit price, summed. Price date: [from Sanity metadata].</span></li>
      <li><span class="badge b-src">Sourced</span><span>[Source title · from Sanity metadata] — shown only when real source metadata exists. None connected in this prototype.</span></li></ul></section>
    <section class="d-sec"><h3>More details</h3>
      <details class="acc"><summary>Affordable substitutions</summary><div class="in">${r.subs.map(s => `<span>${s}</span>`).join('')}</div></details>
      <details class="acc"><summary>Equipment needed</summary><div class="in"><span>${r.equip.join(' or ')}</span></div></details>
      <details class="acc"><summary>Cooking tips</summary><div class="in">${r.tips.map(s => `<span>${s}</span>`).join('')}</div></details>
      <details class="acc"><summary>Estimated nutrition (per serving)</summary><div class="in"><span>${r.nut[0]} kcal · ${r.nut[1]} g protein · ${r.nut[2]} g carbs · ${r.nut[3]} g fat <span class="badge">Estimate</span></span></div></details>
      <details class="acc"><summary>Allergens</summary><div class="in"><span>${r.alg}</span></div></details></section></div></div>
  <div class="drawer-foot"><button class="btn btn-primary" id="addMissing" ${need.length ? '' : 'disabled'}>${need.length ? `Add ${need.length} missing to list` : 'Nothing missing'}</button><button class="btn btn-ghost" data-save="${r.id}" id="dSave">${S.saved.has(r.id) ? '♥ Saved' : '♡ Save'}</button><button class="btn btn-ghost" data-remix="${r.id}">Remix</button></div>`;
  $('#dClose').onclick = closeAll; $('#startCook').onclick = () => cookMode(0);
  $('#addMissing').onclick = () => {
    need.forEach(i => { if (!S.list.some(x => x.n === i.n && x.r === r.name)) S.list.push({ n: i.n, q: fmtQ(i.q, i.u), c: i.c, r: r.name, pantry: false, done: false }); });
    persist(); $('#listCount').textContent = S.list.length; toast(`Added ${need.length} items to shopping list`);
  };
}
$('#drawer').addEventListener('click', e => { const t = e.target.closest('[data-dsv]'); if (t) { curSv = Math.min(8, Math.max(1, curSv + +t.dataset.dsv)); const y = $('.drawer-scroll').scrollTop; drawer(); $('.drawer-scroll').scrollTop = y; } });
$('#drawer').addEventListener('change', e => { const k = e.target.dataset.have; if (k) { e.target.checked ? missingSet.delete(k) : missingSet.add(k); const y = $('.drawer-scroll').scrollTop; drawer(); $('.drawer-scroll').scrollTop = y; } });

/* cooking mode */
function cookMode(i) {
  const r = cur, s = r.steps[i], c = $('#cook');
  c.innerHTML = `<div class="cook-top"><b>${r.name}</b><button class="btn btn-ghost" id="cx" data-focus>Exit</button></div>
  <div class="cook-body"><div class="dots">${r.steps.map((_, j) => `<i class="${j <= i ? 'on' : ''}"></i>`).join('')}</div><span class="k">Step ${i + 1} of ${r.steps.length}${s[2] ? ` · ${s[2]} min` : ''}</span><h2>${s[0]}</h2><p>${s[1]}</p></div>
  <div class="cook-nav"><button class="btn btn-ghost" id="cp" ${i ? '' : 'disabled'}>← Previous</button><button class="btn btn-primary" id="cn">${i === r.steps.length - 1 ? 'Done' : 'Next →'}</button></div>`;
  c.classList.add('open'); $('#cx').onclick = () => c.classList.remove('open'); $('#cp').onclick = () => cookMode(i - 1);
  $('#cn').onclick = () => i === r.steps.length - 1 ? (c.classList.remove('open'), toast('Enjoy your meal!')) : cookMode(i + 1);
  $('#cn').focus();
}

/* remix */
const REMIX = {
  'Make it cheaper': { dc: -0.12, dt: 0, dp: -1, from: 'Pricier ingredient', to: 'Lower-cost alternative', note: 'Swaps the costliest item for a cheaper equivalent and trims oil.' },
  'Increase protein': { dc: 0.1, dt: 0, dp: 6, from: '—', to: '+ 30 g dal or soy', note: 'Adds a low-cost protein source.' },
  'Reduce cooking time': { dc: 0, dt: -8, dp: 0, from: 'Boil 25 min', to: 'Pressure-cook 12 min', note: 'Uses the pressure cooker and smaller cuts.' },
  'Make it less spicy': { dc: 0, dt: 0, dp: 0, from: '2 tsp chilli', to: '½ tsp chilli + lemon', note: 'Reduces heat, keeps flavour.' },
  'Use only what I have': { dc: -0.05, dt: 0, dp: 0, from: 'Items you lack', to: 'Pantry substitutes', note: 'Replaces missing items with what you selected.' },
  'Change the cuisine': { dc: 0, dt: 0, dp: 0, from: 'Current spices', to: 'South Indian tadka', note: 'Swaps the spice profile.' },
  'Replace an ingredient': { dc: 0, dt: 0, dp: 0, from: 'Chosen ingredient', to: 'Closest substitute', note: 'Swaps one item.' },
  'Scale the servings': { dc: 0, dt: 0, dp: 0, from: `${S.servings} servings`, to: 'Quantities rescaled', note: 'Scales all quantities and costs.' }
};
let rmx = new Set(), rmDone = false;
function openRemix(id) { cur = R.find(r => r.id === id); rmx = new Set(); rmDone = false; remixView(); openLayer('#remix'); }
function remixView() {
  const r = cur, base = costOf(r); const a = [...rmx].map(k => REMIX[k]); const dc = a.reduce((s, x) => s + x.dc, 0), dt = a.reduce((s, x) => s + x.dt, 0), dp = a.reduce((s, x) => s + x.dp, 0);
  const nc = base * (1 + dc), cs = nc - base;
  $('#remix').innerHTML = `<div style="display:flex;justify-content:space-between;align-items:start"><div><span class="badge b-gen">Prototype · sample adaptation</span><h2 id="remixTitle" style="margin-top:8px">Make this recipe work for you.</h2><p class="muted">Remixing adapts <b>${r.name}</b> — quantities, steps and cost change, not just the name.</p></div><button class="btn btn-text btn-icon" id="rx" aria-label="Close" data-focus>${I.x}</button></div>
  <div class="row" style="margin-top:16px">${Object.keys(REMIX).map(k => `<button class="chip" aria-pressed="${rmx.has(k)}" data-rmix="${k}">${k}</button>`).join('')}</div>
  <label class="lbl" for="rt" style="margin-top:16px">Anything else? (optional)</label><textarea class="input" id="rt" placeholder="e.g. I have no pressure cooker"></textarea>
  ${rmDone && a.length ? `<div class="ba"><div><h4>Before</h4><ul style="padding:0">${a.map(x => `<li>${x.from}</li>`).join('')}<li class="rupee" style="margin-top:6px">${inr(base)} · ${r.time} min</li></ul></div><div><h4>After</h4><ul style="padding:0">${a.map(x => `<li><b>${x.to}</b></li>`).join('')}<li class="rupee" style="margin-top:6px">${inr(nc)} · ${r.time + dt} min <span class="${cs > 0 ? 'up' : 'down'}">(${cs > 0 ? '+' : ''}${inr(cs)}${dp ? `, ${dp > 0 ? '+' : ''}${dp} g protein` : ''})</span></li></ul></div></div><p class="hint">${a.map(x => x.note).join(' ')} Illustrative values only.</p>` : ''}
  <div class="row" style="margin-top:16px;justify-content:flex-end"><button class="btn btn-ghost" id="rc2">Cancel</button><button class="btn btn-primary" id="rgo" ${rmx.size || rmDone ? '' : 'disabled'}>Remix Recipe</button></div>`;
  $('#rx').onclick = $('#rc2').onclick = closeAll; $('#rgo').onclick = () => { rmDone = true; remixView(); toast('Remix preview ready (sample)'); };
}
$('#remix').addEventListener('click', e => { const t = e.target.closest('[data-rmix]'); if (t) { const k = t.dataset.rmix; rmx.has(k) ? rmx.delete(k) : rmx.add(k); rmDone = false; const v = $('#rt') && $('#rt').value; remixView(); if (v) $('#rt').value = v; } });

/* preferences */
$('#prefsBtn').onclick = () => {
  $('#prefs').innerHTML = `<div style="display:flex;justify-content:space-between"><h2 id="prefsTitle">Preferences</h2><button class="btn btn-text btn-icon" id="px" aria-label="Close" data-focus>${I.x}</button></div>
  <p class="muted">Saved on this device only.</p><span class="lbl">Default mode</span><div class="seg"><button data-pm="veg" aria-checked="${S.mode === 'veg'}" role="radio">Veg</button><button data-pm="nonveg" aria-checked="${S.mode === 'nonveg'}" role="radio">Non-Veg</button></div>
  <span class="lbl">Default servings</span><div class="stepper"><button data-psv="-1" aria-label="Fewer">−</button><output id="pso">${S.servings}</output><button data-psv="1" aria-label="More">+</button></div>
  <div class="row" style="margin-top:20px;justify-content:flex-end"><button class="btn btn-primary" id="pdone">Done</button></div>`;
  openLayer('#prefs'); $('#px').onclick = $('#pdone').onclick = () => { closeAll(); render(true); };
};
$('#prefs').addEventListener('click', e => {
  const m = e.target.closest('[data-pm]'), s = e.target.closest('[data-psv]');
  if (m) { setMode(m.dataset.pm); $$('#prefs [data-pm]').forEach(b => b.setAttribute('aria-checked', b === m)); }
  if (s) { S.servings = Math.min(8, Math.max(1, S.servings + +s.dataset.psv)); $('#pso').textContent = S.servings; }
});

go('build');
