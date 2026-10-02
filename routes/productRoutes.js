import { Router } from 'express'
import { listProducts, getProduct, createProduct, updateProduct, archiveProduct } from '../controllers/productController.js'
import { uploadImage } from '../middleware/upload.js'

const r = Router()
r.get('/', listProducts)
r.get('/:id', getProduct)
r.post('/', uploadImage, createProduct)
r.put('/:id', uploadImage, updateProduct)
r.patch('/:id/archive', archiveProduct)
export default r
