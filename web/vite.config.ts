/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { injetarPoliticaDeSeguranca } from './vite.csp'

// Nao entra no servidor de desenvolvimento: o Vite precisa de scripts inline e de WebSocket para o HMR.
const politicaDeSeguranca = {
  name: 'voz-politica-de-seguranca',
  apply: 'build' as const,
  transformIndexHtml: injetarPoliticaDeSeguranca,
}

export default defineConfig({
  // RN-WEB-PUBLICACAO-001: o deploy no GitHub Pages usa VITE_BASE=/voz-br/; em desenvolvimento vale /.
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), tailwindcss(), politicaDeSeguranca],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { host: true, port: 5173 },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
