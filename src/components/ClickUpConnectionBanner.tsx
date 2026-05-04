import { useEffect, useState } from 'react'
import { cn } from '../utils/cn'

type HealthPayload = {
  ok: boolean
  clickupConfigured?: boolean
}

type WorkspacesPayload =
  | {
      ok: true
      workspaces: { id: string; name: string }[]
    }
  | {
      ok: false
      error?: string
      details?: unknown
    }

type UserPayload =
  | { ok: true; user: { username?: string; email?: string; id?: number } }
  | { ok: false; error?: string; details?: unknown }

type BannerState =
  | { kind: 'loading' }
  | { kind: 'api_unavailable'; message: string }
  | { kind: 'token_missing' }
  | { kind: 'clickup_error'; message: string }
  | {
      kind: 'connected'
      username?: string
      workspaces: { id: string; name: string }[]
    }

export function ClickUpConnectionBanner() {
  const [state, setState] = useState<BannerState>({ kind: 'loading' })

  useEffect(() => {
    let cancelled = false

    async function run() {
      try {
        const healthRes = await fetch('/api/health')
        const health = (await healthRes.json()) as HealthPayload
        if (cancelled) return

        if (!healthRes.ok || !health.ok) {
          setState({
            kind: 'api_unavailable',
            message:
              'Backend unreachable. Run `npm run dev` (starts API on port 3001) or open the dashboard via Vite with proxy.',
          })
          return
        }

        if (!health.clickupConfigured) {
          setState({ kind: 'token_missing' })
          return
        }

        const [userRes, wsRes] = await Promise.all([
          fetch('/api/clickup/user').then((r) => r.json() as Promise<UserPayload>),
          fetch('/api/clickup/workspaces').then(
            (r) => r.json() as Promise<WorkspacesPayload>,
          ),
        ])
        if (cancelled) return

        if (!userRes.ok) {
          setState({
            kind: 'clickup_error',
            message: userRes.error ?? 'Could not load ClickUp user',
          })
          return
        }

        if (!wsRes.ok) {
          setState({
            kind: 'clickup_error',
            message: wsRes.error ?? 'Could not load workspaces',
          })
          return
        }

        const username =
          userRes.user.username ??
          userRes.user.email ??
          (userRes.user.id != null ? `User ${userRes.user.id}` : undefined)

        setState({
          kind: 'connected',
          username,
          workspaces: wsRes.workspaces,
        })
      } catch {
        if (!cancelled) {
          setState({
            kind: 'api_unavailable',
            message:
              'Backend unreachable. Run `npm run dev` (starts API on port 3001) or open the dashboard via Vite with proxy.',
          })
        }
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [])

  if (state.kind === 'loading') {
    return (
      <div className="rounded-lg border border-wl-surface bg-wl-card px-3 py-2 text-xs text-wl-ink-muted">
        Checking ClickUp API connection…
      </div>
    )
  }

  if (state.kind === 'api_unavailable') {
    return (
      <div
        className={cn(
          'rounded-lg border border-wl-orange/40 bg-wl-card px-3 py-2 text-xs text-wl-ink',
        )}
        role="status"
      >
        {state.message}
      </div>
    )
  }

  if (state.kind === 'token_missing') {
    return (
      <div
        className={cn(
          'rounded-lg border border-wl-orange/40 bg-wl-card px-3 py-2 text-xs text-wl-ink',
        )}
        role="status"
      >
        ClickUp token not configured on the API server. Copy{' '}
        <code className="rounded bg-wl-surface px-1 py-0.5 font-mono text-[10px]">
          server/.env.example
        </code>{' '}
        to{' '}
        <code className="rounded bg-wl-surface px-1 py-0.5 font-mono text-[10px]">
          server/.env
        </code>{' '}
        and set{' '}
        <code className="rounded bg-wl-surface px-1 py-0.5 font-mono text-[10px]">
          CLICKUP_API_TOKEN
        </code>
        .
      </div>
    )
  }

  if (state.kind === 'clickup_error') {
    return (
      <div
        className={cn(
          'rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-wl-ink',
        )}
        role="alert"
      >
        <span className="font-semibold">ClickUp API:</span> {state.message}
      </div>
    )
  }

  const wsLabel =
    state.workspaces.length === 0
      ? 'No workspaces'
      : state.workspaces.length === 1
        ? state.workspaces[0]!.name
        : `${state.workspaces.length} workspaces`

  return (
    <div
      className={cn(
        'rounded-lg border border-wl-teal/40 bg-wl-teal-soft px-3 py-2 text-xs text-wl-ink',
      )}
      role="status"
    >
      <span className="font-semibold text-wl-teal-muted">ClickUp API connected</span>
      {state.username ? (
        <>
          {' — '}
          <span className="text-wl-ink-muted">{state.username}</span>
        </>
      ) : null}
      {' · '}
      <span className="text-wl-ink-muted">{wsLabel}</span>
    </div>
  )
}
