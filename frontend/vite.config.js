import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  envPrefix: ['VITE_', 'GA_'],
  plugins: [
    react()
  ], 
  server: {
    host: true, 
    allowedHosts: [
      'localhost'
    ],
    proxy: {
      '/api': 'http://127.0.0.1:8000',
      '/socket.io': {
        target: 'http://127.0.0.1:8000',
        ws: true
      }
    }
  }
})
