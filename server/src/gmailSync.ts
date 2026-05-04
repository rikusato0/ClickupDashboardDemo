import { google } from 'googleapis'
import { loadConfig } from './config.js'
import { EmailMessageModel, StaffModel, SyncStateModel } from './models.js'
import { ClientModel } from './models.js'

function parseHeader(
  headers: { name?: string; value?: string }[] | undefined,
  name: string,
): string {
  const h = headers?.find(
    (x) => x.name?.toLowerCase() === name.toLowerCase(),
  )
  return h?.value ?? ''
}

function extractEmails(headerVal: string): string[] {
  if (!headerVal) return []
  const out = new Set<string>()
  const re = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g
  let m: RegExpExecArray | null
  while ((m = re.exec(headerVal)) !== null) {
    out.add(m[1]!.toLowerCase())
  }
  return [...out]
}

function displayNameFromFromHeader(from: string): string {
  const m = from.match(/^([^<]+)<[^>]+>/)
  if (m) return m[1]!.trim().replace(/^"|"$/g, '')
  return from.split('@')[0] ?? 'Contact'
}

function domainOf(email: string): string {
  return email.split('@')[1]?.toLowerCase() ?? ''
}

async function buildDomainToClientId(): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  const clients = await ClientModel.find({}).lean()
  for (const c of clients) {
    const domains = [
      ...(c.emailDomains ?? []),
      ...(c.domain ? [c.domain] : []),
    ].filter(Boolean) as string[]
    for (const d of domains) {
      map.set(d.toLowerCase(), c.id)
    }
  }
  return map
}

function oauthClient(cfg: ReturnType<typeof loadConfig>) {
  const cid = cfg.GOOGLE_CLIENT_ID
  const secret = cfg.GOOGLE_CLIENT_SECRET
  const refresh = cfg.GMAIL_REFRESH_TOKEN
  if (!cid || !secret || !refresh) return null
  const o = new google.auth.OAuth2(cid, secret)
  o.setCredentials({ refresh_token: refresh })
  return o
}

export async function runGmailSync(): Promise<{
  ok: boolean
  error?: string
  imported?: number
}> {
  const cfg = loadConfig()
  const auth = oauthClient(cfg)
  if (!auth) {
    return { ok: false, error: 'Gmail OAuth not configured' }
  }
  const userEmail = cfg.GMAIL_USER_EMAIL?.trim()
  if (!userEmail) {
    return { ok: false, error: 'GMAIL_USER_EMAIL not set' }
  }

  const staffDomain = cfg.STAFF_EMAIL_DOMAIN.toLowerCase()
  const domainToClient = await buildDomainToClientId()
  const staffByEmail = new Map<string, string>()
  for (const s of await StaffModel.find({}).lean()) {
    if (s.email) staffByEmail.set(s.email.toLowerCase(), s.id)
  }

  const gmail = google.gmail({ version: 'v1', auth })
  const days = cfg.GMAIL_SYNC_DAYS
  const maxMsg = cfg.GMAIL_MAX_MESSAGES

  let imported = 0
  let pageToken: string | undefined
  const staffSet = (e: string) => {
    const d = domainOf(e)
    return d === staffDomain
  }

  try {
    while (imported < maxMsg) {
      const list = await gmail.users.messages.list({
        userId: 'me',
        q: `newer_than:${days}d`,
        maxResults: Math.min(100, maxMsg - imported),
        pageToken,
      })
      const msgs = list.data.messages ?? []
      if (msgs.length === 0) break

      for (const m of msgs) {
        if (!m.id) continue
        const existing = await EmailMessageModel.findOne({
          messageId: m.id,
        }).lean()
        if (existing) continue

        const full = await gmail.users.messages.get({
          userId: 'me',
          id: m.id,
          format: 'metadata',
          metadataHeaders: ['From', 'To', 'Cc', 'Subject', 'Date'],
        })
        const headers = full.data.payload?.headers
        const fromH = parseHeader(headers, 'From')
        const toH = parseHeader(headers, 'To')
        const ccH = parseHeader(headers, 'Cc')
        const subj = parseHeader(headers, 'Subject')
        const fromEmails = extractEmails(fromH)
        const fromAddr = fromEmails[0] ?? ''
        const allRecipients = [
          ...extractEmails(toH),
          ...extractEmails(ccH),
        ]

        const internalTs = Number(full.data.internalDate)
        const internalDate = new Date(internalTs)

        let clientId = ''
        const candidates = [...fromEmails, ...allRecipients].filter(
          (e) => !staffSet(e),
        )
        for (const e of candidates) {
          const dom = domainOf(e)
          const cid = domainToClient.get(dom)
          if (cid) {
            clientId = cid
            break
          }
        }

        const fromStaff = fromAddr ? staffSet(fromAddr) : false
        const isInbound = Boolean(fromAddr && !fromStaff)

        let staffId = ''
        if (fromStaff && fromAddr) {
          staffId = staffByEmail.get(fromAddr) ?? ''
        } else {
          for (const e of allRecipients) {
            if (staffSet(e)) {
              staffId = staffByEmail.get(e) ?? ''
              if (staffId) break
            }
          }
        }

        await EmailMessageModel.create({
          messageId: m.id,
          threadId: full.data.threadId ?? m.id,
          internalDate,
          fromEmail: fromAddr,
          fromName: displayNameFromFromHeader(fromH),
          toEmails: allRecipients,
          subject: subj,
          snippet: full.data.snippet ?? '',
          staffId,
          clientId,
          isInbound,
          labelIds: full.data.labelIds ?? [],
        })
        imported++
        if (imported >= maxMsg) break
      }
      pageToken = list.data.nextPageToken ?? undefined
      if (!pageToken) break
    }

    await SyncStateModel.findOneAndUpdate(
      { key: 'gmail' },
      { key: 'gmail', lastRunAt: new Date(), meta: { imported } },
      { upsert: true },
    )

    return { ok: true, imported }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}
