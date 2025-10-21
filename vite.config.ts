import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    open: true,
    cors: true,
    hmr: {
      overlay: true,
    },
    headers: {
      'Cache-Control': 'no-store',
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
    force: true,
  },
  clearScreen: false,
  cacheDir: 'node_modules/.vite',
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
})
