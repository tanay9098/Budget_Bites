import {defineField, defineType} from 'sanity'

// Techniques, safety precautions, dietary rules and budget rules share one shape.
export const guidanceType = defineType({
  name: 'guidance',
  title: 'Guidance (technique, safety, diet, budget rule)',
  type: 'document',
  fields: [
    defineField({name: 'title', type: 'string', validation: (r) => r.required()}),
    defineField({name: 'kind', type: 'string', options: {list: ['technique', 'safety', 'dietary-rule', 'budget-rule']}, validation: (r) => r.required()}),
    defineField({name: 'appliesWhen', title: 'Applies when', type: 'text', rows: 2, description: 'Conditions under which this guidance is appropriate.'}),
    defineField({name: 'body', type: 'text', rows: 8, validation: (r) => r.required()}),
    defineField({name: 'source', type: 'reference', to: [{type: 'source'}], validation: (r) => r.required()}),
  ],
  preview: {select: {title: 'title', subtitle: 'kind'}},
})
