import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { publicProducts, publicProduct, publicCategories, publicShop } from '../controllers/publicController.js'

const r = Router()
r.use(rateLimit({ windowMs: 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false, message: { message: 'Trop de requêtes, réessayez dans une minute.' } }))
r.get('/products', publicProducts)
r.get('/products/:id', publicProduct)
r.get('/categories', publicCategories)
r.get('/shop', publicShop)
export default r
