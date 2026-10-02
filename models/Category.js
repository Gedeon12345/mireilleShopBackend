import mongoose from 'mongoose'

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true, toJSON: { transform: (_, r) => { delete r.__v; return r } } })

// nom unique sans tenir compte des majuscules / accents
categorySchema.index({ name: 1 }, { unique: true, collation: { locale: 'fr', strength: 2 } })

export default mongoose.model('Category', categorySchema)
