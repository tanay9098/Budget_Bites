import {defineField, defineType} from 'sanity'

export const substitutionType = defineType({
  name: 'substitution',
  title: 'Substitution',
  type: 'document',
  fields: [
    defineField({name: 'from', type: 'reference', to: [{type: 'ingredient'}], validation: (r) => r.required()}),
    defineField({name: 'to', type: 'reference', to: [{type: 'ingredient'}], validation: (r) => r.required()}),
    defineField({name: 'preservesVegetarian', type: 'boolean', validation: (r) => r.required()}),
    defineField({name: 'changes', title: 'What changes (time, texture, allergens)', type: 'text', rows: 3}),
    defineField({name: 'source', type: 'reference', to: [{type: 'source'}], validation: (r) => r.required()}),
  ],
  preview: {select: {a: 'from.name', b: 'to.name'}, prepare: ({a, b}) => ({title: `${a} → ${b}`})},
})
