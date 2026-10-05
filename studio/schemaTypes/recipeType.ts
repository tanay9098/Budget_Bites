import {defineArrayMember, defineField, defineType} from 'sanity'

export const recipeType = defineType({
  name: 'recipe',
  title: 'Recipe',
  type: 'document',
  fields: [
    defineField({name: 'name', type: 'string', validation: (r) => r.required()}),
    defineField({name: 'cuisine', type: 'string'}),
    defineField({name: 'meals', type: 'array', of: [{type: 'string'}], options: {list: ['breakfast', 'lunch', 'dinner', 'snack']}}),
    defineField({name: 'servingsBase', title: 'Serves', type: 'number', validation: (r) => r.required().integer().min(1)}),
    defineField({name: 'prepMinutes', type: 'number', validation: (r) => r.min(0)}),
    defineField({name: 'cookMinutes', type: 'number', validation: (r) => r.min(0)}),
    defineField({name: 'equipment', type: 'array', of: [{type: 'string'}], options: {list: ['stove', 'pressure cooker', 'microwave', 'tawa', 'pan']}}),
    defineField({
      name: 'ingredients',
      type: 'array',
      validation: (r) => r.required().min(1),
      of: [
        defineArrayMember({
          type: 'object',
          name: 'line',
          fields: [
            defineField({name: 'ingredient', type: 'reference', to: [{type: 'ingredient'}], validation: (r) => r.required()}),
            defineField({name: 'qty', type: 'number', validation: (r) => r.required().greaterThan(0)}),
            defineField({name: 'unit', type: 'string', options: {list: ['g', 'kg', 'ml', 'l', 'tsp', 'tbsp', 'cup', 'pc']}, validation: (r) => r.required()}),
            defineField({name: 'optional', type: 'boolean', initialValue: false}),
          ],
          preview: {select: {title: 'ingredient.name', qty: 'qty', unit: 'unit'}, prepare: ({title, qty, unit}) => ({title, subtitle: `${qty} ${unit}`})},
        }),
      ],
    }),
    defineField({name: 'steps', type: 'array', of: [{type: 'text', rows: 2}], validation: (r) => r.required().min(1)}),
    defineField({name: 'source', type: 'reference', to: [{type: 'source'}], validation: (r) => r.required()}),
  ],
  preview: {select: {title: 'name', subtitle: 'cuisine'}},
})
