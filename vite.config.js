import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    __firebase_config: JSON.stringify(process.env.__firebase_config),
    __app_id: JSON.stringify(process.env.__app_id || 'impulse-academy-prod'),
    __initial_auth_token: 'undefined'
  }
})