// Ce sunet face fiecare lucru din joc: evenimentele unui pas (`events.ts`) și deciziile jucătorului. Pur: întoarce
// doar numele sunetelor și poziția lor în stereo (după locul de pe hartă), ca maparea să se poată testa fără browser.

import type { EnemyType } from '../data/enemies'
import type { SoundId, StareFundal } from '../data/sunete'
import type { StepEvent } from '../events'
import { MILI_HEX } from '../data/joc'
import type { Decision, GameState } from '../sim/game'
import { fromKey, type Hex } from '../sim/hex'

export interface Cue {
  readonly sunet: SoundId
  /** Poziția în stereo, de la −1 (stânga) la 1 (dreapta). */
  readonly pan: number
}

/** Inamicii care sună (și întunecă fundalul) ca un boss: bossul și Paznicul inimii. */
const BOSSI: readonly EnemyType[] = ['boss', 'paznic']

/** Cât de larg e stereo-ul: marginile hărții nu se aud doar într-o ureche. */
const LARGIME_STEREO = 0.6

/** Poziția în stereo a unui hexagon: după cât de la stânga sau la dreapta e pe hartă. */
export function panOf(h: Hex, raza: number): number {
  const x = (h.q + h.r / 2) / (raza + 0.5)
  return Math.max(-1, Math.min(1, x)) * LARGIME_STEREO
}

/** Hexagonul de drum de la un progres (mili-hexagoane). */
const pathHex = (s: GameState, progres: number): Hex => s.path[Math.max(0, Math.min(s.path.length - 1, Math.round(progres / MILI_HEX)))] as Hex

/** Sunetele pasului: `before` e starea de dinaintea lui (drumul și harta sunt aceleași în tot valul). */
export function stepCues(events: readonly StepEvent[], before: GameState): Cue[] {
  const raza = before.map.radius
  const peDrum = (progres: number): number => panOf(pathHex(before, progres), raza)
  const out: Cue[] = []
  for (const ev of events) {
    switch (ev.tip) {
      case 'reactie':
        out.push({ sunet: ev.reactie, pan: peDrum(ev.progres) })
        break
      case 'lovitura':
        // Un grup combinat sună ca toate elementele lui deodată.
        for (const t of ev.turnuri) out.push({ sunet: `turn-${t}`, pan: panOf(fromKey(ev.hex), raza) })
        break
      case 'ucis':
        out.push({ sunet: BOSSI.includes(ev.inamic.tip) ? 'boss-ucis' : 'ucis', pan: peDrum(ev.inamic.progres) })
        break
      case 'scapat':
        out.push({ sunet: 'baza', pan: panOf(before.map.base, raza) })
        break
      case 'aparut':
        if (BOSSI.includes(ev.inamic.tip)) out.push({ sunet: 'boss', pan: panOf(before.map.spawn, raza) })
        break
      case 'puls':
        out.push({ sunet: 'puls', pan: peDrum(ev.progres) })
        break
      case 'sfarsit':
        out.push({ sunet: ev.faza === 'pregatire' ? 'val-gata' : ev.faza, pan: 0 })
        break
      case 'lovit':
        break // prea des ca să sune: se vede (inamicul clipește)
    }
  }
  return out
}

/** Sunetul unei decizii acceptate. */
export function decisionSound(d: Decision): SoundId {
  switch (d.tip) {
    case 'turn':
      return 'construire'
    case 'mina':
      return 'mina'
    case 'teren':
      return `teren-${d.actiune}`
    case 'ocol':
      return 'ocol'
    case 'pornesteVal':
      return 'val-start'
    case 'alege':
      return 'carte'
    case 'tintire':
      return 'clic'
    case 'combina':
      return 'combina'
  }
}

/** Unde se aude o decizie: la hexagonul ei, dacă are unul; altfel în mijloc. */
export function decisionPan(d: Decision, s: GameState): number {
  if (d.tip === 'turn' || d.tip === 'mina' || d.tip === 'teren') return panOf(fromKey(d.hex), s.map.radius)
  if (d.tip === 'ocol') return panOf(s.path[d.start] ?? s.map.spawn, s.map.radius)
  return 0
}

/** Starea fundalului muzical: pregătirea e calmă, valul tensionat, un boss pe hartă întunecă totul; după final, liniște. */
export function stareFundal(s: GameState): StareFundal {
  if (s.faza === 'pregatire') return 'pregatire'
  if (s.faza === 'val') return s.inamici.some((e) => BOSSI.includes(e.tip)) ? 'boss' : 'val'
  return 'liniste'
}
