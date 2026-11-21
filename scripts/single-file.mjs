// Din `dist-single/index.html` face `dist-single/world-guard.html`: un fragment fără <html>/<head>/<body>,
// cu tot CSS-ul și tot JavaScript-ul înăuntru. Rulează după `vite build --config vite.single.config.ts`.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist-single')
const fail = (msg) => {
  console.error(`single-file: ${msg}`)
  process.exit(1)
}

const indexPath = join(dir, 'index.html')
if (!existsSync(indexPath)) fail(`lipsește ${indexPath}; întâi: vite build --config vite.single.config.ts`)
const html = readFileSync(indexPath, 'utf8')

const scripts = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g)]
const styles = [...html.matchAll(/<link\b[^>]*\brel="stylesheet"[^>]*>/g)]
if (scripts.length !== 1) fail(`trebuie exact un script, am găsit ${scripts.length}`)
if (styles.length !== 1) fail(`trebuie exact o foaie de stil, am găsit ${styles.length}`)

const readAsset = (ref) => {
  const file = join(dir, ref.replace(/^\.?\//, ''))
  if (!existsSync(file)) fail(`lipsește ${file}`)
  return readFileSync(file, 'utf8')
}
const hrefMatch = /href="([^"]+)"/.exec(styles[0][0])
if (!hrefMatch) fail('foaia de stil nu are href')

const js = readAsset(scripts[0][1]).replaceAll('</script', '<\\/script')
const css = readAsset(hrefMatch[1]).replaceAll('</style', '<\\/style')

const title = /<title>([\s\S]*?)<\/title>/.exec(html)?.[1]?.trim()
const body = /<body[^>]*>([\s\S]*?)<\/body>/.exec(html)?.[1]
if (!title || body === undefined) fail('index.html nu are <title> sau <body>')
const markup = body.replace(scripts[0][0], '').trim()

// Primul rând e codificarea: fără el, fișierul deschis de mână (nu prin pagina care îl îmbracă) își strică diacriticele.
const CHARSET = '<meta charset="utf-8">'
const out = [
  CHARSET,
  `<title>${title}</title>`,
  '<meta name="claude:viewport-fit-sides" content="cover">',
  `<style>${css}</style>`,
  markup,
  `<script type="module">${js}</script>`,
].join('\n') + '\n'

// Nicio referință spre un fișier: `data:` e în regulă, la fel o trimitere în aceeași pagină (`#…`, cum au pictogramele
// modulelor spre `<symbol>`-urile lor); orice altceva nu
const leftovers = []
for (const m of out.matchAll(/\b(?:src|href)\s*=\s*["']?([^"'\s>]+)/g)) {
  if (!m[1].startsWith('data:') && !m[1].startsWith('#')) leftovers.push(m[0])
}
for (const m of css.matchAll(/url\(\s*["']?([^"')]+)/g)) {
  if (!m[1].startsWith('data:')) leftovers.push(`url(${m[1].slice(0, 60)})`)
}
if (leftovers.length > 0) fail(`au rămas referințe spre fișiere: ${leftovers.slice(0, 5).join(', ')}`)

// Pagina privată nu se instalează și nu are service worker: legăturile spre manifest și spre pictogramă (și culoarea temei)
// stau în <head>, din care fragmentul ia doar <title>, deci rămân pe dinafară; aici se verifică asta, la fel și `sw.js`.
const install = ['manifest.webmanifest', 'icons/icon', 'theme-color', 'sw.js'].filter((s) => out.includes(s))
if (install.length > 0) fail(`au rămas în fragment urme ale instalării: ${install.join(', ')}`)

if (!out.startsWith(`${CHARSET}\n`)) fail(`fragmentul trebuie să înceapă cu ${CHARSET}`)

const target = join(dir, 'world-guard.html')
writeFileSync(target, out)
console.log(`single-file: ${target} (${Buffer.byteLength(out)} octeți)`)
