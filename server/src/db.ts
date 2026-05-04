import mongoose from 'mongoose'

let connected = false

export async function connectDb(uri: string): Promise<void> {
  if (connected) return
  await mongoose.connect(uri)
  connected = true
  console.log('MongoDB connected')
}

export async function disconnectDb(): Promise<void> {
  if (!connected) return
  await mongoose.disconnect()
  connected = false
}
