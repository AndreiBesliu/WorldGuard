// Poarta sunetelor: decide dacă un sunet pornește acum. Fără ea, un val la viteza 4× ar cere zeci de sunete pe
// cadru (fiecare turn, fiecare moarte), adică zgomot pentru ureche și noduri Web Audio pentru procesor.
// Pură: primește timpul, nu-l citește, deci se testează fără browser.

export interface GateRule {
  /** Milisecunde minime între două porniri ale aceluiași sunet. */
  readonly interval: number
  /** Câte exemplare ale lui pot suna deodată. */
  readonly voci: number
  /** Cât ține un exemplar (ms). */
  readonly durata: number
  /** Trece de plafonul total (dar nu de propriul interval și de propriile voci). */
  readonly prioritar?: boolean
}

export class Gate {
  private readonly ultima = new Map<string, number>()
  private readonly active = new Map<string, number[]>()
  private toate: number[] = []

  /** `plafon` = câte sunete pot suna deodată, în total. */
  constructor(private readonly plafon = 24) {}

  /** Pornește sunetul `id` la momentul `acum` (ms)? Dacă da, îl și înregistrează. */
  admit(id: string, acum: number, r: GateRule): boolean {
    const prev = this.ultima.get(id)
    if (prev !== undefined && acum - prev < r.interval) return false
    const ale = (this.active.get(id) ?? []).filter((t) => t > acum)
    this.toate = this.toate.filter((t) => t > acum)
    if (ale.length >= r.voci) return false
    if (!r.prioritar && this.toate.length >= this.plafon) return false
    ale.push(acum + r.durata)
    this.toate.push(acum + r.durata)
    this.active.set(id, ale)
    this.ultima.set(id, acum)
    return true
  }

  /** Câte sunete sună la momentul `acum`. */
  sunand(acum: number): number {
    return this.toate.filter((t) => t > acum).length
  }

  reset(): void {
    this.ultima.clear()
    this.active.clear()
    this.toate = []
  }
}
