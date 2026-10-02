import { v2 as cloudinary } from 'cloudinary'
import { AppError } from '../utils/AppError.js'

// Cloudinary lit automatiquement la variable CLOUDINARY_URL
export const imagesEnabled = () => !!process.env.CLOUDINARY_URL

export const uploadImage = (buffer) =>
  new Promise((resolve, reject) => {
    if (!imagesEnabled()) return reject(new AppError('Le stockage des photos n’est pas configuré sur le serveur.', 503))
    cloudinary.uploader.upload_stream({ folder: 'shoe-inventory', resource_type: 'image' }, (err, r) =>
      err ? reject(new AppError('Échec de l’envoi de la photo.', 502)) : resolve({ url: r.secure_url, publicId: r.public_id })
    ).end(buffer)
  })

export const deleteImage = async (publicId) => {
  if (!publicId || !imagesEnabled()) return
  try { await cloudinary.uploader.destroy(publicId) } catch { /* nettoyage au mieux */ }
}
