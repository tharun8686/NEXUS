import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: "/", // ✅ REQUIRED for Vercel (prevents 404 on assets)
})