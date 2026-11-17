import { mergeConfig } from 'vite'
import base from './vite.config'

// Aceeași configurare, dar totul (și fonturile) intră în CSS și JS, ca să poată fi lipit într-un singur fișier
export default mergeConfig(base, {
  build: {
    outDir: 'dist-single',
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    modulePreload: false,
  },
})
