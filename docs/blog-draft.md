# Building BudgetBites: a recipe agent that shows its sources (and refuses to guess)

*Draft — Sanity Challenge 2026, Path One: Build an Agent That Queries Real Content*

## The problem

Ask a search engine for "khichdi recipe" and you get a thousand results. Ask it for "₹30 per serving, vegetarian, I have rice and onions and a pressure cooker, some protein, no dairy" and you get nothing useful. That question isn't about one page. It's about relationships across documents: recipes, ingredient prices, diet rules, cookware techniques.

BudgetBites is my attempt at answering it for Indian college students and budget cooks. You enter a budget, a diet, a pantry, your equipment and your time. It returns recipes assembled from documents the agent retrieves at request time, each shown with where it came from.

## Why an agent, not a search box

The interesting part is what the agent *refuses* to do.

- **Budget is computed, not guessed.** Cost comes from price documents joined to recipe quantities: `price × used ÷ package`. If a recipe has unpriced ingredients it is never called "within budget". It says "cost incomplete".
- **Diet is checked by ingredient, not label.** Veg mode rejects egg and chicken by what's in the recipe, not by what the title claims.
- **Stale prices are estimates.** A price sheet from another year or region turns a "₹25" answer into an estimate with its date and region.
- **No invented substitutes.** If the knowledge base has no sourced substitution, the app says "no evidence-backed substitute" instead of making one up.
- **Disagreements stay visible.** If two retrieved sources conflict (soak the dal, or don't), both quotes are shown side by side and left unresolved.

## How it's built

```
Browser (HTML/CSS/vanilla JS)
   → Node backend (secrets live here only)
   → Recipe agent (outline → select → read → extract → verify → validate)
   → Sanity Context MCP client
   → Sanity Knowledge Base
```

Three design decisions did most of the work:

1. **The model only extracts; code decides.** The LLM pulls structured facts out of retrieved documents, each with a `{doc, quote}` pair. All arithmetic, diet checks, budget checks and time checks are plain, tested code shared by the server and the browser.
2. **Quotes must be verbatim.** The server drops any fact whose quote isn't found word for word in a document that was actually retrieved. A fabricated source can't reach the UI.
3. **Retrieved text is untrusted data.** It's delimited for the model, instruction-like text is flagged, and nothing in a document can change the agent's behaviour.

The stack is deliberately small: vanilla JS, Node built-ins, and one runtime dependency (`@modelcontextprotocol/sdk`).

## The content

The knowledge base holds real, sourced material: recipes transcribed from Hawkins cookbooks and published recipe pages, FSSAI veg/non-veg rules, pressure-cooker and induction technique notes, and all-India retail prices from the Department of Consumer Affairs. Provenance for every document is in `knowledge-base/SOURCES.md`.

## What I learned

- Putting the hard guarantees in code, and using the model only for extraction, made the system far easier to test. 59 tests cover cost math, diet rules, evidence checks, the MCP client and five end-to-end scenarios.
- "I don't know" is a feature. The most trustworthy screens are the ones that say a price is missing.
- Reading the official Sanity Context docs *after* my first build forced a rewrite of the MCP client. Read them first.

## Honest limitations

- The live Sanity Context endpoint and live model provider have not been tested end to end; the tests run against a local mock MCP server. (*Update this section once you've run `npm run test:live`.*)
- Prices cover only ten staples. Chicken, eggs, soy chunks and spices have no price source, so those recipes show partial costs.
- No nutrition values; "protein" is qualitative.
- Saved recipes and shopping lists live in the browser's `localStorage` only.

## Try it

Source and setup instructions: https://github.com/tanay9098/budget_bites

*(Add: screenshots of the builder, a results page with provenance chips, and the "considered but excluded" list; a link to the live demo; a short screen recording of Scenario A.)*
