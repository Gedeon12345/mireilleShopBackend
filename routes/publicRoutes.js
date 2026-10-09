import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { publicProducts, publicProduct, publicCategories, publicShop } from '../controllers/publicController.js'

const r = Router()
r.use(rateLimit({ windowMs: 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false, message: { message: 'Trop de requêtes, réessayez dans une minute.' } }))
r.get('/products', publicProducts) // get all products
r.get('/products/:id', publicProduct) // get product by id
r.get('/categories', publicCategories) // get all categories
r.get('/shop', publicShop) // get all shops
export default r
