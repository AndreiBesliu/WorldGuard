import { defineConfig } from 'vitest/config'

export default defineConfig({
  server: { port: 5180 },
  test: {
    include: ['src/**/*.test.ts'],
  },
})
