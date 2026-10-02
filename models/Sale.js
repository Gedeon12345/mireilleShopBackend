import mongoose from 'mongoose'
const { ObjectId } = mongoose.Schema.Types

const itemSchema = new mongoose.Schema({
  product: { type: ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  size: { type: Number, required: true },
  color: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true },   // prix figé au moment de la vente
  total: { type: Number, required: true },
}, { _id: false })

const saleSchema = new mongoose.Schema({
  reference: { type: String, required: true, unique: true },
  items: { type: [itemSchema], required: true },
  totalAmount: { type: Number, required: true },
  status: { type: String, enum: ['completed', 'cancelled'], default: 'completed', index: true },
  cancelledAt: Date,
  cancelledBy: { type: ObjectId, ref: 'User' },
  createdBy: { type: ObjectId, ref: 'User', required: true },
  createdByName: { type: String, default: '' },
}, {
  timestamps: true,
  toJSON: { transform: (_, r) => { r.createdBy = r.createdByName; delete r.createdByName; delete r.__v; return r } },
})
saleSchema.index({ createdAt: -1 })

export default mongoose.model('Sale', saleSchema)
