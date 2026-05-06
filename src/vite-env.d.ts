/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API origin, no trailing slash — use when the SPA and Express are on different hosts */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
