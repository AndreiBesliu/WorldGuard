import { defineConfig } from 'vitest/config'

// Amprenta build-ului: ce commit rulează și când a fost construit. În GitHub Actions vin din workflow
// (BUILD_SHA, BUILD_REF); local, „local”. Jocul o afișează în colț, ca „ce e publicat” să nu fie o presupunere.
const build = {
  sha: process.env.BUILD_SHA ?? 'local',
  ref: process.env.BUILD_REF ?? '',
  at: new Date().toISOString(),
}

export default defineConfig({
  server: { port: 5180 },
  define: {
    __BUILD__: JSON.stringify(build),
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
})
