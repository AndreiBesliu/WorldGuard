// `npm run balance`: tipărește tabelul jucătorilor automați. Doar afișează; limitele le păzesc testele.
// Sub tabel, un rând de informație: „Amestec” cu toate întăririle la plafon. Cu `--raze` tipărește și tabelele pentru razele de apărare 80 și 160.
import { MAX_UPS } from '../data/workshop'
import { boostedLine, formatTable } from './limits'
import { GUARD, POLICIES } from './policy'
import { measure, measureAll } from './run'

console.log(`Raza de apărare ${GUARD}`)
const rows = measureAll()
console.log(formatTable(rows))
// Sub tabel, doar informație: „Amestec” cu toate întăririle din atelier la plafon.
const mix = rows.find((r) => r.name === 'amestec')!
console.log(boostedLine(mix.median, measure(POLICIES.find((p) => p.name === 'amestec')!, GUARD, MAX_UPS).median))
if (process.argv.includes('--raze')) {
  for (const guard of [80, 160]) {
    console.log(`\nRaza de apărare ${guard}`)
    console.log(formatTable(measureAll(guard)))
  }
}
