import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Default to building directly into the backend's static directory for non-Docker runs.
    // The Dockerfile sets VITE_OUT_DIR=dist to keep the build self-contained.
    outDir: process.env.VITE_OUT_DIR || '../backend/dist',
    emptyOutDir: true,
  },
})
