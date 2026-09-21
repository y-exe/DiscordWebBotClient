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
    ]
  }
})