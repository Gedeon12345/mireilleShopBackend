import { Router } from 'express'
import { summary, lowStock, movements, adjustment } from '../controllers/inventoryController.js'

const r = Router()
r.get('/summary', summary)
r.get('/low-stock', lowStock)
r.get('/movements', movements)
r.post('/adjustment', adjustment)
export default r
