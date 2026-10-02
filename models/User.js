import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['admin'], default: 'admin' },
}, { timestamps: true })

userSchema.pre('save', async function (next) {
  if (this.isModified('password')) this.password = await bcrypt.hash(this.password, 12)
  next()
})
userSchema.methods.matchPassword = function (plain) { return bcrypt.compare(plain, this.password) }

export default mongoose.model('User', userSchema)
