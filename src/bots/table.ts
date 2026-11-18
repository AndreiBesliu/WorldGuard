// `npm run balance`: tipărește tabelul jucătorilor automați. Doar afișează; limitele le păzesc testele.
// Cu `--raze` tipărește și tabelele pentru razele de apărare 80 și 160.
import { formatTable } from './limits'
import { GUARD } from './policy'
import { measureAll } from './run'

console.log(`Raza de apărare ${GUARD}`)
console.log(formatTable(measureAll()))
if (process.argv.includes('--raze')) {
  for (const guard of [80, 160]) {
    console.log(`\nRaza de apărare ${guard}`)
    console.log(formatTable(measureAll(guard)))
  }
}
