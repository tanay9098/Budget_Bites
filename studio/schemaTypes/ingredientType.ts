import {defineField, defineType} from 'sanity'

export const ingredientType = defineType({
  name: 'ingredient',
  title: 'Ingredient',
  type: 'document',
  fields: [
    defineField({name: 'name', type: 'string', validation: (r) => r.required()}),
    defineField({name: 'aliases', title: 'Regional names', type: 'array', of: [{type: 'string'}]}),
    defineField({name: 'category', type: 'string', options: {list: ['veg', 'dairy', 'egg', 'meat', 'fish']}, validation: (r) => r.required()}),
    defineField({name: 'allergens', type: 'array', of: [{type: 'string'}], options: {list: ['soy', 'peanut', 'gluten', 'nuts', 'dairy', 'egg']}}),
    defineField({name: 'storage', type: 'text', rows: 2}),
    defineField({name: 'source', type: 'reference', to: [{type: 'source'}]}),
  ],
  preview: {select: {title: 'name', subtitle: 'category'}},
})
