import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import { AppError, asyncHandler } from '../utils/AppError.js'

export const protect = asyncHandler(async (req, res, next) => {
  const h = req.headers.authorization || ''
  if (!h.startsWith('Bearer ')) throw new AppError('Authentification requise.', 401)
  const { id } = jwt.verify(h.slice(7), process.env.JWT_SECRET)
  const user = await User.findById(id)
  if (!user) throw new AppError('Session invalide.', 401)
  if (user.isActive === false) throw new AppError('Ce compte est désactivé.', 401) // effet immédiat
  req.user = user
  next()
})

// Droits : la propriétaire (admin) a tout ; l'employé est limité (voir les routes)
export const restrictTo = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : next(new AppError('Action réservée à la propriétaire.', 403))
export const adminOnly = restrictTo('admin')
