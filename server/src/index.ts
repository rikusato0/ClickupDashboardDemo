import './polyfillCrypto.js'
import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { loadConfig } from './config.js'
import { connectDb } from './db.js'
import { maybeRunDailyExternalSync } from './dailySync.js'
import { registerClickUpRoutes } from './routes/clickupRoutes.js'
import { registerDashboardRoutes } from './routes/dashboardRoutes.js'

const PORT = Number(process.env.PORT) || 3001

function getClickUpToken(): string | undefined {
  return process.env.CLICKUP_API_TOKEN
}

const app = express()
app.use(cors({ origin: true }))
app.use(express.json())

registerClickUpRoutes(app, getClickUpToken)
registerDashboardRoutes(app)

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`)
  const cfg = loadConfig()
  const uri = cfg.MONGODB_URI?.trim()
  if (!uri) return

  const tick = () => {
    void connectDb(uri)
      .then(() => maybeRunDailyExternalSync())
      .catch((e) => console.warn('Scheduled external sync:', e))
  }

  setInterval(tick, cfg.SYNC_INTERVAL_MS)
})
