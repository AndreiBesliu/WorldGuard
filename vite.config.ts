import { defineConfig } from 'vitest/config'

export default defineConfig({
  base: './',
  server: { port: 5180 },
  define: { __WG_SW__: 'true' },   // build-ul obișnuit are service worker; cel într-un singur fișier îl stinge
  test: {
    include: ['src/**/*.test.ts'],
  },
})
