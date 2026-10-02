import mongoose from 'mongoose'
const { ObjectId } = mongoose.Schema.Types

const movementSchema = new mongoose.Schema({
  product: { type: ObjectId, ref: 'Product', required: true, index: true },
  size: { type: Number, required: true },
  color: { type: String, required: true },
  type: { type: String, enum: ['initial', 'sale', 'sale_cancel', 'adjustment'], required: true },
  quantity: { type: Number, required: true },        // variation signée (+/-)
  previousQuantity: { type: Number, required: true },
  newQuantity: { type: Number, required: true },
  reason: { type: String, default: '' },
  relatedSale: { type: ObjectId, ref: 'Sale' },
  createdBy: { type: ObjectId, ref: 'User' },
}, { timestamps: { createdAt: true, updatedAt: false }, toJSON: { transform: (_, r) => { delete r.__v; return r } } })

export default mongoose.model('StockMovement', movementSchema)
