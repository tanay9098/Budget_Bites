import {defineField, defineType} from 'sanity'

export const sourceType = defineType({
  name: 'source',
  title: 'Source',
  type: 'document',
  description: 'Where a fact came from. Every other document points at one, so provenance survives into the Knowledge Base.',
  fields: [
    defineField({name: 'title', type: 'string', validation: (r) => r.required()}),
    defineField({name: 'publisher', type: 'string'}),
    defineField({name: 'url', type: 'url', validation: (r) => r.uri({scheme: ['http', 'https']})}),
    defineField({name: 'retrievedAt', title: 'Date retrieved', type: 'date', validation: (r) => r.required()}),
    defineField({name: 'region', type: 'string', description: 'City/state the data refers to, if any.'}),
  ],
  preview: {select: {title: 'title', subtitle: 'publisher'}},
})
