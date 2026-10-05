import {defineField, defineType} from 'sanity'

export const priceEntryType = defineType({
  name: 'priceEntry',
  title: 'Price entry',
  type: 'document',
  description: 'A dated package price. Cost per recipe = packagePrice × quantity used ÷ packageQty (computed by the app, never by the model).',
  fields: [
    defineField({name: 'ingredient', type: 'reference', to: [{type: 'ingredient'}], validation: (r) => r.required()}),
    defineField({name: 'packagePrice', title: 'Package price (₹)', type: 'number', validation: (r) => r.required().min(0)}),
    defineField({name: 'packageQty', title: 'Package quantity', type: 'number', validation: (r) => r.required().greaterThan(0)}),
    defineField({name: 'unit', type: 'string', options: {list: ['g', 'kg', 'ml', 'l', 'pc']}, validation: (r) => r.required()}),
    defineField({name: 'region', type: 'string', validation: (r) => r.required()}),
    defineField({name: 'asOf', title: 'Price date', type: 'date', validation: (r) => r.required()}),
    defineField({name: 'source', type: 'reference', to: [{type: 'source'}], validation: (r) => r.required()}),
  ],
  preview: {select: {title: 'ingredient.name', subtitle: 'asOf'}},
})
