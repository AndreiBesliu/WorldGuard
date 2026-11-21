// `npm run balance`: tipărește tabelul jucătorilor automați. Doar afișează; limitele le păzesc testele.
// Sub tabel, rânduri de informație: „Amestec” cu toate întăririle la plafon, cât aduce un zbor condus de script și câte astfel de
// zboruri costă tot atelierul (măsurătoarea prețurilor, făcută pe loc; ținta de preț se judecă de aici, la reglaj).
// Cu `--raze` tipărește și tabelele pentru razele de apărare 80 și 160.
import { MAX_UPS, UP_IDS, WORKSHOP, upPrice } from '../data/workshop'
import { flightYield, YIELD_SECTOR, YIELD_SEEDS } from './flightYield'
import { boostedLine, formatTable } from './limits'
import { GUARD, POLICIES } from './policy'
import { measure, measureAll } from './run'

console.log(`Raza de apărare ${GUARD}`)
const rows = measureAll()
console.log(formatTable(rows))
// Sub tabel, doar informație: „Amestec” cu toate întăririle din atelier la plafon.
const mix = rows.find((r) => r.name === 'amestec')!
console.log(boostedLine(mix.median, measure(POLICIES.find((p) => p.name === 'amestec')!, GUARD, MAX_UPS).median))
// Zborul: mediana pe semințele 1…10, măsurată acum.
const got = flightYield(YIELD_SECTOR, YIELD_SEEDS)
const num = (n: number, digits = 1): string => String(Math.round(n * 10 ** digits) / 10 ** digits).replace('.', ',')
console.log(`Zbor, sectorul ${YIELD_SECTOR}, navă condusă de script: ${num(got.crystal)} cristale, ${num(got.metal)} metal`)
// Tot atelierul, toate întăririle de la treapta 1 la plafon, în astfel de zboruri, pe resursa care cere mai multe.
const all = UP_IDS.flatMap((id) => Array.from({ length: WORKSHOP[id].max }, (_, i) => upPrice(id, i + 1)))
const sum = all.reduce((s, p) => ({ crystal: s.crystal + p.crystal, metal: s.metal + p.metal }), { crystal: 0, metal: 0 })
const byCrystal = sum.crystal / got.crystal, byMetal = sum.metal / got.metal
const most = byCrystal >= byMetal ? 'cristale' : 'metal'
console.log(`Atelierul la plafon (${sum.crystal} cristale, ${sum.metal} metal): ${num(Math.max(byCrystal, byMetal))} zboruri, după ${most}`
  + ` (${num(byCrystal)} la cristale, ${num(byMetal)} la metal)`)
if (process.argv.includes('--raze')) {
  for (const guard of [80, 160]) {
    console.log(`\nRaza de apărare ${guard}`)
    console.log(formatTable(measureAll(guard)))
  }
}
