import { Router } from 'express'
import { listUsers, createUser, updateUser, resetPassword } from '../controllers/userController.js'

const r = Router()
r.get('/', listUsers)
r.post('/', createUser)
r.patch('/:id', updateUser)
r.post('/:id/reset-password', resetPassword)
export default r
