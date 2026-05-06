import {
  loadConfig,
  parseClientContactEmailsMap,
  parseClientDomainMap,
} from './config.js'
import { ClientModel } from './models.js'

/** Loads Gmail / Zoom routing maps from env + persisted Client rows. */
export async function loadClientEmailResolution(): Promise<{
  domainToClientId: Map<string, string>
  emailToClientId: Map<string, string>
}> {
  const cfg = loadConfig()
  const envDomains = parseClientDomainMap(cfg.CLIENT_EMAIL_DOMAINS_JSON)
  const envEmails = parseClientContactEmailsMap(cfg.CLIENT_CONTACT_EMAILS_JSON)
  const domainToClientId = new Map<string, string>()
  const emailToClientId = new Map<string, string>()

  const clients = await ClientModel.find({}).lean()
  for (const c of clients) {
    const domains = [
      ...(envDomains.get(c.id) ?? []),
      ...(c.emailDomains ?? []),
      ...(c.domain ? [c.domain] : []),
    ].filter(Boolean) as string[]
    for (const d of domains) {
      const key = d.replace(/^@/, '').toLowerCase().trim()
      if (key) domainToClientId.set(key, c.id)
    }

    const contacts = [
      ...(envEmails.get(c.id) ?? []),
      ...((c as { contactEmails?: string[] }).contactEmails ?? []),
    ].filter(Boolean) as string[]
    for (const e of contacts) {
      const addr = e.trim().toLowerCase()
      if (addr.includes('@')) emailToClientId.set(addr, c.id)
    }
  }

  return { domainToClientId, emailToClientId }
}

/** Prefer explicit contact email, then any participant domain not matching staff domain. */
export function resolveClientIdFromParticipants(
  participantEmails: string[],
  staffDomainLower: string,
  maps: { domainToClientId: Map<string, string>; emailToClientId: Map<string, string> },
): string {
  const uniq = [...new Set(participantEmails.map((e) => e.trim().toLowerCase()))]
  for (const e of uniq) {
    if (!e.includes('@')) continue
    const dom = e.split('@')[1] ?? ''
    if (dom === staffDomainLower) continue
    const direct = maps.emailToClientId.get(e)
    if (direct) return direct
  }
  for (const e of uniq) {
    if (!e.includes('@')) continue
    const dom = e.split('@')[1] ?? ''
    if (dom === staffDomainLower) continue
    const viaDom = maps.domainToClientId.get(dom)
    if (viaDom) return viaDom
  }
  return ''
}
