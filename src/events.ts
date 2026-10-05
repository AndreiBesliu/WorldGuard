// Ce s-a întâmplat într-un pas de simulare, citit din diferența dintre starea de dinainte și cea de după: cine a
// tras, ce reacții au avut loc, cine a fost lovit, ucis, a scăpat la bază sau a apărut, și dacă valul s-a încheiat.
//
// Din lista asta se hrănesc și efectele de pe ecran (`render/fx.ts`), și sunetul (`audio/`), ca cele două să nu
// tragă concluzii diferite despre același pas. E pur și determinist: nu schimbă nimic, nu știe de ecran sau de
// difuzoare, iar simularea nu-l folosește.

import { ENEMIES } from './data/enemies'
import type { ReactionType } from './data/reactions'
import type { TowerType } from './data/towers'
import { enemySpeed, groupOf, pathLength, type Enemy, type GameState } from './sim/game'

export type StepEvent =
  /** O reacție (din `GameState.evenimente`), unde s-a produs pe drum. */
  | { readonly tip: 'reactie'; readonly reactie: ReactionType; readonly inamic: number; readonly progres: number }
  /**
   * Un turn a tras, sau un grup combinat (o singură lovitură, a liderului). `turnuri` = tipurile care au lovit,
   * fiecare o dată, în ordinea turnurilor; `hex` = turnul care a tras (liderul, la un grup).
   */
  | { readonly tip: 'lovitura'; readonly turnuri: readonly TowerType[]; readonly hex: string; readonly combinat: boolean }
  /** Un inamic care a pierdut viață și a rămas în viață. */
  | { readonly tip: 'lovit'; readonly inamic: number }
  /** Un inamic ucis: cum era la începutul pasului (tipul, locul). */
  | { readonly tip: 'ucis'; readonly inamic: Enemy }
  /** Un inamic ajuns la bază (a luat vieți). */
  | { readonly tip: 'scapat'; readonly inamic: Enemy }
  /** Un inamic nou, apărut la intrare. */
  | { readonly tip: 'aparut'; readonly inamic: Enemy }
  /** Pulsul Paznicului inimii: a născut inamici acolo unde e (`progres`). */
  | { readonly tip: 'puls'; readonly progres: number }
  /** Valul s-a încheiat: urmează pregătirea, sau partida s-a terminat. */
  | { readonly tip: 'sfarsit'; readonly faza: 'pregatire' | 'castigat' | 'pierdut' }

/**
 * Evenimentele pasului `before` → `after` (`after = step(before)`), în ordinea: reacții, lovituri, inamicii loviți,
 * uciși sau scăpați, cei apăruți, sfârșitul valului. Fără pas (același tick), lista e goală.
 */
export function stepEvents(before: GameState, after: GameState): StepEvent[] {
  if (after.tick === before.tick) return []
  const out: StepEvent[] = []
  for (const ev of after.evenimente) out.push({ tip: 'reactie', reactie: ev.tip, inamic: ev.inamic, progres: ev.progres })

  // Loviturile: un turn care a tras în pasul ăsta are `lovitura.tick` = tick-ul nou. Turnurile unui grup combinat
  // primesc toate aceeași lovitură; e una singură.
  const numarate = new Set<number>()
  for (const t of after.turnuri) {
    if (t.lovitura?.tick !== after.tick || numarate.has(t.id)) continue
    const grup = t.combinat ? groupOf(after.turnuri, t.id) : [t]
    for (const m of grup) numarate.add(m.id)
    out.push({ tip: 'lovitura', turnuri: [...new Set(grup.map((m) => m.tip))], hex: t.hex, combinat: t.combinat })
  }

  // Inamicii de dinainte: încă vii (loviți sau nu), ajunși la bază (în primul pas al tick-ului, înaintea turnurilor),
  // sau uciși.
  const vii = new Map(after.inamici.map((e) => [e.id, e]))
  const capat = pathLength(before)
  for (const e of before.inamici) {
    const acum = vii.get(e.id)
    if (acum) {
      if (acum.viata < e.viata) out.push({ tip: 'lovit', inamic: e.id })
    } else if (e.progres + enemySpeed(e) >= capat) out.push({ tip: 'scapat', inamic: e })
    else out.push({ tip: 'ucis', inamic: e })
  }
  // Cei apăruți: programările consumate în pasul ăsta, cu id-urile date în ordine. Unul lovit mortal chiar la apariție
  // nu mai e în nicio listă de inamici, deci se reface din programare (cu viața 0).
  const aparuti = before.deGenerat.length - after.deGenerat.length
  for (let i = 0; i < aparuti; i++) {
    const sp = before.deGenerat[i]
    if (!sp) continue
    const id = before.urmatorulId + i
    const e = vii.get(id) ?? { id, tip: sp.tip, viata: 0, progres: 0, stari: {}, ...(sp.trasaturi ? { trasaturi: sp.trasaturi } : {}) }
    out.push({ tip: 'aparut', inamic: e })
    if (!vii.has(id)) out.push({ tip: 'ucis', inamic: e })
  }
  // Cei născuți de un puls: id-urile de după programări. Și aici, unul ucis chiar la naștere se reface (viața 0).
  const nascuti = after.urmatorulId - before.urmatorulId - aparuti
  if (nascuti > 0) {
    const parinte = after.inamici.find((e) => ENEMIES[e.tip].puls) ?? before.inamici.find((e) => ENEMIES[e.tip].puls)
    const progres = parinte?.progres ?? 0
    out.push({ tip: 'puls', progres })
    for (let i = 0; i < nascuti; i++) {
      const id = before.urmatorulId + aparuti + i
      const e = vii.get(id) ?? { id, tip: (parinte && ENEMIES[parinte.tip].puls?.tip) || 'roi', viata: 0, progres, stari: {} }
      out.push({ tip: 'aparut', inamic: e })
      if (!vii.has(id)) out.push({ tip: 'ucis', inamic: e })
    }
  }

  if (before.faza === 'val' && after.faza !== 'val') out.push({ tip: 'sfarsit', faza: after.faza })
  return out
}
