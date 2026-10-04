import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import { AppError, asyncHandler } from '../utils/AppError.js'
import { parse, loginSchema, profileSchema } from '../utils/validate.js'

const publicUser = (u) => ({ name: u.name, email: u.email, role: u.role })

export const login = asyncHandler(async (req, res) => {
  const { email, password } = parse(loginSchema, req.body)
  const user = await User.findOne({ email }).select('+password')
  if (!user || !(await user.matchPassword(password))) throw new AppError('Email ou mot de passe incorrect.', 401)
  if (user.isActive === false) throw new AppError('Ce compte est désactivé. Contactez la propriétaire.', 403)
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' })
  res.json({ token, user: publicUser(user) })
})

export const me = asyncHandler(async (req, res) => res.json(publicUser(req.user)))

// PUT /auth/profile : {name,email} ou {currentPassword,newPassword}
export const updateProfile = asyncHandler(async (req, res) => {
  const d = parse(profileSchema, req.body)
  const user = await User.findById(req.user._id).select('+password')

  if (d.newPassword) {
    if (!d.currentPassword || !(await user.matchPassword(d.currentPassword))) throw new AppError('Mot de passe actuel incorrect.', 400)
    user.password = d.newPassword
    await user.save()
    return res.json({ ok: true })
  }
  if (d.email && d.email !== user.email && (await User.exists({ email: d.email }))) throw new AppError('Cet email est déjà utilisé.', 409)
  if (d.name) user.name = d.name
  if (d.email) user.email = d.email
  await user.save()
  res.json(publicUser(user))
})
