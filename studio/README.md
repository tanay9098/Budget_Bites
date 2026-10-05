# BudgetBites Studio (optional authoring path)

A Sanity Studio workspace, set up the way the *Day one with Sanity Studio* course teaches (`schemaTypes/` with `defineType`/`defineField`, `sanity.config.ts`, `sanity.cli.ts`). It lets editors maintain the corpus as **structured documents** with required provenance, instead of loose markdown.

**Authoring is not retrieval.** The Studio writes to a dataset. The BudgetBites agent never queries that dataset; it reads the *Knowledge Base* Sanity builds from it, through Context MCP (`initial_context`, `knowledge_base_read`).

## Types
`source` (title, publisher, url, date retrieved, region) · `ingredient` · `priceEntry` (price, package qty, unit, region, **date**, required source) · `recipe` · `substitution` · `guidance` (technique / safety / dietary-rule / budget-rule). Every fact document requires a `source` reference, so provenance can flow into the build.

## Run
```bash
cd studio && npm install
export SANITY_STUDIO_PROJECT_ID=<your project id> SANITY_STUDIO_DATASET=production
npm run dev            # http://localhost:3333 (log in as in the course)
npm run build          # verified: builds successfully
npm run typecheck      # verified: passes
```
Per the docs, deploy the schema with `sanity schema deploy` (Studio ≥ 5.1.0) if an MCP endpoint will have a dataset source.

## Use it as a Knowledge Base source
In the Dashboard → Context → your Knowledge Base → **Add source → Dataset**, pick this dataset and give a complete GROQ query with a projection (a bare filter is rejected; max 5,000 documents; published documents only). Example that resolves references so provenance travels with each fact:

```groq
*[_type in ["recipe","priceEntry","substitution","guidance"]]{
  _type, name, title, kind, body, appliesWhen, cuisine, meals, servingsBase, prepMinutes, cookMinutes, equipment, steps,
  ingredients[]{qty, unit, optional, "ingredient": ingredient->{name, aliases, category, allergens}},
  "ingredient": ingredient->{name, aliases, category, allergens},
  packagePrice, packageQty, unit, region, asOf, preservesVegetarian, changes,
  "from": from->name, "to": to->name,
  "source": source->{title, publisher, url, retrievedAt, region}
}
```
This query has **not** been run against a real dataset by the author.
