import { AppError } from '../utils/AppError.js'

export const notFound = (req, res, next) => next(new AppError('Route introuvable.', 404))

export const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  let status = err.status || 500
  let message = err.message
  if (err.name === 'ValidationError') { status = 400; message = Object.values(err.errors)[0].message }
  else if (err.name === 'CastError') { status = 400; message = 'Identifiant invalide.' }
  else if (err.code === 11000) { status = 409; message = 'Cette valeur existe déjà.' }
  else if (err.code === 'LIMIT_FILE_SIZE') { status = 400; message = 'Image trop lourde (6 Mo maximum).' }
  else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') { status = 401; message = 'Session expirée, reconnectez-vous.' }
  if (status >= 500) { console.error(err); message = 'Erreur serveur.' }
  res.status(status).json({ message })
}
