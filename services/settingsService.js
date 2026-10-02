import Setting from '../models/Setting.js'

export const getSettings = () =>
  Setting.findOneAndUpdate({ key: 'main' }, { $setOnInsert: { key: 'main', lowStockThreshold: 3 } }, { upsert: true, new: true })
