import { z } from 'zod'
import { AppError } from './AppError.js'
import { normColor } from './color.js'

export const parse = (schema, data) => {
  const r = schema.safeParse(data)
  if (!r.success) throw new AppError(r.error.issues[0].message, 400)
  return r.data
}

const str = (label) =>
  z.string({ required_error: `${label} est obligatoire.`, invalid_type_error: `${label} est invalide.` }).trim().min(1, `${label} est obligatoire.`)
const id = z.string({ required_error: 'Identifiant manquant.' }).regex(/^[a-f\d]{24}$/i, 'Identifiant invalide.')

const variant = z.object({
  size: z.coerce.number({ invalid_type_error: 'Pointure invalide.' }).positive('Pointure invalide.'),
  color: str('La couleur').transform(normColor),
  quantity: z.coerce.number({ invalid_type_error: 'Quantité invalide.' }).int('La quantité doit être un entier.').min(0, 'La quantité ne peut pas être négative.'),
})

export const productSchema = z.object({
  name: str('Le nom'),
  category: id,
  gender: z.enum(['Homme', 'Femme', 'Enfant', 'Mixte'], { errorMap: () => ({ message: 'Genre invalide.' }) }),
  price: z.coerce.number({ invalid_type_error: 'Prix invalide.' }).int('Le prix doit être un nombre entier.').positive('Le prix doit être supérieur à 0.'),
  description: z.string().trim().max(1000, 'Description trop longue.').optional().default(''),
  showOnline: z.union([z.boolean(), z.enum(['true', 'false'])]).optional().transform((v) => v === undefined ? true : v === true || v === 'true'),
  sizes: z.array(variant, { required_error: 'Ajoutez au moins une pointure.' }).min(1, 'Ajoutez au moins une pointure.'),
}).superRefine((d, ctx) => {
  const seen = new Set()
  for (const s of d.sizes) {
    const k = `${s.size}|${s.color}`
    if (seen.has(k)) { ctx.addIssue({ code: 'custom', message: 'Une pointure ne peut pas être dupliquée pour une même couleur.', path: ['sizes'] }); break }
    seen.add(k)
  }
})

export const categorySchema = z.object({
  name: str('Le nom'),
  description: z.string().trim().max(300).optional().default(''),
})

export const saleSchema = z.object({
  items: z.array(z.object({
    product: id,
    size: z.coerce.number({ invalid_type_error: 'Pointure invalide.' }).positive('Pointure invalide.'),
    color: str('La couleur'),
    quantity: z.coerce.number({ invalid_type_error: 'Quantité invalide.' }).int('Quantité invalide.').min(1, 'La quantité doit être d’au moins 1.'),
  }), { required_error: 'Aucun article à vendre.' }).min(1, 'Aucun article à vendre.'),
})

export const adjustmentSchema = z.object({
  product: id,
  size: z.coerce.number().positive('Pointure invalide.'),
  color: str('La couleur'),
  newQuantity: z.coerce.number({ invalid_type_error: 'Quantité invalide.' }).int('Quantité invalide.').min(0, 'La quantité ne peut pas être négative.').optional(),
  delta: z.coerce.number({ invalid_type_error: 'Quantité invalide.' }).int('Quantité invalide.').refine((n) => n !== 0, 'La variation ne peut pas être nulle.').optional(),
  reason: str('Le motif').pipe(z.string().min(3, 'Le motif est trop court.')),
}).refine((d) => (d.newQuantity === undefined) !== (d.delta === undefined), { message: 'Indiquez soit la nouvelle quantité, soit une variation.' })

export const loginSchema = z.object({ email: str('L’email').toLowerCase(), password: str('Le mot de passe') })

export const profileSchema = z.object({
  name: z.string().trim().min(1, 'Le nom est obligatoire.').optional(),
  email: z.string().trim().toLowerCase().email('Email invalide.').optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, 'Le nouveau mot de passe doit contenir au moins 8 caractères.').optional(),
})

export const settingsSchema = z.object({
  lowStockThreshold: z.coerce.number({ invalid_type_error: 'Seuil invalide.' }).int('Le seuil doit être un entier.').min(1, 'Le seuil doit être d’au moins 1.').max(1000).optional(),
  shopName: z.string().trim().min(1, 'Le nom de la boutique est obligatoire.').max(60).optional(),
  whatsappNumber: z.string().trim()
    .transform((v) => v.replace(/[\s.\-()]/g, '').replace(/^\+/, '').replace(/^00/, ''))
    .refine((v) => v === '' || /^\d{8,15}$/.test(v), 'Numéro WhatsApp invalide : indicatif du pays inclus, par exemple 237690000000.').optional(),
  shopAddress: z.string().trim().max(200, 'Adresse trop longue.').optional(),
  deliveryInfo: z.string().trim().max(600, 'Texte trop long (600 caractères maximum).').optional(),
}).refine((d) => Object.keys(d).length > 0, { message: 'Aucune modification à enregistrer.' })

const email = z.string({ required_error: 'L’email est obligatoire.' }).trim().toLowerCase().email('Email invalide.')
const password = z.string({ required_error: 'Le mot de passe est obligatoire.' }).min(8, 'Le mot de passe doit contenir au moins 8 caractères.')

export const userCreateSchema = z.object({ name: str('Le nom'), email, password })
export const userUpdateSchema = z.object({
  name: z.string().trim().min(1, 'Le nom est obligatoire.').optional(),
  isActive: z.boolean({ invalid_type_error: 'Statut invalide.' }).optional(),
})
export const passwordResetSchema = z.object({ newPassword: password })
