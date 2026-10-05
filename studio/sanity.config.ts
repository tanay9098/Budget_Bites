import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {schemaTypes} from './schemaTypes'

// Authoring only. The BudgetBites agent never queries this dataset directly; it reads the Knowledge
// Base that Sanity builds from it, through Context MCP.
export default defineConfig({
  name: 'default',
  title: 'BudgetBites knowledge',
  projectId: process.env.SANITY_STUDIO_PROJECT_ID || 'your-project-id',
  dataset: process.env.SANITY_STUDIO_DATASET || 'production',
  plugins: [structureTool()],
  schema: {types: schemaTypes},
})
