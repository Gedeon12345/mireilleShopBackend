import Counter from '../models/Counter.js'

export const sameVariant = (v, size, color) => v.size === size && v.color.toLowerCase() === String(color).toLowerCase()
export const variantKey = (v) => `${v.size}|${v.color.toLowerCase()}`

export const nextSaleReference = async () => {
  const c = await Counter.findOneAndUpdate({ _id: 'sale' }, { $inc: { seq: 1 } }, { upsert: true, new: true })
  return `VT-${String(c.seq).padStart(4, '0')}`
}

export const totalStock = (p) => p.sizes.reduce((a, s) => a + s.quantity, 0)

// Début de la journée dans le fuseau de la boutique (par défaut UTC+1, Douala)
export const startOfShopDay = () => {
  const off = (Number(process.env.TZ_OFFSET_MINUTES) || 0) * 60000
  const day = 86400000
  return new Date(Math.floor((Date.now() + off) / day) * day - off)
}
