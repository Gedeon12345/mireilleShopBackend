import { Router } from 'express'
import { listCategories, createCategory, updateCategory, archiveCategory } from '../controllers/categoryController.js'

const r = Router()
r.get('/', listCategories)
r.post('/', createCategory)
r.put('/:id', updateCategory)
r.patch('/:id/archive', archiveCategory)
export default r
