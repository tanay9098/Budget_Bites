# BudgetBites source corpus

`sources/` holds 14 markdown documents (limit for a Sanity Knowledge Base is currently ~150 documents; this uses 14):

| Type | Files |
|---|---|
| Recipes (6 veg/non-veg) | `recipe-*.md` |
| Price sheets | `prices-staples.md`, `prices-produce-protein.md` |
| Substitutions | `substitutions.md` |
| Techniques & safety | `technique-pressure-cooker.md`, `technique-induction.md` |
| Dietary classification | `dietary-rules.md` |
| Budget & uncertainty rules | `budget-rules.md` |

## Honest status of this content

- These are **author-written seed documents**. They are *not* copied from independent published sources and have **no original URLs**. The app therefore shows "No original URL was returned" for them.
- **All prices are placeholders** (`placeholder: true`, region "unspecified"). The app flags every cost derived from them as an estimate. Replace `prices-*.md` with dated, sourced, city-specific prices (e.g. from a government consumer-price portal or a retailer listing, with a `source_url` in the front matter) before relying on any budget answer.
- No contradictory documents are shipped. Conflict handling is exercised only in automated tests (`tests/mcp-agent.test.js`, Scenario C). When two real sources you add disagree, the agent surfaces it.

## Document format

Front matter keys the app understands: `title`, `source_title`, `source_url`, `as_of`, `version`, `status`. The fenced ```` ```budgetbites-data ```` blocks are used only by the dev-mock extractor; the live model extracts from the prose (recipes list quantities, price sheets are tables), and every extracted fact must be backed by a verbatim quote from the *prose*.

To make the corpus richer, add real sources: each recipe/price/technique should carry `source_url` and `as_of`. Sanity compiles Knowledge Base entries with citations back to sources; the app preserves any markdown links and `source_url` it receives.

## Getting this into Sanity (per the official docs)

Source: [Create a Knowledge Base](https://www.sanity.io/docs/ai/sanity-context-create-knowledge-base), [source types](https://www.sanity.io/docs/ai/sanity-context-source-types), [Knowledge Bases](https://www.sanity.io/docs/ai/sanity-context-knowledge-bases), [Configure an MCP](https://www.sanity.io/docs/ai/sanity-context-configure-mcp). Not yet executed by this repo's author.

1. An organization admin enables Context on the [Labs page](https://www.sanity.io/manage/org/labs) (Knowledge Bases are an opt-in **beta**).
2. Dashboard → **Context → New knowledge base**. Title: `BudgetBites`. Purpose (steers the outline and which entries are `[core]`), for example: *"Budget-conscious Indian students and home cooks. Covers affordable vegetarian and non-vegetarian recipes, dated ingredient prices, substitutions, pressure-cooker and induction safety, and dietary and budget rules."*
3. **Add source → Files**: upload `sources/*.md` (Markdown is ingested directly; uploaded files never re-sync, so to change one delete the import and re-upload). *Or*, better for provenance and updates, author in the Studio ([`studio/`](../studio/README.md)) and add a **Dataset** source with the GROQ query given there.
4. Click **Build entries**; wait for **Entries up to date**. Review **Entries** and resolve **Issues**. Entries are rewritten by each build and cannot be hand-edited: to change an answer, change the source or add an instruction.
5. **Context → create an MCP** whose sources are the Knowledge Base (an endpoint with only Knowledge Base sources serves Knowledge Base tools automatically). Copy the endpoint URL (`https://api.sanity.io/v1/context/organizations/<orgId>/mcp/<endpointName>`).
6. Create an **organization** API token with Context Viewer permission (Manage → API → Tokens, organization level).
7. Set `SANITY_CONTEXT_MCP_URL`, `SANITY_ORG_API_TOKEN`, `ANTHROPIC_API_KEY`, then `npm run test:live`.

Because Sanity compiles entries from these sources, wording may change and the `budgetbites-data` blocks are not preserved: the live agent works from the compiled prose and only keeps facts it can quote verbatim from it.

No Knowledge Base has been created or indexed by this repository's author; no Knowledge Base id exists in this repo.
