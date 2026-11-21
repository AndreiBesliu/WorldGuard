// Legarea zborului: sesiunea lui (rezerva și sectorul explorat scrise în profilul din stocare), banda lui, sectorul ales pe cartonașul
// de start și sectorul de după un zbor încheiat. `main.ts` alege modul de joc, arată cartonașele și ține singurul ciclu de cadre.
import { createFlightSession, type FlightOver, type FlightSession } from './app/flightSession'
import { bank, markExplored, type Profile } from './app/profile'
import { loadProfile, saveProfile } from './app/storage'
import type { FlightInput } from './flight/state'
import { flightKeys } from './input/bind'
import { dragTake, type Drag } from './input/drag'
import { DT, type Input } from './sim/state'
import { stepSector } from './ui/cards'
import { createFlightHud } from './ui/flightHud'

const STILL: FlightInput = { dx: 0, dy: 0 }

export interface FlightMode {
  readonly session: FlightSession
  /** Profilul de acum (citit din nou, deci cu tot ce a adus ultimul zbor) și sectorul propus: cel mai departe explorat plus unu. */
  startCard(): { profile: Profile; sector: number }
  /** Sectorul ales pe cartonașul de start (ținut doar aici): cel pornit de „Explorează galaxia”. */
  sector(): number
  /** O apăsare pe − sau + de pe cartonașul de start: sectorul ales, în margini, și cel mai departe explorat. */
  pick(delta: -1 | 1): { sector: number; farthest: number }
  /** „Sectorul următor” după un sector explorat, „Încă un zbor” (același sector) după o navă doborâtă. */
  nextSector(): number
  /** Un zbor nou, cu banda lui în locul benzii apărării. */
  begin(seed: number, sector: number): void
  /** Înapoi la start: zborul pus pe pauză se încheie fără sector explorat (strânsul e deja în rezervă), banda apărării revine. */
  end(): void
  /** Pașii cadrului, cu mișcarea navei (degetul, citit doar când se fac pași, altfel s-ar pierde, și tastele); sfârșitul, o dată. */
  advance(steps: number): FlightOver | null
  /** Banda, din starea zborului (pagina se atinge doar unde s-a schimbat ceva). */
  sync(): void
}

export function createFlightMode(doc: Document, input: { drag: Drag; keys(): Input }): FlightMode {
  const session = createFlightSession({
    ups: () => loadProfile().ups,
    bank: (haul) => saveProfile(bank(loadProfile(), haul)),
    explored: (sector) => saveProfile(markExplored(loadProfile(), sector)),
  })
  const hud = createFlightHud(doc)
  let chosen = 1, farthest = 0
  let last: FlightOver | null = null

  return {
    session,
    startCard() {
      const profile = loadProfile()
      farthest = profile.sector
      chosen = farthest + 1
      return { profile, sector: chosen }
    },
    sector: () => chosen,
    pick(delta) {
      chosen = stepSector(chosen, delta, farthest)
      return { sector: chosen, farthest }
    },
    nextSector: () => (last === null ? chosen : last.explored ? last.sector + 1 : last.sector),
    begin(seed, sector) {
      last = null
      session.start(seed, sector)
      hud.show(true)
      hud.sync(session.f)
    },
    end() {
      session.quit()
      hud.show(false)
    },
    advance(steps) {
      let move = STILL
      if (steps > 0) {
        const d = dragTake(input.drag), k = flightKeys(input.keys(), steps * DT)
        move = { dx: d.dx + k.dx, dy: d.dy + k.dy }
      }
      const over = session.advance(steps, move)
      if (over !== null) last = over
      return over
    },
    sync: () => hud.sync(session.f),
  }
}
