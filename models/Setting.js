import mongoose from 'mongoose'
export default mongoose.model('Setting', new mongoose.Schema({
  key: { type: String, default: 'main', unique: true },
  lowStockThreshold: { type: Number, default: 3, min: 1 },
  shopName: { type: String, default: 'Mireille Shop' },
  whatsappNumber: { type: String, default: '' },
  shopAddress: { type: String, default: '' },
  deliveryInfo: { type: String, default: '' },
}, { timestamps: true }))
