// Rulează după `vite build`: scrie `dist/sw.js` din `scripts/sw-template.js`, cu lista fișierelor de pus în cache
// și o versiune care se schimbă doar când se schimbă fișierele (primele 12 caractere ale unui SHA-256 peste nume și conținut).
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const fail = (msg) => {
  console.error(`build-sw: ${msg}`)
  process.exit(1)
}
if (!existsSync(join(dist, 'index.html'))) fail(`lipsește ${join(dist, 'index.html')}; întâi: vite build`)

/** Toate fișierele din `dir`, cu drumul relativ la `dist`, scris cu `/`. */
function listFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    return statSync(p).isDirectory() ? listFiles(p) : [relative(dist, p).split(sep).join('/')]
  })
}

// `index.html` ajunge în cache ca './' (adresa la care se deschide jocul); restul, în ordine alfabetică.
const files = listFiles(dist).filter((f) => f !== 'sw.js' && f !== 'index.html').sort()
const urls = ['./', ...files.map((f) => `./${f}`)]
const hash = createHash('sha256')
let bytes = 0
for (const f of ['index.html', ...files]) {
  const body = readFileSync(join(dist, f))
  bytes += body.length
  hash.update(f).update('\0').update(body).update('\0')
}
const version = hash.digest('hex').slice(0, 12)

// Primul rând al șablonului numește și el locurile de umplut; în fișierul scris spune doar de unde vine.
const template = readFileSync(join(root, 'scripts', 'sw-template.js'), 'utf8')
const head = /^\/\/ Generat la build:.*\n/
if (!head.test(template) || !template.includes('wg-__VERSION__') || !template.includes('const FILES = __FILES__')) fail('șablonul nu are forma așteptată')
const sw = template
  .replace(head, '// Generat de scripts/build-sw.mjs din scripts/sw-template.js; nu se scrie de mână.\n')
  .replace('wg-__VERSION__', `wg-${version}`)
  .replace('const FILES = __FILES__', `const FILES = ${JSON.stringify(urls, null, 2)}`)
if (sw.includes('__VERSION__') || sw.includes('__FILES__')) fail('au rămas locuri neumplute în sw.js')
writeFileSync(join(dist, 'sw.js'), sw)
console.log(`build-sw: ${urls.length} fișiere în cache (${bytes} octeți), versiunea ${version}`)
