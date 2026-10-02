import multer from 'multer'
import { AppError } from '../utils/AppError.js'

export const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    /^image\/(jpeg|png|webp)$/.test(file.mimetype) ? cb(null, true) : cb(new AppError('Format accepté : JPG, PNG ou WebP.')),
}).single('image')
