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
  | { kind: 'clickup_error'; message: string; details?: unknown }
  | {
      kind: 'connected'
      username?: string
      workspaces: { id: string; name: string }[]
    }

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(path)
  const data = (await res.json()) as T
  if (!res.ok) {
    throw new Error(typeof data === 'object' && data && 'error' in data ? String((data as { error: unknown }).error) : res.statusText)
  }
  return data
}

export function ClickUpConnectionBanner() {
  const [state, setState] = useState<BannerState>({ kind: 'loading' })

  useEffect(() => {
    let cancelled = false

    async function run() {
      try {
        const health = await fetchJson<HealthPayload>('/api/health')
        if (cancelled) return

        if (!health.clickupConfigured) {
          setState({ kind: 'token_missing' })
          return
        }

        const [userRes, wsRes] = await Promise.all([
          fetch('/api/clickup/user').then((r) => r.json() as Promise<UserPayload>),
          fetch('/api/clickup/workspaces').then((r) => r.json() as Promise<WorkspacesPayload>),
        ])
        if (cancelled) return

        if (!userRes.ok) {
          setState({
            kind: 'clickup_error',
            message: userRes.error ?? 'Could not load ClickUp user',
            details: userRes.details,
          })
          return
        }

        if (!wsRes.ok) {
          setState({
            kind: 'clickup_error',
            message: wsRes.error ?? 'Could not load workspaces',
            details: wsRes.details,
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
          'rounded-lg border px-3 py-2 text-xs',
          'border-amber-500/35 bg-amber-500/10 text-amber-950 dark:text-amber-100',
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
          'rounded-lg border px-3 py-2 text-xs',
          'border-amber-500/35 bg-amber-500/10 text-amber-950 dark:text-amber-100',
        )}
        role="status"
      >
        ClickUp token not configured on the API server. Copy{' '}
        <code className="rounded bg-black/10 px-1 py-0.5 font-mono text-[10px]">
          server/.env.example
        </code>{' '}
        to{' '}
        <code className="rounded bg-black/10 px-1 py-0.5 font-mono text-[10px]">
          server/.env
        </code>{' '}
        and set{' '}
        <code className="rounded bg-black/10 px-1 py-0.5 font-mono text-[10px]">
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
          'rounded-lg border px-3 py-2 text-xs',
          'border-red-500/35 bg-red-500/10 text-red-950 dark:text-red-100',
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
        'rounded-lg border px-3 py-2 text-xs',
        'border-emerald-600/25 bg-emerald-600/10 text-emerald-950 dark:text-emerald-100',
      )}
      role="status"
    >
      <span className="font-semibold">ClickUp API connected</span>
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
