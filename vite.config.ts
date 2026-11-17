import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  // Project pages are served from /QuestionSpace/ on GitHub Pages.
  base: command === 'build' ? '/QuestionSpace/' : '/',
  plugins: [react()],
  server: { port: 5173 },
}))
