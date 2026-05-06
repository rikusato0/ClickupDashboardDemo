/* eslint-disable react-hooks/set-state-in-effect, react-refresh/only-export-components -- initial fetch; hook exported with provider */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { format, subDays } from 'date-fns'
import type { DashboardSnapshot } from '../types/dashboard'
import { apiUrl } from '../utils/apiUrl'

type Ctx = {
  snapshot: DashboardSnapshot | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

const DashboardContext = createContext<Ctx | null>(null)

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const to = format(new Date(), 'yyyy-MM-dd')
      const from = format(subDays(new Date(), 540), 'yyyy-MM-dd')
      const res = await fetch(
        apiUrl(`/api/dashboard?from=${from}&to=${to}`),
      )
      const raw = await res.text()
      const ct = res.headers.get('content-type') ?? ''
      if (!ct.includes('application/json')) {
        setError(
          `Dashboard API returned HTML or non-JSON (${res.status}). Same-origin: ensure your host reverse-proxies /api to Express. Split deploy: set VITE_API_BASE_URL to your API origin at build time. Local: run npm run dev (client + server). Preview: ${raw.slice(0, 80)}…`,
        )
        setSnapshot(null)
        return
      }
      let j: {
        ok?: boolean
        error?: string
        data?: DashboardSnapshot
      }
      try {
        j = JSON.parse(raw) as typeof j
      } catch {
        setError(
          `Dashboard API is not valid JSON. Check API URL (VITE_API_BASE_URL) and that /api/dashboard returns JSON. Raw: ${raw.slice(0, 120)}…`,
        )
        setSnapshot(null)
        return
      }
      if (!res.ok || !j.ok) {
        setError(j.error ?? res.statusText)
        setSnapshot(null)
        return
      }
      setSnapshot(j.data ?? null)
    } catch (e) {
      setError(String(e))
      setSnapshot(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return (
    <DashboardContext.Provider value={{ snapshot, loading, error, refresh }}>
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  const v = useContext(DashboardContext)
  if (!v) {
    throw new Error('useDashboard must be used within DashboardProvider')
  }
  return v
}
