import {defineCliConfig} from 'sanity/cli'

// Set these in your shell or .env for the Studio (they are public identifiers, not secrets).
export default defineCliConfig({
  api: {projectId: process.env.SANITY_STUDIO_PROJECT_ID, dataset: process.env.SANITY_STUDIO_DATASET || 'production'},
})
