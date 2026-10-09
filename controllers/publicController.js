import Product from '../models/Product.js'
import { AppError, asyncHandler } from '../utils/AppError.js'
import { getSettings } from '../services/settingsService.js'

const OBJECT_ID = /^[a-f\d]{24}$/i
const visible = { isActive: true, showOnline: { $ne: false } }   // $ne : les anciens produits sans le champ restent visibles
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Vue publique : disponibilité par pointure/couleur, JAMAIS les quantités
const toPublic = (p) => ({
  _id: p._id, name: p.name, gender: p.gender, price: p.price, description: p.description, image: p.image,
  category: p.category ? { _id: p.category._id, name: p.category.name } : null,
  variants: p.sizes.filter((s) => s.quantity > 0).map((s) => ({ size: s.size, color: s.color })),
})
const available = (p) => p.sizes.some((s) => s.quantity > 0)
const cache = (res) => res.set('Cache-Control', 'public, max-age=30')

export const publicProducts = asyncHandler(async (req, res) => {
  const { category, gender, q } = req.query
  const filter = { ...visible }
  if (typeof category === 'string' && OBJECT_ID.test(category)) filter.category = category
  if (['Homme', 'Femme', 'Enfant', 'Mixte'].includes(gender)) filter.gender = gender
  if (typeof q === 'string' && q.trim()) filter.name = { $regex: escapeRe(q.trim().slice(0, 60)), $options: 'i' }
  const list = await Product.find(filter).populate('category', 'name').sort('-createdAt').limit(300).lean()
  cache(res).json(list.filter(available).map(toPublic))
})

export const publicProduct = asyncHandler(async (req, res) => {
  if (!OBJECT_ID.test(req.params.id)) throw new AppError('Produit introuvable.', 404)
  const p = await Product.findOne({ _id: req.params.id, ...visible }).populate('category', 'name').lean()
  if (!p || !available(p)) throw new AppError('Produit introuvable.', 404)
  cache(res).json(toPublic(p))
})

export const publicCategories = asyncHandler(async (req, res) => {
  const list = await Product.find(visible).populate('category', 'name isActive').lean()
  const by = new Map()
  list.filter(available).forEach((p) => {
    if (!p.category || p.category.isActive === false) return
    const k = String(p.category._id)
    by.set(k, { _id: p.category._id, name: p.category.name, count: (by.get(k)?.count || 0) + 1 })
  })
  cache(res).json([...by.values()].sort((a, b) => a.name.localeCompare(b.name, 'fr')))
})

export const publicShop = asyncHandler(async (req, res) => {
  const s = await getSettings()
  cache(res).json({ shopName: s.shopName, whatsappNumber: s.whatsappNumber, shopAddress: s.shopAddress, deliveryInfo: s.deliveryInfo })
})
