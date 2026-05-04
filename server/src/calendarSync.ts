import { google } from 'googleapis'
import { loadConfig } from './config.js'
import { CalendarEventModel, StaffModel } from './models.js'

function oauthClient(cfg: ReturnType<typeof loadConfig>) {
  const cid = cfg.GOOGLE_CLIENT_ID
  const secret = cfg.GOOGLE_CLIENT_SECRET
  const refresh = cfg.GMAIL_REFRESH_TOKEN
  if (!cid || !secret || !refresh) return null
  const o = new google.auth.OAuth2(cid, secret)
  o.setCredentials({ refresh_token: refresh })
  return o
}

function zoomFromText(text: string): string {
  const m =
    text.match(/https:\/\/[\w.-]*zoom\.us\/j\/[\w?=&.-]+/i) ||
    text.match(/https:\/\/[\w.-]*zoom\.us\/meeting\/[\w?=&.-]+/i)
  return m?.[0] ?? ''
}

export async function runCalendarSync(): Promise<{
  ok: boolean
  error?: string
  events?: number
}> {
  const cfg = loadConfig()
  const auth = oauthClient(cfg)
  if (!auth) return { ok: false, error: 'Google OAuth not configured' }
  const mailbox = cfg.GMAIL_USER_EMAIL?.trim()
  if (!mailbox) return { ok: false, error: 'GMAIL_USER_EMAIL not set' }

  const staff = await StaffModel.findOne({
    email: new RegExp(`^${mailbox.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
  }).lean()
  if (!staff) {
    return {
      ok: false,
      error:
        'No Staff row with matching email; sync ClickUp first or set staff email in DB',
    }
  }

  const cal = google.calendar({ version: 'v3', auth })
  const timeMin = new Date(
    Date.now() - cfg.GMAIL_SYNC_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString()
  const timeMax = new Date(
    Date.now() + 90 * 24 * 60 * 60 * 1000,
  ).toISOString()

  try {
    const list = await cal.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 500,
    })

    let n = 0
    for (const ev of list.data.items ?? []) {
      if (!ev.id) continue
      const start =
        ev.start?.dateTime ??
        (ev.start?.date ? `${ev.start.date}T00:00:00` : null)
      const end =
        ev.end?.dateTime ?? (ev.end?.date ? `${ev.end.date}T23:59:59` : null)
      if (!start || !end) continue
      const text = `${ev.summary ?? ''} ${ev.description ?? ''} ${ev.location ?? ''}`
      const zoomJoinUrl = zoomFromText(text)
      const attendeeEmails = (ev.attendees ?? [])
        .map((a) => a.email?.toLowerCase())
        .filter(Boolean) as string[]

      await CalendarEventModel.findOneAndUpdate(
        { eventId: ev.id, staffEmail: mailbox.toLowerCase() },
        {
          eventId: ev.id,
          staffId: staff.id,
          staffEmail: mailbox.toLowerCase(),
          start: new Date(start),
          end: new Date(end),
          summary: ev.summary ?? '',
          htmlLink: ev.htmlLink ?? '',
          zoomJoinUrl,
          attendeeEmails,
          clientHint: '',
        },
        { upsert: true },
      )
      n++
    }
    return { ok: true, events: n }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}
