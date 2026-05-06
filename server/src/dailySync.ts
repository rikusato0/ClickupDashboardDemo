import { loadConfig } from './config.js'
import { SyncStateModel } from './models.js'
import { runCalendarSync } from './calendarSync.js'
import { runClickUpSync } from './clickupSync.js'
import { runGmailSync } from './gmailSync.js'
import { runThreadInsights } from './openaiAnalyze.js'

const KEY = 'daily-external-sync'

function calendarDayInTimeZone(timeZone: string, d = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

/** Runs ClickUp + Gmail + Calendar + thread insights once per calendar day (IANA TZ). */
export async function maybeRunDailyExternalSync(): Promise<
  Record<string, unknown> | undefined
> {
  const cfg = loadConfig()
  const today = calendarDayInTimeZone(cfg.SYNC_TIMEZONE)
  const row = await SyncStateModel.findOne({ key: KEY }).lean()
  const meta = row?.meta as { calendarDay?: string } | undefined
  const lastDay = meta?.calendarDay ?? ''
  if (lastDay === today) return undefined

  const results: Record<string, unknown> = {
    calendarDay: today,
    startedAt: new Date().toISOString(),
  }

  if (cfg.CLICKUP_API_TOKEN?.trim()) {
    results.clickup = await runClickUpSync()
  }
  results.gmail = await runGmailSync()
  results.calendar = await runCalendarSync()
  results.openaiThreads = cfg.OPENAI_API_KEY?.trim()
    ? await runThreadInsights(80)
    : { ok: false, error: 'OPENAI_API_KEY missing', analyzed: 0 }

  await SyncStateModel.findOneAndUpdate(
    { key: KEY },
    {
      key: KEY,
      lastRunAt: new Date(),
      meta: { calendarDay: today, results },
    },
    { upsert: true },
  )

  results.finishedAt = new Date().toISOString()
  return results
}
