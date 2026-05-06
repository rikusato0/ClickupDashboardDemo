/**
 * Express API origin for production splits (frontend on one host, API on another).
 * Set in root `.env` at build time: `VITE_API_BASE_URL=https://api.yourdomain.com`
 * No trailing slash. Leave unset when the same domain reverse-proxies `/api` to the server.
 */
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)
  ?.trim()
  .replace(/\/$/, '')

export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  if (!API_BASE) return p
  return `${API_BASE}${p}`
}
