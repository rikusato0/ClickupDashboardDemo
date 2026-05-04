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
      const res = await fetch(`/api/dashboard?from=${from}&to=${to}`)
      const j = (await res.json()) as {
        ok?: boolean
        error?: string
        data?: DashboardSnapshot
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
