import { defineConfig } from 'vite'

// Doar pentru `npm run balance`: tabelul jucătorilor automați, construit ca script pentru node (fără pictograme, fără joc).
export default defineConfig({
  publicDir: false,
  logLevel: 'warn',
  build: { ssr: 'src/bots/table.ts', outDir: 'dist-balance', emptyOutDir: true },
})
