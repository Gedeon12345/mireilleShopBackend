import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { login, me, updateProfile } from '../controllers/authController.js'
import { protect } from '../middleware/auth.js'

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10, skipSuccessfulRequests: true, standardHeaders: true, legacyHeaders: false,
  message: { message: 'Trop de tentatives. Réessayez dans quelques minutes.' },
})
const r = Router()
r.post('/login', limiter, login)
r.get('/me', protect, me)
r.put('/profile', protect, updateProfile)
export default r
