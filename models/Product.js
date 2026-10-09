import mongoose from 'mongoose'

// Une ligne de stock = pointure + couleur + quantité
const variantSchema = new mongoose.Schema({
  size: { type: Number, required: true, min: 1 },
  color: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 0, validate: { validator: Number.isInteger, message: 'La quantité doit être un entier.' } },
}, { _id: false })

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
  gender: { type: String, enum: ['Homme', 'Femme', 'Enfant', 'Mixte'], required: true },
  description: { type: String, default: '' },
  image: { type: String, default: '' },
  imagePublicId: { type: String, default: '' },
  price: { type: Number, required: true, min: 1 },
  sizes: { type: [variantSchema], validate: { validator: (v) => v.length > 0, message: 'Un produit doit avoir au moins une pointure.' } },
  isActive: { type: Boolean, default: true, index: true },
  showOnline: { type: Boolean, default: true },   // visible sur le site client
}, { timestamps: true, toJSON: { transform: (_, r) => { delete r.__v; delete r.imagePublicId; return r } } })

export default mongoose.model('Product', productSchema)
