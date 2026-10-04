import { h, clear } from './dom.js';
import { fetchHealth } from './api.js';
import { getSaved, getList, onChange } from './store.js';
import { renderBuilder } from './views/builder.js';
import { renderResults } from './views/results.js';
import { renderDetail } from './views/detail.js';
import { renderSaved } from './views/saved.js';
import { renderList } from './views/list.js';

const root = document.getElementById('main');
const nav = (hash) => { if (location.hash === hash) route(); else location.hash = hash; };

function route() {
  const hash = location.hash || '#/';
  const [, seg, arg] = hash.split('/');
  let key = 'build';
  clear(root);
  if (seg === 'results') { key = 'build'; renderResults(root, nav); }
  else if (seg === 'recipe') { key = 'build'; renderDetail(root, decodeURIComponent(arg ?? '')); }
  else if (seg === 'saved') { key = 'saved'; renderSaved(root); }
  else if (seg === 'list') { key = 'list'; renderList(root); }
  else renderBuilder(root, nav);
  document.querySelectorAll('[data-route]').forEach((a) => (a.dataset.route === key ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  window.scrollTo(0, 0);
  root.focus({ preventScroll: true });
  document.title = `${{ build: 'Build', saved: 'Saved', list: 'Shopping list' }[key]} · BudgetBites`;
}

function counts() {
  for (const [id, n] of [['saved-count', getSaved().length], ['list-count', getList().filter((i) => !i.checked).length]]) {
    const el = document.getElementById(id); el.textContent = n; el.hidden = n === 0;
  }
}

onChange(counts); counts();
window.addEventListener('hashchange', route);
route();

fetchHealth().then((s) => {
  const b = document.getElementById('mode-banner');
  if (!s) return;
  if (s.mode === 'dev-mock') { b.textContent = 'Development mock mode: results come from local seed files, not a Sanity Knowledge Base.'; b.hidden = false; }
  else if (s.missing?.length) { b.textContent = `Not fully configured (missing: ${s.missing.join(', ')}). You can still use saved recipes and the shopping list.`; b.hidden = false; }
});
