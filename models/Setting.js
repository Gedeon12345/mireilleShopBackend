import mongoose from 'mongoose'
export default mongoose.model('Setting', new mongoose.Schema({
  key: { type: String, default: 'main', unique: true },
  lowStockThreshold: { type: Number, default: 3, min: 1 },
}, { timestamps: true }))
