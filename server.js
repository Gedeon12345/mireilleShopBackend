import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import connectDB from './config/db.js'
import routes from './routes/index.js'
import { notFound, errorHandler } from './middleware/error.js'

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET manquant ou trop court (32 caractères minimum).')
  process.exit(1)
}

const app = express()
app.set('trust proxy', 1) // Render est derrière un proxy
app.use(helmet())
const origins = (process.env.FRONTEND_URL || '').split(',').map((s) => s.trim()).filter(Boolean)
app.use(cors({ origin: origins.length ? origins : false }))
app.use(express.json({ limit: '1mb' }))

app.use('/api', routes)
app.use(notFound)
app.use(errorHandler)

const port = process.env.PORT || 5000
connectDB()
  .then(() => app.listen(port, '0.0.0.0', () => console.log(`API prête sur le port ${port}`)))
  .catch((e) => { console.error('Démarrage impossible :', e.message); process.exit(1) })
