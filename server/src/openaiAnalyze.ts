import OpenAI from 'openai'
import { loadConfig } from './config.js'
import { EmailMessageModel, ThreadInsightModel } from './models.js'
import { COMMS_CATEGORIES, type CommsCategory } from './dashboardTypes.js'

const CATEGORY_SET = new Set<string>(COMMS_CATEGORIES)

export async function runThreadInsights(
  limit: number,
): Promise<{ ok: boolean; error?: string; analyzed: number }> {
  const cfg = loadConfig()
  if (!cfg.OPENAI_API_KEY?.trim()) {
    return { ok: false, error: 'OPENAI_API_KEY missing', analyzed: 0 }
  }

  const openai = new OpenAI({ apiKey: cfg.OPENAI_API_KEY })
  const known = new Set(
    (await ThreadInsightModel.find({}, { threadId: 1 }).lean()).map(
      (x) => x.threadId,
    ),
  )

  const threads = await EmailMessageModel.distinct('threadId', {
    clientId: { $nin: ['', null] },
  })

  const pending = threads.filter((t) => !known.has(t)).slice(0, limit)

  let analyzed = 0
  for (const threadId of pending) {
    const msgs = await EmailMessageModel.find({ threadId })
      .sort({ internalDate: 1 })
      .lean()
    if (msgs.length === 0) continue
    const clientId = msgs[msgs.length - 1]!.clientId
    if (!clientId) continue
    const text = msgs
      .map((m) => `${m.subject}\n${m.snippet}`)
      .join('\n')
      .slice(0, 8000)

    try {
      const res = await openai.chat.completions.create({
        model: cfg.OPENAI_MODEL,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You analyze bookkeeping firm client email threads. Return JSON: {"category": one of ${JSON.stringify(COMMS_CATEGORIES)}, "sentiment": number from -1 to 1, "summary": string max 200 chars}`,
          },
          { role: 'user', content: text },
        ],
      })
      const raw = res.choices[0]?.message?.content ?? '{}'
      const parsed = JSON.parse(raw) as {
        category?: string
        sentiment?: number
        summary?: string
      }
      const cat = CATEGORY_SET.has(parsed.category ?? '')
        ? (parsed.category as CommsCategory)
        : 'Ad hoc requests'
      const sent =
        typeof parsed.sentiment === 'number'
          ? Math.max(-1, Math.min(1, parsed.sentiment))
          : 0

      await ThreadInsightModel.findOneAndUpdate(
        { threadId },
        {
          threadId,
          clientId,
          category: cat,
          sentiment: sent,
          summary: parsed.summary?.slice(0, 500) ?? '',
          analyzedAt: new Date(),
          model: cfg.OPENAI_MODEL,
        },
        { upsert: true },
      )
      analyzed++
    } catch {
      // skip thread on API errors
    }
  }

  return { ok: true, analyzed }
}

export async function runPredictedNeeds(
  clientSummaries: { id: string; name: string; notes: string }[],
): Promise<
  {
    clientId: string
    dueDate: string
    title: string
    detail: string
    confidence: number
  }[]
> {
  const cfg = loadConfig()
  if (!cfg.OPENAI_API_KEY?.trim() || clientSummaries.length === 0) return []

  const openai = new OpenAI({ apiKey: cfg.OPENAI_API_KEY })
  try {
    const res = await openai.chat.completions.create({
      model: cfg.OPENAI_MODEL,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are a bookkeeping ops analyst. Given client note summaries, emit JSON: { "needs": [ { "clientId", "dueDate" (yyyy-mm-dd within 60 days), "title", "detail", "confidence" 0-1 } ] } max 12 items total, prioritize likely compliance/close/tax deadlines.',
        },
        {
          role: 'user',
          content: JSON.stringify(clientSummaries).slice(0, 12000),
        },
      ],
    })
    const raw = res.choices[0]?.message?.content ?? '{"needs":[]}'
    const parsed = JSON.parse(raw) as {
      needs?: {
        clientId: string
        dueDate: string
        title: string
        detail: string
        confidence: number
      }[]
    }
    return parsed.needs ?? []
  } catch {
    return []
  }
}
