// `npm run balance`: tipărește tabelul jucătorilor automați. Doar afișează; limitele le păzesc testele.
// Sub tabel, rânduri de informație: „Amestec” cu toate întăririle la plafon și cât aduce un zbor condus de script (măsurătoarea
// prețurilor din atelier). Cu `--raze` tipărește și tabelele pentru razele de apărare 80 și 160.
import { MAX_UPS } from '../data/workshop'
import { flightYield, MEASURED, YIELD_SECTOR, YIELD_SEEDS } from './flightYield'
import { boostedLine, formatTable } from './limits'
import { GUARD, POLICIES } from './policy'
import { measure, measureAll } from './run'

console.log(`Raza de apărare ${GUARD}`)
const rows = measureAll()
console.log(formatTable(rows))
// Sub tabel, doar informație: „Amestec” cu toate întăririle din atelier la plafon.
const mix = rows.find((r) => r.name === 'amestec')!
console.log(boostedLine(mix.median, measure(POLICIES.find((p) => p.name === 'amestec')!, GUARD, MAX_UPS).median))
// Zborul: mediana pe semințele 1…10; dacă diferă de `MEASURED`, testul țintelor de preț citește o cifră veche.
const got = flightYield(YIELD_SECTOR, YIELD_SEEDS), num = (n: number): string => String(n).replace('.', ',')
const stale = got.crystal !== MEASURED.crystal || got.metal !== MEASURED.metal
console.log(`Zbor, sectorul ${YIELD_SECTOR}, navă condusă de script: ${num(got.crystal)} cristale, ${num(got.metal)} metal`
  + (stale ? ` (ALTFEL decât MEASURED din src/bots/flightYield.ts: ${num(MEASURED.crystal)}, ${num(MEASURED.metal)}; adu-l la zi)` : ''))
if (process.argv.includes('--raze')) {
  for (const guard of [80, 160]) {
    console.log(`\nRaza de apărare ${guard}`)
    console.log(formatTable(measureAll(guard)))
  }
}
