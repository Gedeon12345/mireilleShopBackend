import { Router } from 'express'
import { summary, lowStock, movements, adjustment } from '../controllers/inventoryController.js'
import { adminOnly } from '../middleware/auth.js'

const r = Router()
r.get('/summary', summary)
r.get('/low-stock', lowStock)
r.get('/movements', adminOnly, movements)
r.post('/adjustment', adminOnly, adjustment)
export default r
