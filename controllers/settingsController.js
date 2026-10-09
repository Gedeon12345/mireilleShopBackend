import Setting from '../models/Setting.js'
import { asyncHandler } from '../utils/AppError.js'
import { parse, settingsSchema } from '../utils/validate.js'
import { getSettings } from '../services/settingsService.js'

const out = (s) => ({
  lowStockThreshold: s.lowStockThreshold, shopName: s.shopName, whatsappNumber: s.whatsappNumber,
  shopAddress: s.shopAddress, deliveryInfo: s.deliveryInfo,
})

export const getSettingsHandler = asyncHandler(async (req, res) => res.json(out(await getSettings())))

export const updateSettings = asyncHandler(async (req, res) => {
  const d = parse(settingsSchema, req.body)
  const s = await Setting.findOneAndUpdate({ key: 'main' }, { $set: d }, { upsert: true, new: true })
  res.json(out(s))
})
