// Builds knowledge-base/sources/prices-dca-all-india-retail.md from the Department of Consumer Affairs
// Price Monitoring System home page (https://fcainfoweb.nic.in/), which publishes "All India Average
// Retail Price (Rs/Kg)" without login or CAPTCHA.
//
//   node scripts/fetch-prices.js                 # fetch live (needs outbound HTTPS)
//   node scripts/fetch-prices.js saved-home.html # parse a page you saved yourself
//
// Only commodities whose unit is unambiguous (Rs/kg of a single product) are emitted. Items the page
// lists under the same "Rs/Kg" heading but whose figures are not plausibly per-kg (eggs, spices) are
// deliberately left out rather than guessed.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const URL_ = 'https://fcainfoweb.nic.in/';
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../knowledge-base/sources/prices-dca-all-india-retail.md');

// DoCA label -> { name used by recipes, aliases }
const USE = {
  'Rice': { name: 'rice' },
  'Atta (Wheat)': { name: 'atta', aliases: ['wheat flour'] },
  'Tur/Arhar Dal': { name: 'toor dal', aliases: ['tur dal', 'arhar dal'] },
  'Moong Dal': { name: 'moong dal' },
  'Besan': { name: 'besan', aliases: ['gram flour'] },
  'Potato': { name: 'potato' },
  'Onion': { name: 'onion' },
  'Tomato': { name: 'tomato' },
  'Salt Pack (Iodised)': { name: 'salt' },
  'Soya Oil (Packed)': { name: 'cooking oil', aliases: ['oil', 'soya oil'] },
};
const NOT_USED = { 'Eggs': 'unit not stated (per dozen or per kg) so it cannot be converted per egg', 'Turmeric (powder)': 'figure is not plausible as Rs/kg and the page states no unit', 'Cummin Seed (whole)': 'figure is not plausible as Rs/kg and the page states no unit', 'Red Chillies (whole)': 'unit not stated', 'Ginger': 'not used by current recipes', 'Garlic': 'not used by current recipes' };

export function parse(html) {
  const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, '\n').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const i = lines.findIndex((l) => /^All India Average Retail Price\(.*\) As on$/i.test(l));
  if (i < 0) throw new Error('Retail price section not found; the page layout may have changed.');
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(lines[i + 1]);
  if (!m) throw new Error('Price date not found.');
  const asOf = `${m[3]}-${m[2]}-${m[1]}`;
  const end = lines.findIndex((l, k) => k > i && /^All India Average Wholesale Price/i.test(l));
  const rows = {};
  for (let k = i + 2; k < (end < 0 ? lines.length : end) - 1; k++) {
    if (/^\d+(\.\d+)?$/.test(lines[k + 1]) && !/^\d+(\.\d+)?$/.test(lines[k]) && !/^All India/.test(lines[k])) rows[lines[k]] = lines[k + 1];
  }
  return { asOf, rows };
}

export function render({ asOf, rows }, retrievedAt) {
  const used = Object.entries(USE).filter(([label]) => rows[label] != null);
  const missing = Object.keys(USE).filter((l) => rows[l] == null);
  if (missing.length) throw new Error(`Expected commodities missing from the page: ${missing.join(', ')}`);
  const fmt = (v) => Number(v).toFixed(2);
  const region = 'All India (average over the reporting market centres)';
  const table = used.map(([label]) => `| ${label} | ${fmt(rows[label])} |`);
  const prices = used.map(([label, u]) => ({ ingredient: u.name, ...(u.aliases ? { aliases: u.aliases } : {}), packagePrice: Number(rows[label]), packageQty: 1, unit: 'kg', region, asOf, evidenceQuote: `| ${label} | ${fmt(rows[label])} |` }));
  const skipped = Object.entries(NOT_USED).filter(([k]) => rows[k] != null).map(([k, why]) => `- ${k}: ${why}.`);
  return `---
title: All India average retail prices, Department of Consumer Affairs (${asOf})
doc_type: price_sheet
status: sourced
source_title: Price Monitoring System, Department of Consumer Affairs, Government of India - All India Average Retail Price (Rs/Kg)
source_url: ${URL_}
as_of: ${asOf}
retrieved: ${retrievedAt}
region: ${region}
---
# All India average retail prices - Department of Consumer Affairs, ${asOf}

Source: the Price Monitoring System of the Department of Consumer Affairs, Government of India ([fcainfoweb.nic.in](${URL_})), table "All India Average Retail Price (Rs/Kg)" as on ${asOf}, retrieved ${retrievedAt}.

How to read these prices:
- They are national averages of daily retail prices reported by the Price Monitoring Division's market centres, in rupees per kilogram. They are not the price at any particular shop or city, so a student's real cost can be higher or lower.
- The quality and variety reported can differ between centres, though it stays the same for a given centre.
- Price data reported on weekends and holidays is provisional until verified on the next working day.
- Prices change daily. This sheet is a snapshot dated ${asOf}.
- BudgetBites uses the "Soya Oil (Packed)" price as its generic cooking oil. The same source lists other packed oils separately, at different prices.
- Cooking oil is priced per kilogram, so recipes list oil by weight (about 2 teaspoons is roughly 10 g).

Price in rupees per kg:

| Commodity (as reported) | Rs per kg |
|---|---|
${table.join('\n')}

Not used, and why:
${skipped.join('\n')}
- Chicken, soy chunks, paneer and green chilli are not among the commodities this source monitors, so no price is available for them here.

\`\`\`budgetbites-data
${JSON.stringify({ type: 'prices', prices })}
\`\`\`
`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const html = process.argv[2] ? await readFile(process.argv[2], 'utf8') : await (await fetch(URL_, { signal: AbortSignal.timeout(30000) })).text();
  const doc = render(parse(html), new Date().toISOString().slice(0, 10));
  await writeFile(OUT, doc);
  console.log(`Wrote ${OUT}`);
}
