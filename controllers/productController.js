import Category from '../models/Category.js'
import Product from '../models/Product.js'
import StockMovement from '../models/StockMovement.js'
import { runTx } from '../utils/transaction.js'
import { AppError, asyncHandler } from '../utils/AppError.js'
import { parse, productSchema } from '../utils/validate.js'
import { uploadImage, deleteImage } from '../services/imageService.js'
import { variantKey } from '../services/stockService.js'

const parseBody = (req) => {
  const body = { ...req.body }
  if (typeof body.sizes === 'string') {
    try { body.sizes = JSON.parse(body.sizes) } catch { throw new AppError('Format des pointures invalide.') }
  }
  return parse(productSchema, body)
}
const assertCategory = async (id) => {
  const c = await Category.findById(id)
  if (!c || !c.isActive) throw new AppError('Catégorie introuvable ou archivée.', 400)
}
const withCategory = (p) => p.populate('category', 'name')

export const listProducts = asyncHandler(async (req, res) => {
  const wantsArchived = req.query.archived === 'true'
  if ((wantsArchived || req.query.all === 'true') && req.user.role !== 'admin') throw new AppError('Action réservée à la propriétaire.', 403)
  const filter = wantsArchived ? { isActive: false } : req.query.all === 'true' ? {} : { isActive: true }
  res.json(await Product.find(filter).populate('category', 'name').sort('-createdAt'))
})

export const getProduct = asyncHandler(async (req, res) => {
  const p = await Product.findById(req.params.id).populate('category', 'name')
  if (!p) throw new AppError('Produit introuvable.', 404)
  res.json(p)
})

export const createProduct = asyncHandler(async (req, res) => {
  const data = parseBody(req)
  await assertCategory(data.category)
  const img = req.file ? await uploadImage(req.file.buffer) : null
  let product
  try {
    product = await Product.create({ ...data, image: img?.url || '', imagePublicId: img?.publicId || '' })
  } catch (e) { await deleteImage(img?.publicId); throw e }
  const moves = product.sizes.filter((s) => s.quantity > 0).map((s) => ({
    product: product._id, size: s.size, color: s.color, type: 'initial', quantity: s.quantity,
    previousQuantity: 0, newQuantity: s.quantity, reason: 'Stock initial', createdBy: req.user._id,
  }))
  if (moves.length) await StockMovement.insertMany(moves)
  res.status(201).json(await withCategory(product))
})

export const updateProduct = asyncHandler(async (req, res) => {
  const data = parseBody(req)
  const product = await Product.findById(req.params.id)
  if (!product) throw new AppError('Produit introuvable.', 404)
  if (!product.isActive) throw new AppError('Ce produit est archivé.', 409)
  const seen = req.body.updatedAt
  if (seen && new Date(seen).getTime() !== product.updatedAt.getTime())
    throw new AppError('Ce produit a changé entre-temps (une vente ou un ajustement a eu lieu). Rouvrez la fiche et recommencez.', 409)
  await assertCategory(data.category)

  // Toute modification manuelle de quantité est tracée
  const old = new Map(product.sizes.map((s) => [variantKey(s), s.quantity]))
  const moves = []
  const push = (s, prev, now) => moves.push({
    product: product._id, size: s.size, color: s.color, type: 'adjustment', quantity: now - prev,
    previousQuantity: prev, newQuantity: now, reason: 'Modification de la fiche produit', createdBy: req.user._id,
  })
  for (const s of data.sizes) {
    const prev = old.get(variantKey(s)) ?? 0
    if (prev !== s.quantity) push(s, prev, s.quantity)
    old.delete(variantKey(s))
  }
  for (const [k, prev] of old) {
    if (prev > 0) { const [size, color] = k.split('|'); push({ size: Number(size), color: color.charAt(0).toUpperCase() + color.slice(1) }, prev, 0) }
  }

  const oldPublicId = product.imagePublicId
  if (req.file) {
    const img = await uploadImage(req.file.buffer)
    product.image = img.url; product.imagePublicId = img.publicId
  } else if (req.body.removeImage === 'true') {
    product.image = ''; product.imagePublicId = ''
  }
  Object.assign(product, data)
  await product.save()
  if (oldPublicId && oldPublicId !== product.imagePublicId) await deleteImage(oldPublicId)
  if (moves.length) await StockMovement.insertMany(moves)
  res.json(await withCategory(product))
})

// Jamais de suppression définitive : l'historique des ventes est préservé
export const archiveProduct = asyncHandler(async (req, res) => {
  const p = await Product.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true })
  if (!p) throw new AppError('Produit introuvable.', 404)
  res.json({ ok: true })
})

// Restauration d'un produit archivé
export const restoreProduct = asyncHandler(async (req, res) => {
  const p = await Product.findByIdAndUpdate(req.params.id, { isActive: true }, { new: true })
  if (!p) throw new AppError('Produit introuvable.', 404)
  res.json({ ok: true })
})

// Suppression définitive : propriétaire seulement, produit déjà archivé.
// Les ventes passées ne sont jamais modifiées : chacune garde sa propre copie du nom, de la pointure,
// de la couleur et du prix. Les mouvements de stock liés à une vente sont conservés (traçabilité).
export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
  if (!product) throw new AppError('Produit introuvable.', 404)
  if (product.isActive) throw new AppError('Archivez d’abord ce produit avant de le supprimer définitivement.', 409)
  await runTx(async (session) => {
    await StockMovement.deleteMany({ product: product._id, relatedSale: { $exists: false } }, { session })
    await Product.deleteOne({ _id: product._id }, { session })
  })
  await deleteImage(product.imagePublicId)
  res.json({ ok: true })
})
