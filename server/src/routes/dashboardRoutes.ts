import type { Express, Request, Response } from 'express'
import { format, subDays } from 'date-fns'
import { loadConfig } from '../config.js'
import { connectDb } from '../db.js'
import { maybeRunDailyExternalSync } from '../dailySync.js'
import { buildDashboardSnapshot } from '../buildSnapshot.js'
import { runClickUpSync } from '../clickupSync.js'
import { runGmailSync } from '../gmailSync.js'
import { runCalendarSync } from '../calendarSync.js'
import { runThreadInsights } from '../openaiAnalyze.js'
import {
  resolveClientIdFromParticipants,
  loadClientEmailResolution,
} from '../emailClientResolve.js'
import { ZoomTranscriptModel } from '../models.js'

function zoomParticipantEmailsFromObject(obj: Record<string, unknown>): string[] {
  const out = new Set<string>()
  const push = (s: unknown) => {
    if (typeof s === 'string' && s.includes('@'))
      out.add(s.trim().toLowerCase())
  }
  push(obj.host_email)
  const ps = obj.participants
  if (Array.isArray(ps)) {
    for (const p of ps) {
      if (p && typeof p === 'object') push((p as { email?: string }).email)
    }
  }
  const pe = obj.participant_emails
  if (Array.isArray(pe)) {
    for (const x of pe) push(x)
  }
  push(obj.user_email)
  return [...out]
}

function mongoConnectErrorMessage(e: unknown): string {
  const raw = String(e)
  if (/\bECONNREFUSED\b/.test(raw) && raw.includes('27017')) {
    return 'Cannot connect to MongoDB (connection refused on port 27017). Start MongoDB locally (e.g. `mongod` or Docker) or set MONGODB_URI in server/.env — see server/.env.example.'
  }
  return raw
}

export function registerDashboardRoutes(app: Express) {
  app.get('/api/dashboard', async (req: Request, res: Response) => {
    const cfg = loadConfig()
    if (!cfg.MONGODB_URI?.trim()) {
      res.status(503).json({
        ok: false,
        error:
          'MONGODB_URI not set. Add it to server/.env (see server/.env.example).',
      })
      return
    }
    try {
      await connectDb(cfg.MONGODB_URI)
    } catch (e) {
      res.status(503).json({ ok: false, error: mongoConnectErrorMessage(e) })
      return
    }

    const toStr =
      (typeof req.query.to === 'string' && req.query.to) ||
      format(new Date(), 'yyyy-MM-dd')
    const fromStr =
      (typeof req.query.from === 'string' && req.query.from) ||
      format(subDays(new Date(), 540), 'yyyy-MM-dd')

    try {
      await maybeRunDailyExternalSync()
      const data = await buildDashboardSnapshot(fromStr, toStr)
      res.json({ ok: true, data })
    } catch (e) {
      res.status(500).json({ ok: false, error: String(e) })
    }
  })

  app.post('/api/sync', async (_req: Request, res: Response) => {
    const cfg = loadConfig()
    if (!cfg.MONGODB_URI?.trim()) {
      res.status(503).json({ ok: false, error: 'MONGODB_URI not set' })
      return
    }
    try {
      await connectDb(cfg.MONGODB_URI)
    } catch (e) {
      res.status(503).json({ ok: false, error: mongoConnectErrorMessage(e) })
      return
    }

    const results: Record<string, unknown> = {}
    results.clickup = await runClickUpSync()
    results.gmail = await runGmailSync()
    results.calendar = await runCalendarSync()
    results.openaiThreads = await runThreadInsights(60)
    res.json({ ok: true, results })
  })

  app.post('/api/webhooks/zoom', async (req: Request, res: Response) => {
    const cfg = loadConfig()
    if (!cfg.MONGODB_URI?.trim()) {
      res.status(503).send()
      return
    }
    try {
      await connectDb(cfg.MONGODB_URI)
    } catch {
      res.status(503).send()
      return
    }

    try {
      const body = req.body as { event?: string; payload?: { object?: Record<string, unknown> } }
      const event = body.event
      const obj = body.payload?.object
      if (event === 'recording.transcript_completed' || event === 'transcript.completed') {
        const uuid = String(obj?.uuid ?? obj?.id ?? `zoom-${Date.now()}`)
        const topic = String(obj?.topic ?? '')
        const host = String((obj as { host_email?: string }).host_email ?? '')
        const text = String((obj as { transcript?: string }).transcript ?? '')
        const participantEmails = zoomParticipantEmailsFromObject(
          (obj ?? {}) as Record<string, unknown>,
        )
        const maps = await loadClientEmailResolution()
        const clientId = resolveClientIdFromParticipants(
          participantEmails.length > 0 ? participantEmails : [host],
          cfg.STAFF_EMAIL_DOMAIN.toLowerCase(),
          maps,
        )
        await ZoomTranscriptModel.findOneAndUpdate(
          { meetingUuid: uuid },
          {
            meetingUuid: uuid,
            topic,
            hostEmail: host,
            participantEmails,
            transcriptText: text,
            clientId,
            rawPayload: body,
          },
          { upsert: true },
        )
      }
      res.status(200).json({ ok: true })
    } catch (e) {
      res.status(400).json({ ok: false, error: String(e) })
    }
  })
}
