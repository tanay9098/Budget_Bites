import test from 'node:test';
import assert from 'node:assert/strict';
import { parse, render } from '../scripts/fetch-prices.js';
import { buildDocument } from '../server/mcp/normalize.js';
import { resolveEvidence } from '../shared/evidence.js';
import { fixtureExtract } from '../server/agent/extractors/fixture.js';
import { buildPriceBook, ingredientCost } from '../shared/cost.js';

const page = (rows, date = '04/10/2026') => `<div>All India Average Retail Price(\u20b9/Kg) As on</div><div>${date}</div>` + Object.entries(rows).map(([k, v]) => `<td>${k}</td><td>${v}</td>`).join('') + '<div>All India Average Wholesale Price(\u20b9/Qtl.) As on</div><td>Rice</td><td>9999</td>';
const ROWS = { 'Rice': '45.87', 'Atta (Wheat)': '37.71', 'Tur/Arhar Dal': '124.82', 'Moong Dal': '110.57', 'Besan': '95.9', 'Potato': '21.47', 'Onion': '52.08', 'Tomato': '40.55', 'Salt Pack (Iodised)': '22.81', 'Soya Oil (Packed)': '166.6', 'Mustard Oil (Packed)': '202.03', 'Eggs': '82.95' };

test('price parser reads the retail table and date, ignoring the wholesale table', () => {
  const p = parse(page(ROWS));
  assert.equal(p.asOf, '2026-10-04'); assert.equal(p.rows['Rice'], '45.87'); assert.equal(p.rows['Besan'], '95.9');
});
test('layout changes fail loudly instead of producing wrong prices', () => {
  assert.throws(() => parse('<p>nothing here</p>'));
  assert.throws(() => render(parse(page({ Rice: '45.87' })), '2026-10-05'), /missing/);
});
test('generated sheet keeps source URL/date/region and every price quote verifies against its own prose', async () => {
  const md = render(parse(page(ROWS)), '2026-10-05');
  const d = buildDocument({ kbId: 'kb1', path: 'p.md' }, md);
  assert.equal(d.url, 'https://fcainfoweb.nic.in/'); assert.equal(d.date, '2026-10-04');
  const { prices } = await fixtureExtract({ docs: [d] });
  assert.equal(prices.length, 11);
  for (const pr of prices) { assert.ok(resolveEvidence(pr.evidence, [d]), pr.ingredient); assert.equal(pr.unit, 'kg'); assert.match(pr.region, /All India/); }
  assert.ok(!md.includes('| Eggs |'), 'ambiguous-unit items are not emitted as prices');
  const book = buildPriceBook(prices);
  assert.equal(ingredientCost({ qty: 100, unit: 'g' }, book.get('rice')).cost, 4.59);
});
