import { Router } from 'express'
import { listCategories, createCategory, updateCategory, archiveCategory } from '../controllers/categoryController.js'
import { adminOnly } from '../middleware/auth.js'

const r = Router()
r.get('/', listCategories)
r.post('/', adminOnly, createCategory)
r.put('/:id', adminOnly, updateCategory)
r.patch('/:id/archive', adminOnly, archiveCategory)
export default r
