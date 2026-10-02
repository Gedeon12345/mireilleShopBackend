import { Router } from 'express'
import { protect } from '../middleware/auth.js'
import { getDashboard } from '../controllers/dashboardController.js'
import { getSettingsHandler, updateSettings } from '../controllers/settingsController.js'
import authRoutes from './authRoutes.js'
import productRoutes from './productRoutes.js'
import categoryRoutes from './categoryRoutes.js'
import saleRoutes from './saleRoutes.js'
import inventoryRoutes from './inventoryRoutes.js'

const r = Router()
r.get('/health', (req, res) => res.json({ ok: true }))
r.use('/auth', authRoutes)                       // login public ; me/profile protégés dans le routeur
// Toutes les routes ci-dessous exigent un JWT valide
r.use(protect)
r.use('/products', productRoutes)
r.use('/categories', categoryRoutes)
r.use('/sales', saleRoutes)
r.use('/inventory', inventoryRoutes)
r.get('/dashboard', getDashboard)
r.get('/settings', getSettingsHandler)
r.put('/settings', updateSettings)
export default r
