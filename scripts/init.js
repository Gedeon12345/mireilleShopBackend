// npm run init : crée le PREMIER administrateur (refusé s'il existe déjà un compte),
// les catégories initiales et le seuil par défaut. Aucun mot de passe n'est écrit dans le code.
import 'dotenv/config'
import mongoose from 'mongoose'
import connectDB from '../config/db.js'
import User from '../models/User.js'
import Category from '../models/Category.js'
import { getSettings } from '../services/settingsService.js'

const CATEGORIES = ['Sneakers', 'Baskets', 'Sandales', 'Talons', 'Mocassins', 'Bottes', 'Claquettes', 'Chaussures enfants', 'Autres']

try {
  await connectDB()
  if (await User.countDocuments()) {
    console.log('Un administrateur existe déjà : aucun compte créé.')
  } else {
    const { ADMIN_NAME = 'Administrateur', ADMIN_EMAIL, ADMIN_PASSWORD } = process.env
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) throw new Error('Renseignez ADMIN_EMAIL et ADMIN_PASSWORD (variables d’environnement).')
    if (ADMIN_PASSWORD.length < 8) throw new Error('ADMIN_PASSWORD : 8 caractères minimum.')
    await User.create({ name: ADMIN_NAME, email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
    console.log(`Administrateur créé : ${ADMIN_EMAIL}`)
  }
  if (!(await Category.countDocuments())) {
    await Category.insertMany(CATEGORIES.map((name) => ({ name })))
    console.log('Catégories initiales créées.')
  }
  await getSettings()
  console.log('Initialisation terminée.')
} catch (e) {
  console.error(e.message)
  process.exitCode = 1
} finally {
  await mongoose.disconnect()
}
