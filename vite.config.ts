import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/** Dev + preview: forward API to Express (port 3001). Without this, /api/* returns index.html and JSON.parse throws. */
const apiProxy = {
  '/api': {
    target: 'http://localhost:3001',
    changeOrigin: true,
  },
} as const

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: { ...apiProxy },
  },
  preview: {
    proxy: { ...apiProxy },
  },
})
