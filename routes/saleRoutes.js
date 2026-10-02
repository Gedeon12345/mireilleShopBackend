import { Router } from 'express'
import { listSales, getSale, createSale, cancelSale } from '../controllers/saleController.js'

const r = Router()
r.get('/', listSales)
r.get('/:id', getSale)
r.post('/', createSale)
r.post('/:id/cancel', cancelSale)
export default r
