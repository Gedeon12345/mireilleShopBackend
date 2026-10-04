import { Router } from 'express'
import { listProducts, getProduct, createProduct, updateProduct, archiveProduct } from '../controllers/productController.js'
import { uploadImage } from '../middleware/upload.js'
import { adminOnly } from '../middleware/auth.js'

const r = Router()
r.get('/', listProducts)
r.get('/:id', getProduct)
r.post('/', adminOnly, uploadImage, createProduct)
r.put('/:id', adminOnly, uploadImage, updateProduct)
r.patch('/:id/archive', adminOnly, archiveProduct)
export default r
