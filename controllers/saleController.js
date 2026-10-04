import Product from '../models/Product.js'
import Sale from '../models/Sale.js'
import StockMovement from '../models/StockMovement.js'
import { AppError, asyncHandler } from '../utils/AppError.js'
import { parse, saleSchema } from '../utils/validate.js'
import { runTx } from '../utils/transaction.js'
import { nextSaleReference, sameVariant } from '../services/stockService.js'

const own = (req) => (req.user.role === 'admin' ? {} : { createdBy: req.user._id })

export const listSales = asyncHandler(async (req, res) => {
  res.json(await Sale.find(own(req)).sort('-createdAt').limit(500))
})

export const getSale = asyncHandler(async (req, res) => {
  const s = await Sale.findOne({ _id: req.params.id, ...own(req) })
  if (!s) throw new AppError('Vente introuvable.', 404)
  res.json(s)
})

// Création de la vente + déduction du stock dans UNE transaction.
// La déduction est conditionnelle (quantity >= demandé) : impossible de vendre plus que le stock,
// même si deux ventes arrivent en même temps.
export const createSale = asyncHandler(async (req, res) => {
  const { items } = parse(saleSchema, req.body)
  const reference = await nextSaleReference()

  const sale = await runTx(async (session) => {
    const lines = []
    const moves = []
    for (const it of items) {
      const product = await Product.findOne({ _id: it.product, isActive: true }).session(session)
      if (!product) throw new AppError('Produit introuvable ou désactivé.', 404)
      const v = product.sizes.find((s) => sameVariant(s, it.size, it.color))
      if (!v) throw new AppError('Pointure ou couleur introuvable pour ce produit.', 400)

      const r = await Product.updateOne(
        { _id: product._id, isActive: true },
        { $inc: { 'sizes.$[v].quantity': -it.quantity } },
        { session, arrayFilters: [{ 'v.size': v.size, 'v.color': v.color, 'v.quantity': { $gte: it.quantity } }] }
      )
      if (r.modifiedCount !== 1) throw new AppError(`Stock insuffisant : ${v.quantity} paire(s) disponible(s).`, 409)

      lines.push({ product: product._id, productName: product.name, size: v.size, color: v.color, quantity: it.quantity, unitPrice: product.price, total: it.quantity * product.price })
      moves.push({ product: product._id, size: v.size, color: v.color, type: 'sale', quantity: -it.quantity, previousQuantity: v.quantity, newQuantity: v.quantity - it.quantity, reason: 'Vente', createdBy: req.user._id })
    }
    const [doc] = await Sale.create([{
      reference, items: lines, totalAmount: lines.reduce((a, l) => a + l.total, 0),
      createdBy: req.user._id, createdByName: req.user.name,
    }], { session })
    await StockMovement.insertMany(moves.map((m) => ({ ...m, relatedSale: doc._id })), { session })
    return doc
  })
  res.status(201).json(sale)
})

// Annulation : le stock est restauré, la vente est conservée (statut "cancelled")
export const cancelSale = asyncHandler(async (req, res) => {
  const id = req.params.id
  await runTx(async (session) => {
    const sale = await Sale.findById(id).session(session)
    if (!sale) throw new AppError('Vente introuvable.', 404)
    if (sale.status !== 'completed') throw new AppError('Cette vente est déjà annulée.', 409)

    const moves = []
    for (const it of sale.items) {
      const product = await Product.findById(it.product).session(session)
      if (!product) continue
      const v = product.sizes.find((s) => sameVariant(s, it.size, it.color))
      const prev = v?.quantity ?? 0
      if (v) {
        await Product.updateOne({ _id: product._id }, { $inc: { 'sizes.$[v].quantity': it.quantity } },
          { session, arrayFilters: [{ 'v.size': v.size, 'v.color': v.color }] })
      } else {
        await Product.updateOne({ _id: product._id }, { $push: { sizes: { size: it.size, color: it.color, quantity: it.quantity } } }, { session })
      }
      moves.push({ product: product._id, size: it.size, color: it.color, type: 'sale_cancel', quantity: it.quantity, previousQuantity: prev, newQuantity: prev + it.quantity, reason: `Annulation ${sale.reference}`, relatedSale: sale._id, createdBy: req.user._id })
    }
    sale.status = 'cancelled'
    sale.cancelledAt = new Date()
    sale.cancelledBy = req.user._id
    await sale.save({ session })
    if (moves.length) await StockMovement.insertMany(moves, { session })
  })
  res.json(await Sale.findById(id))
})
