// Ecranul aprins cât ține partida. Telefonul poate lipsi din sprijin sau refuza: atunci jocul merge fără, în tăcere.
// Nu atinge `navigator`: obiectul vine ca argument.
export interface WakeLock { release(): Promise<void> }
export interface WakeNav { wakeLock?: { request(type: 'screen'): Promise<WakeLock> } }

export function createWake(nav: WakeNav): { on(): void; off(): void } {
  let wanted = false                      // vrem ecranul aprins acum
  let pending = false                     // o cerere a plecat și n-a primit încă răspuns
  let lock: WakeLock | null = null

  const let_go = (l: WakeLock): void => { l.release().catch(() => {}) }

  return {
    on() {
      wanted = true
      if (lock !== null || pending || nav.wakeLock === undefined) return
      pending = true
      let req: Promise<WakeLock>
      try { req = nav.wakeLock.request('screen') } catch { pending = false; return }
      req.then(
        (l) => { pending = false; if (wanted) lock = l; else let_go(l) },   // oprit între timp: blocarea se lasă imediat
        () => { pending = false },                                           // refuzat: fără ecran aprins, fără eroare
      )
    },
    off() {
      wanted = false
      if (lock === null) return
      const l = lock
      lock = null
      let_go(l)
    },
  }
}
