import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    port: mode === 'development' ? 3013 : 3005,
    host: '0.0.0.0',
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      'jenkins.finalmoment.ai',
      '.finalmoment.ai'
    ]
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
}))
