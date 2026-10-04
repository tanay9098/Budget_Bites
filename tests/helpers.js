import { startMockMcp, loadDir, MOCK_KB_ID } from '../server/dev/mock-mcp.js';
import { SanityContextClient } from '../server/mcp/client.js';
import { fixtureExtract } from '../server/agent/extractors/fixture.js';
import { runAgent } from '../server/agent/agent.js';

export const baseRequest = { diet: 'veg', budget: 30, servings: 2, mealType: 'lunch', maxMinutes: 60, cuisine: 'Any', ingredients: ['rice', 'onion'], equipment: ['gas stove', 'pressure cooker'], exclusions: [], preferences: {} };
export const fixedNow = new Date('2026-10-05T00:00:00Z');

export const doc = (path, title, prose, data, extraMeta = '') => ({ path, text: `---\ntitle: ${title}\nas_of: 2026-10-04\n${extraMeta}---\n# ${title}\n${prose}\n\n\`\`\`budgetbites-data\n${JSON.stringify(data)}\n\`\`\`\n` });

export async function withMock(entries, fn) {
  const mock = await startMockMcp({ entries });
  const client = new SanityContextClient({ url: mock.url, token: '', timeoutMs: 4000, allowLocal: true });
  try { await client.connect(); return await fn(client, mock); } finally { await client.close(); await mock.close(); }
}
export const seedEntries = () => loadDir(new URL('../knowledge-base/sources', import.meta.url).pathname);
export const agent = (client, request, extra = {}) => runAgent({ request, mcp: client, extractor: { extract: fixtureExtract }, config: { kbId: MOCK_KB_ID, maxDocs: 20 }, mode: 'dev-mock', now: fixedNow, ...extra });
