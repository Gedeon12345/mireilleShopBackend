import Category from '../models/Category.js'
import Product from '../models/Product.js'
import { AppError, asyncHandler } from '../utils/AppError.js'
import { parse, categorySchema } from '../utils/validate.js'

const ci = { locale: 'fr', strength: 2 }
const assertUnique = async (name, exceptId) => {
  const dup = await Category.findOne({ name }).collation(ci)
  if (dup && String(dup._id) !== String(exceptId)) throw new AppError('Cette catégorie existe déjà.', 409)
}

export const listCategories = asyncHandler(async (req, res) => {
  const [cats, counts] = await Promise.all([
    Category.find({ isActive: true }).sort('name').lean(),
    Product.aggregate([{ $match: { isActive: true } }, { $group: { _id: '$category', n: { $sum: 1 } } }]),
  ])
  const by = Object.fromEntries(counts.map((c) => [String(c._id), c.n]))
  res.json(cats.map((c) => ({ ...c, __v: undefined, productCount: by[String(c._id)] || 0 })))
})

export const createCategory = asyncHandler(async (req, res) => {
  const d = parse(categorySchema, req.body)
  await assertUnique(d.name)
  res.status(201).json(await Category.create(d))
})

export const updateCategory = asyncHandler(async (req, res) => {
  const d = parse(categorySchema, req.body)
  const cat = await Category.findById(req.params.id)
  if (!cat) throw new AppError('Catégorie introuvable.', 404)
  await assertUnique(d.name, cat._id)
  Object.assign(cat, d)
  res.json(await cat.save())
})

// Archivage : les produits et leur historique sont conservés
export const archiveCategory = asyncHandler(async (req, res) => {
  const cat = await Category.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true })
  if (!cat) throw new AppError('Catégorie introuvable.', 404)
  res.json(cat)
})
