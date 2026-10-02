import Product from '../models/Product.js'
import StockMovement from '../models/StockMovement.js'
import { AppError, asyncHandler } from '../utils/AppError.js'
import { parse, adjustmentSchema } from '../utils/validate.js'
import { runTx } from '../utils/transaction.js'
import { getSettings } from '../services/settingsService.js'
import { sameVariant, totalStock } from '../services/stockService.js'

export const summary = asyncHandler(async (req, res) => {
  const { lowStockThreshold: th } = await getSettings()
  const products = await Product.find({ isActive: true }).lean()
  const refs = products.flatMap((p) => p.sizes.map((s) => s.quantity))
  res.json({
    totalStock: products.reduce((a, p) => a + totalStock(p), 0),
    productCount: products.length,
    lowStock: refs.filter((q) => q > 0 && q <= th).length,
    outOfStock: refs.filter((q) => q === 0).length,
    threshold: th,
  })
})

export const lowStock = asyncHandler(async (req, res) => {
  const { lowStockThreshold: th } = await getSettings()
  const products = await Product.find({ isActive: true }).lean()
  const items = products.flatMap((p) => p.sizes.filter((s) => s.quantity <= th).map((s) => ({
    product: p._id, productName: p.name, size: s.size, color: s.color, quantity: s.quantity, status: s.quantity === 0 ? 'out' : 'low',
  })))
  res.json(items.sort((a, b) => a.quantity - b.quantity))
})

export const movements = asyncHandler(async (req, res) => {
  const filter = req.query.product ? { product: req.query.product } : {}
  res.json(await StockMovement.find(filter).populate('product', 'name').sort('-createdAt').limit(200))
})

// Ajustement manuel (inventaire physique, casse, erreur…) : toujours tracé
export const adjustment = asyncHandler(async (req, res) => {
  const d = parse(adjustmentSchema, req.body)
  await runTx(async (session) => {
    const product = await Product.findOne({ _id: d.product, isActive: true }).session(session)
    if (!product) throw new AppError('Produit introuvable ou archivé.', 404)
    const v = product.sizes.find((s) => sameVariant(s, d.size, d.color))
    if (!v) throw new AppError('Pointure ou couleur introuvable pour ce produit.', 400)
    const prev = v.quantity
    await Product.updateOne({ _id: product._id }, { $set: { 'sizes.$[v].quantity': d.newQuantity } },
      { session, arrayFilters: [{ 'v.size': v.size, 'v.color': v.color }] })
    await StockMovement.create([{ product: product._id, size: v.size, color: v.color, type: 'adjustment', quantity: d.newQuantity - prev, previousQuantity: prev, newQuantity: d.newQuantity, reason: d.reason, createdBy: req.user._id }], { session })
  })
  res.json({ ok: true })
})
