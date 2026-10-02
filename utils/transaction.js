import mongoose from 'mongoose'

// Exécute fn(session) dans une transaction MongoDB : tout réussit ou rien n'est enregistré.
export async function runTx(fn) {
  const session = await mongoose.startSession()
  try {
    let result
    await session.withTransaction(async () => { result = await fn(session) })
    return result
  } finally {
    session.endSession()
  }
}
