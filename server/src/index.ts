import './polyfillCrypto.js'
import 'dotenv/config'
import cors from 'cors'
import express from 'express'
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
})
