import type { Express, Request, Response } from 'express'
import { clickupRequest } from '../clickupApi.js'

/** Workspace summary returned to the SPA (subset of ClickUp team payload). */
export type WorkspaceSummary = {
  id: string
  name: string
}

function requireToken(res: Response, token: string | undefined): token is string {
  if (!token?.trim()) {
    res.status(503).json({
      ok: false,
      error:
        'CLICKUP_API_TOKEN is not set. Create server/.env with CLICKUP_API_TOKEN=your_token.',
    })
    return false
  }
  return true
}

export function registerClickUpRoutes(app: Express, getToken: () => string | undefined) {
  app.get('/api/health', (_req: Request, res: Response) => {
    const token = getToken()
    res.json({
      ok: true,
      clickupConfigured: Boolean(token?.trim()),
    })
  })

  app.get('/api/clickup/user', async (_req: Request, res: Response) => {
    const token = getToken()
    if (!requireToken(res, token)) return
    try {
      const user = await clickupRequest<Record<string, unknown>>(token!, '/user')
      res.json({ ok: true, user })
    } catch (e) {
      const err = e as { status?: number; body?: unknown }
      res.status(err.status ?? 502).json({
        ok: false,
        error: 'ClickUp /user request failed',
        details: err.body ?? String(e),
      })
    }
  })

  app.get('/api/clickup/workspaces', async (_req: Request, res: Response) => {
    const token = getToken()
    if (!requireToken(res, token)) return
    try {
      const data = await clickupRequest<{ teams?: WorkspaceSummary[] }>(
        token!,
        '/team',
      )
      const teams = data.teams ?? []
      res.json({
        ok: true,
        workspaces: teams.map((t) => ({ id: String(t.id), name: t.name })),
      })
    } catch (e) {
      const err = e as { status?: number; body?: unknown }
      res.status(err.status ?? 502).json({
        ok: false,
        error: 'ClickUp /team request failed',
        details: err.body ?? String(e),
      })
    }
  })

  app.get('/api/clickup/workspace/:teamId/spaces', async (req: Request, res: Response) => {
    const token = getToken()
    if (!requireToken(res, token)) return
    const { teamId } = req.params
    try {
      const data = await clickupRequest<{ spaces?: unknown[] }>(
        token!,
        `/team/${encodeURIComponent(teamId)}/space`,
      )
      res.json({ ok: true, spaces: data.spaces ?? [] })
    } catch (e) {
      const err = e as { status?: number; body?: unknown }
      res.status(err.status ?? 502).json({
        ok: false,
        error: `ClickUp spaces for team ${teamId} failed`,
        details: err.body ?? String(e),
      })
    }
  })

  app.get('/api/clickup/list/:listId/tasks', async (req: Request, res: Response) => {
    const token = getToken()
    if (!requireToken(res, token)) return
    const { listId } = req.params
    const archived = req.query.archived === 'true'
    const q = new URLSearchParams()
    if (archived) q.set('archived', 'true')
    const qs = q.toString()
    const path = `/list/${encodeURIComponent(listId)}/task${qs ? `?${qs}` : ''}`
    try {
      const data = await clickupRequest<{ tasks?: unknown[] }>(token!, path)
      res.json({ ok: true, tasks: data.tasks ?? [] })
    } catch (e) {
      const err = e as { status?: number; body?: unknown }
      res.status(err.status ?? 502).json({
        ok: false,
        error: `ClickUp tasks for list ${listId} failed`,
        details: err.body ?? String(e),
      })
    }
  })
}
