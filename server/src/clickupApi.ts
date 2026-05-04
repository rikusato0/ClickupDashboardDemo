const CLICKUP_API_BASE = 'https://api.clickup.com/api/v2'

export type ClickUpHttpError = {
  status: number
  body: unknown
}

export async function clickupRequest<T>(
  token: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = `${CLICKUP_API_BASE}${path.startsWith('/') ? path : `/${path}`}`
  const headers = new Headers(init?.headers ?? undefined)
  headers.set('Authorization', token)

  const res = await fetch(url, {
    ...init,
    headers,
  })

  const text = await res.text()
  let body: unknown
  if (!text) {
    body = null
  } else {
    try {
      body = JSON.parse(text)
    } catch {
      body = text
    }
  }

  if (!res.ok) {
    const err: ClickUpHttpError = { status: res.status, body }
    throw err
  }

  return body as T
}
