import mongoose from 'mongoose'

export default async function connectDB() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI manquant dans .env')
  mongoose.set('strictQuery', true)
  await mongoose.connect(process.env.MONGO_URI)
  console.log('MongoDB connecté')
}
