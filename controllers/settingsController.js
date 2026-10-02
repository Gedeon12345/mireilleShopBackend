import Setting from '../models/Setting.js'
import { asyncHandler } from '../utils/AppError.js'
import { parse, settingsSchema } from '../utils/validate.js'
import { getSettings } from '../services/settingsService.js'

export const getSettingsHandler = asyncHandler(async (req, res) => {
  res.json({ lowStockThreshold: (await getSettings()).lowStockThreshold })
})
export const updateSettings = asyncHandler(async (req, res) => {
  const d = parse(settingsSchema, req.body)
  const s = await Setting.findOneAndUpdate({ key: 'main' }, { $set: d }, { upsert: true, new: true })
  res.json({ lowStockThreshold: s.lowStockThreshold })
})
