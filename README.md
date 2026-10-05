# BudgetBites

**Eat better. Spend less. Cook smarter.**
Sanity Challenge 2026 — **Path One: Build an Agent That Queries Real Content.**

BudgetBites helps Indian college students and budget-conscious cooks build practical meals that fit a per-serving budget (₹), diet (Veg / Non-Veg), pantry, equipment and time. Every recommendation is assembled from documents the agent retrieves at request time through a **Sanity Context MCP** endpoint, and shown with its sources.

> **Status, plainly:** the app, MCP client, agent, validation and tests are implemented and pass against a *local mock MCP server*. **The live Sanity Context endpoint and the live model provider have NOT been tested** — no credentials or Knowledge Base were available. The MCP client was aligned with the official Sanity Context docs (read after the first build; see below), but that alignment is from documentation, not from a live call. See [Known limitations](#known-limitations).

## Why this is a Path One agent, not a recipe search

Keyword search can answer "khichdi recipe". It cannot answer "₹30, I have rice and onions and a pressure cooker, veg, some protein, no dairy" because that needs *relationships and conditions across documents*:

| Decision | What structured retrieval changes |
|---|---|
| Budget | Cost comes from **price documents** joined to **recipe quantities**, via `price × used ÷ package`. A cheaper-looking recipe is rejected if a price makes it ₹36/serving. |
| Substitution | "Out of moong dal?" → the substitution guide says toor dal works but needs ~4 whistles; "out of tomato?" → no evidence, so the agent *says so* rather than inventing. |
| Diet | Veg mode rejects egg/chicken by **ingredient**, not by the recipe's label; substitution candidates are re-checked (paneer fails a dairy exclusion). |
| Freshness | A price dated 2024 from Mumbai makes a "₹25" answer an **estimate with its date and region**, never a promise. |
| Conflicts | If two retrieved sources disagree (e.g. soak dal vs. don't), both quotes are shown side by side, attributed, and left **unresolved** unless evidence settles it. |

## Architecture

```
Browser (HTML/CSS/vanilla JS)
   │  POST /api/recipes  (NDJSON progress stream)
   ▼
Node backend (built-ins; secrets live here only)
   │  rate limit · size limit · strict request validation
   ▼
Recipe agent ── model provider (Anthropic, optional layer: select + extract)
   │   1 outline  2 select  3 read  4 extract  5 verify quotes  6 targeted re-read  7 validate
   ▼
Sanity Context MCP client (@modelcontextprotocol/sdk, Streamable HTTP, Bearer org token)
   │  tools: initial_context, knowledge_base_read
   ▼
Sanity Knowledge Base (compiled entries + citations to sources)
```

Separation of concerns: `public/` UI · `server/agent/` orchestration · `server/mcp/` Sanity connectivity · `shared/` deterministic cost/diet/validation (used by server **and** browser) · `public/js/store.js` local saves/lists.

How the evidence rules work:
1. The model only **extracts** structured facts; each carries `{doc, quote}`.
2. The server drops anything whose quote is not found **verbatim in the prose** of a document that was actually retrieved (`shared/evidence.js`, `server/agent/verify.js`). Fabricated sources cannot reach the UI.
3. Cost, diet, budget, equipment, time and quantity checks are plain code (`shared/*.js`), never LLM arithmetic.
4. Retrieved text is data only: it is delimited as untrusted for the model, instruction-like text is flagged, and nothing in it can change behaviour.
5. A bounded second retrieval (≤4 extra entries, once) happens if prices or recipes are missing.

## Authoring (optional)
See [`studio/`](studio/README.md): a course-style Sanity Studio schema (sources, ingredients, dated prices, recipes, substitutions, guidance) for maintaining the corpus with required provenance. Authoring is separate from retrieval.

## Stack
HTML5 · CSS3 · vanilla JS (ES modules, no framework, no CSS framework) · Node ≥ 20 built-ins · `@modelcontextprotocol/sdk` (only runtime dependency) · Anthropic Messages API via `fetch` · `node:test`.

## Run it

```bash
npm install
cp .env.example .env     # fill in live values, or use dev mock below
npm start                # http://localhost:3000   (reads real environment variables; export them or use a process manager)
```
The server reads `process.env` directly (no dotenv dependency). e.g. `set -a; source .env; set +a; npm start`.

### Without credentials: development mock mode
```bash
npm run start:mock       # BUDGETBITES_DEV_MOCK=1
```
Starts a local MCP server (real MCP protocol) over `knowledge-base/sources/` and a rule-based extractor instead of a model. A banner and `mode: "dev-mock"` label every response. **It is not Sanity** and is never enabled automatically: with `BUDGETBITES_DEV_MOCK` unset and credentials missing, `/api/recipes` returns `503 not_configured`.

### Environment variables (`.env.example`)
| Variable | Required (live) | Purpose |
|---|---|---|
| `SANITY_CONTEXT_MCP_URL` | yes | `https://api.sanity.io/v1/context/organizations/<orgId>/mcp/<endpointName>` (must be https `*.sanity.io`) |
| `SANITY_ORG_API_TOKEN` | yes | Organization token, Context Viewer permission. Server-side only |
| `ANTHROPIC_API_KEY` | yes | Model provider key. Server-side only |
| `SANITY_KNOWLEDGE_BASE_ID` | no | Limit to one KB (`kb…`) |
| `ANTHROPIC_MODEL`, `ANTHROPIC_BASE_URL` | no | Model selection / proxy |
| `PORT`, `MCP_TIMEOUT_MS`, `MODEL_TIMEOUT_MS`, `MCP_MAX_DOCS`, `RATE_LIMIT_PER_MINUTE` | no | Tuning |
| `BUDGETBITES_DEV_MOCK` | dev only | `1` enables the mock described above |

### Configure Sanity Context and the Knowledge Base
See [`knowledge-base/README.md`](knowledge-base/README.md) for the corpus and (unverified) import steps. Then verify the real integration:
```bash
npm run test:live        # connects, lists tools + input schemas, reads the outline and one entry
```
What the client implements, per the official docs ([Context MCP tools](https://www.sanity.io/docs/ai/sanity-context-mcp-tools), [Knowledge Bases](https://www.sanity.io/docs/ai/sanity-context-knowledge-bases), [Create a Knowledge Base](https://www.sanity.io/docs/ai/sanity-context-create-knowledge-base), [Content access and security](https://www.sanity.io/docs/ai/sanity-context-security)):
- Bearer **organization** token (Context Viewer); project tokens are refused by Sanity. 401/403/502 map to safe messages.
- `initial_context` → outline in the documented text format (`path [core]` + indented summary, under a `Knowledge base id: kb…` line). `[core]` entries are read first when truncating.
- `knowledge_base_read` with `{ knowledgeBase, paths }` (≤20 paths allowed; this client reads one path per call so content can never be attributed to the wrong entry).
- `SANITY_KNOWLEDGE_BASE_ID` adds `?mode=knowledge_base&knowledgeBases=kb…` to the URL. Not needed if every source on the MCP is a Knowledge Base.

Still unconfirmed until `npm run test:live` runs against a real build: the exact layout of an entry returned by `knowledge_base_read` (citations are read from markdown links and `source_url` front matter if present).

## Demonstrating the scenarios
Automated (mock content): `npm test` runs Scenarios A–E in `tests/mcp-agent.test.js`. Interactively (after seeding your KB):
- **A** Veg · ₹30 · Rice, Onion · Pressure cooker · "Higher protein" → khichdi/dal-rice rank above pulao; pulao notes low protein; chicken curry listed under "Considered but excluded" for budget.
- **B** Open khichdi → "Need to buy" moong dal shows the toor-dal swap with its source; tomato shows "no evidence-backed substitute". With "Avoid dairy", a paneer swap for eggs is marked ✗.
- **C** Add two genuinely disagreeing sources to your KB; the results page shows a side-by-side conflict card labelled *agent-detected*; your pick is stored **in this browser only**.
- **D** Use ₹25 with an old/other-region price sheet → cost shows *Estimate*, with price date, region and freshness in the breakdown.
- **E** Veg mode, or exclude Egg in Non-Veg → bhurji is rejected with the reason.

## Tests
```bash
npm test
```
Actual result at the time of writing: **52 tests, 52 passing, 0 failing** (units/cost, diet/validation, evidence/provenance/conflict formatting, MCP client against a local mock server incl. auth failure/timeout/empty/malformed responses, agent scenarios A–E, prompt-injection handling, API validation/rate-limit/size-limit/path-traversal). These use a **mock MCP server**; they are *not* a live Sanity test. `npm run test:live` is the live test and **has not been run**.

Browser checks (Playwright + Chromium, dev-mock mode): build → results → detail (serving scaling) → save → add to shopping list → saved/list views worked, no horizontal overflow at 320, 375, 430, 768, 1024, 1440 px for builder/results/saved/list/detail, no console errors other than the blocked Google Fonts request in the sandbox.

## Saved recipes and shopping list
Stored in `localStorage` — **this device and browser only, no sync**; clearing site data deletes them. They work without the backend. Items merge by name and unit dimension (g/kg, ml/l/tsp/tbsp/cup, pieces); an estimated shopping cost is shown only for items with a usable price.

## Deployment
Any Node ≥ 20 host: set the environment variables as secrets, `npm ci --omit=dev && npm start`, put it behind HTTPS. The in-memory rate limiter is per-process (use a proxy/WAF limiter for multi-instance). Never commit `.env`.

## Known limitations
- **Live Sanity Context and live model: untested.** Outline format, tool names and arguments follow the official docs; entry layout and real error shapes are unconfirmed.
- **Sanity raises Knowledge Base "Issues" (conflicts between sources) during a build; they are resolved in the Dashboard and baked into entries via instructions.** The docs list no MCP tool for reading Issues, so this app cannot show them. The conflicts it displays are *agent-detected* disagreements between entries it actually retrieved, and local choices are not written back to Sanity.
- Document cap: the challenge brief states 150 documents; the docs pages I read say only that Knowledge Base limits are beta and may change (dataset source: 5,000 documents).
- **Corpus is seed content with placeholder prices and no real source URLs** (see `knowledge-base/README.md`). Real answers need real, dated, sourced documents indexed in a Knowledge Base.
- No nutrition values are produced (the corpus has none); "protein" is qualitative (pulses/soy/egg/meat present).
- Design: only one design PDF (the design system: tokens, buttons, form controls, chips, badges, provenance chips) was supplied; there were no screen mockups. Screens were composed from those components. Illustrations are emoji placeholders; recipe-image assets were not provided. Fonts load from Google Fonts (falls back to system fonts).
- The Sanity conflict-resolution/Dashboard write is not used. Conflict choices are local-only.
- No keyboard/screen-reader audit beyond semantic markup, ARIA roles, focus rings and live regions; no automated contrast tooling was run (palette uses the design system's accessible text shades).
- Rate limiting is in-memory and per-IP.
