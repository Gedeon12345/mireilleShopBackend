import { Router } from 'express'
import { listSales, getSale, createSale, cancelSale } from '../controllers/saleController.js'
import { adminOnly } from '../middleware/auth.js'

const r = Router()
r.get('/', listSales)          // un employé ne voit que ses ventes (filtré dans le contrôleur)
r.get('/:id', getSale)
r.post('/', createSale)        // tout utilisateur connecté peut vendre
r.post('/:id/cancel', adminOnly, cancelSale)
export default r
