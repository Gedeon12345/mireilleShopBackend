import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import { AppError, asyncHandler } from '../utils/AppError.js'

export const protect = asyncHandler(async (req, res, next) => {
  const h = req.headers.authorization || ''
  if (!h.startsWith('Bearer ')) throw new AppError('Authentification requise.', 401)
  const { id } = jwt.verify(h.slice(7), process.env.JWT_SECRET)
  const user = await User.findById(id)
  if (!user) throw new AppError('Session invalide.', 401)
  req.user = user
  next()
})
