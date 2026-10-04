import User from '../models/User.js'
import { AppError, asyncHandler } from '../utils/AppError.js'
import { parse, userCreateSchema, userUpdateSchema, passwordResetSchema } from '../utils/validate.js'

const findEmployee = async (id) => {
  const u = await User.findOne({ _id: id, role: 'employee' })
  if (!u) throw new AppError('Employé introuvable.', 404)
  return u
}

export const listUsers = asyncHandler(async (req, res) => {
  res.json(await User.find({ role: 'employee' }).sort('name'))
})

// Seule la propriétaire crée des comptes (pas d'inscription publique) ; ils sont toujours "employee"
export const createUser = asyncHandler(async (req, res) => {
  const d = parse(userCreateSchema, req.body)
  if (await User.exists({ email: d.email })) throw new AppError('Cet email est déjà utilisé.', 409)
  res.status(201).json(await User.create({ ...d, role: 'employee' }))
})

export const updateUser = asyncHandler(async (req, res) => {
  const d = parse(userUpdateSchema, req.body)
  const u = await findEmployee(req.params.id)
  if (d.name !== undefined) u.name = d.name
  if (d.isActive !== undefined) u.isActive = d.isActive
  res.json(await u.save())
})

export const resetPassword = asyncHandler(async (req, res) => {
  const { newPassword } = parse(passwordResetSchema, req.body)
  const u = await findEmployee(req.params.id)
  u.password = newPassword
  await u.save()
  res.json({ ok: true })
})
