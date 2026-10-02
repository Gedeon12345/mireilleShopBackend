import Product from '../models/Product.js'
import Sale from '../models/Sale.js'
import { asyncHandler } from '../utils/AppError.js'
import { getSettings } from '../services/settingsService.js'
import { startOfShopDay, totalStock } from '../services/stockService.js'

export const getDashboard = asyncHandler(async (req, res) => {
  const { lowStockThreshold: th } = await getSettings()
  const [products, today, latest] = await Promise.all([
    Product.find({ isActive: true }).populate('category', 'name').lean(),
    Sale.find({ status: 'completed', createdAt: { $gte: startOfShopDay() } }).lean(),
    Sale.find({ status: 'completed' }).sort('-createdAt').limit(5).lean(),
  ])
  const refs = products.flatMap((p) => p.sizes.map((s) => s.quantity))
  const by = {}
  products.forEach((p) => { const n = p.category?.name || 'Sans catégorie'; by[n] = (by[n] || 0) + totalStock(p) })

  res.json({
    totalStock: products.reduce((a, p) => a + totalStock(p), 0),
    productCount: products.length,
    soldToday: today.reduce((a, s) => a + s.items.reduce((x, i) => x + i.quantity, 0), 0),
    lowStock: refs.filter((q) => q > 0 && q <= th).length,
    outOfStock: refs.filter((q) => q === 0).length,
    byCategory: Object.entries(by).map(([name, quantity]) => ({ name, quantity })).sort((a, b) => b.quantity - a.quantity),
    latestSales: latest.map((s) => ({
      _id: s._id,
      productName: s.items.length > 1 ? `${s.items[0].productName} +${s.items.length - 1}` : s.items[0].productName,
      size: s.items[0].size, color: s.items[0].color,
      quantity: s.items.reduce((a, i) => a + i.quantity, 0), total: s.totalAmount, createdAt: s.createdAt,
    })),
  })
})
