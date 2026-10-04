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

## Getting this into Sanity (UNVERIFIED steps)

The sandbox this was built in could not open sanity.io, so these steps follow search-result summaries of the docs, not the pages themselves. Follow the current official docs:
<https://www.sanity.io/docs/ai/sanity-context-create-knowledge-base> and <https://www.sanity.io/docs/ai/sanity-context-source-types>.

1. In Sanity, create a Knowledge Base and attach `sources/*.md` as sources (or import them as documents in a dataset and attach those, as the source-type docs allow).
2. Wait for indexing, then create/configure a **Context MCP endpoint** that serves the Knowledge Base (`{"type":"knowledge-base","id":"kb..."}`).
3. Create an **organization-level** API token with **Context Viewer** permission (project tokens are rejected).
4. Put the endpoint URL and token in `.env`, then run `npm run test:live`.

Nothing has been indexed by this repository's author; no Knowledge Base id exists in this repo.
