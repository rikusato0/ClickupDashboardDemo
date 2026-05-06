import { z } from 'zod'

const envSchema = z.object({
  PORT: z.string().optional(),
  MONGODB_URI: z.string().optional(),
  CLICKUP_API_TOKEN: z.string().optional(),
  CLICKUP_TEAM_ID: z.string().default('24568950'),
  /** Shown in the UI when connected (e.g. primary workspace label). */
  CLICKUP_WORKSPACE_DISPLAY_NAME: z
    .string()
    .default('White Lotus Bookkeeping'),
  STAFF_EMAIL_DOMAIN: z.string().default('whitelotusbk.com'),
  /** JSON: { "clientId": ["clientdomain.com"] } */
  CLIENT_EMAIL_DOMAINS_JSON: z.string().optional(),
  /** JSON: { "clientId": ["ceo@gmail.com","cfo@partner.org"] } — explicit contacts when domain match is insufficient */
  CLIENT_CONTACT_EMAILS_JSON: z.string().optional(),
  /** IANA TZ for “new calendar day” daily sync guard (default UTC). */
  SYNC_TIMEZONE: z.string().default('UTC'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GMAIL_REFRESH_TOKEN: z.string().optional(),
  /** Primary mailbox to sync (must match token). */
  GMAIL_USER_EMAIL: z.string().optional(),
  GMAIL_SYNC_DAYS: z.coerce.number().default(120),
  GMAIL_MAX_MESSAGES: z.coerce.number().default(800),
  /** Optional: base64 or path via GOOGLE_SERVICE_ACCOUNT_PATH for calendar DWD */
  GOOGLE_SERVICE_ACCOUNT_JSON: z.string().optional(),
  GOOGLE_WORKSPACE_DELEGATED_USER: z.string().optional(),
  SYNC_INTERVAL_MS: z.coerce.number().default(60 * 60 * 1000),
  ZOOM_WEBHOOK_SECRET: z.string().optional(),
})

export type AppConfig = z.infer<typeof envSchema>

let cached: AppConfig | null = null

export function loadConfig(): AppConfig {
  if (cached) return cached
  const parsed = envSchema.safeParse(process.env)
  if (!parsed.success) {
    console.warn('Env parse warnings:', parsed.error.flatten())
    cached = envSchema.parse({})
    return cached
  }
  cached = parsed.data
  return cached
}

export function parseClientDomainMap(
  raw: string | undefined,
): Map<string, string[]> {
  const m = new Map<string, string[]>()
  if (!raw?.trim()) return m
  try {
    const obj = JSON.parse(raw) as Record<string, string[] | string>
    for (const [k, v] of Object.entries(obj)) {
      const arr = Array.isArray(v) ? v : [v]
      m.set(k, arr.map((d) => String(d).toLowerCase().trim()))
    }
  } catch {
    console.warn('CLIENT_EMAIL_DOMAINS_JSON invalid JSON')
  }
  return m
}

/** Maps ClickUp client id (e.g. f-…) → explicit inbound email addresses (lowercase). */
export function parseClientContactEmailsMap(
  raw: string | undefined,
): Map<string, string[]> {
  const m = new Map<string, string[]>()
  if (!raw?.trim()) return m
  try {
    const obj = JSON.parse(raw) as Record<string, string[] | string>
    for (const [k, v] of Object.entries(obj)) {
      const arr = Array.isArray(v) ? v : [v]
      m.set(
        k,
        arr
          .map((e) => String(e).trim().toLowerCase())
          .filter((e) => e.includes('@')),
      )
    }
  } catch {
    console.warn('CLIENT_CONTACT_EMAILS_JSON invalid JSON')
  }
  return m
}
