import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    port: mode === 'development' ? 3013 : 3005,
    host: '0.0.0.0'
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
}))
