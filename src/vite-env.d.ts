/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Canonical browser origin for this SPA (e.g. https://metrics.whitelotusbk.ai) */
  readonly VITE_APP_ORIGIN?: string
  /** API origin, no trailing slash — use when the SPA and Express are on different hosts */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
