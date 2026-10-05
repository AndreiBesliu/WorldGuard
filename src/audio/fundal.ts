// Fundalul muzical: acorduri lungi din `FUNDAL` (`data/sunete.ts`), după starea jocului.
//
// `Planificator` decide ce acord vine și când — pur, deci testat fără browser. `Fundal` îl cântă prin Web Audio,
// programând fiecare acord puțin înainte (cât să nu se audă golul dintre cadre).

import { FUNDAL, type StareFundal } from '../data/sunete'

export interface Acord {
  /** Când pornește (s, pe ceasul contextului). */
  readonly la: number
  readonly note: readonly number[]
  /** Cât ține, până intră următorul (s); apoi se stinge în `FUNDAL.eliberare`. */
  readonly durata: number
}

/** Cât de devreme se programează următorul acord (s). */
const INAINTE = 0.5

export class Planificator {
  private stare: StareFundal = 'liniste'
  private urmatorul = 0
  private indice = 0

  /** Acordurile de programat acum, pentru starea `stare`, la momentul `acum` (s). */
  update(stare: StareFundal, acum: number): Acord[] {
    if (stare !== this.stare) {
      // O stare nouă (un val pornit, un boss): primul ei acord intră aproape imediat, de la începutul progresiei.
      this.stare = stare
      this.indice = 0
      this.urmatorul = Math.min(this.urmatorul, acum + 0.1)
    }
    if (stare === 'liniste') return []
    // După o pauză (fila ascunsă, contextul suspendat), nu se recuperează acordurile pierdute: se reia de acum.
    if (this.urmatorul < acum) this.urmatorul = acum
    const s = FUNDAL.stari[stare]
    const out: Acord[] = []
    while (this.urmatorul < acum + INAINTE) {
      const note = s.acorduri[this.indice % s.acorduri.length] as readonly number[]
      out.push({ la: this.urmatorul, note, durata: s.durata })
      this.urmatorul += s.durata
      this.indice++
    }
    return out
  }
}

/** Cât durează stingerea fundalului (la sfârșitul partidei, la oprire) și revenirea lui (s). */
const ESTOMPARE = 2

/** Cântă acordurile planificate: filtrul și volumul fundalului se fac o dată, notele la fiecare acord. */
export class Fundal {
  private readonly plan = new Planificator()
  private stare: StareFundal = 'liniste'
  /** Ultima estompare a volumului (de la `v0` la `t0`, la `v1` la `t1`), ca valoarea de oricând să se poată calcula. */
  private estompare = { t0: 0, v0: 0, t1: 0, v1: 0 }
  private readonly filtru: BiquadFilterNode
  private readonly volum: GainNode
  /** Câte acorduri au pornit (pentru verificări). */
  acorduri = 0

  constructor(
    private readonly ac: BaseAudioContext,
    iesire: AudioNode,
  ) {
    this.volum = ac.createGain()
    this.volum.gain.value = 0 // pornește din liniște și crește la primul acord
    this.volum.connect(iesire)
    this.filtru = ac.createBiquadFilter()
    this.filtru.type = 'lowpass'
    this.filtru.frequency.value = FUNDAL.filtru.frecventa
    this.filtru.Q.value = 0.5
    this.filtru.connect(this.volum)
    // Respirația: o oscilație foarte lentă a frecvenței filtrului.
    const lfo = ac.createOscillator()
    lfo.frequency.value = FUNDAL.filtru.respiratie.frecventa
    const adancime = ac.createGain()
    adancime.gain.value = FUNDAL.filtru.respiratie.adancime
    lfo.connect(adancime)
    adancime.connect(this.filtru.frequency)
    lfo.start()
  }

  update(stare: StareFundal, acum: number): void {
    // Intrarea în liniște stinge acordul care încă sună; ieșirea din ea readuce volumul.
    if ((stare === 'liniste') !== (this.stare === 'liniste')) {
      // Volumul pornește de unde e la momentul `acum`, chiar la jumătatea unei estompări. Valoarea se calculează
      // aici, nu se citește din parametru și nici nu se lasă pe `cancelAndHoldAtTime`: în randarea offline
      // `gain.value` e cea de la începutul randării, iar `cancelAndHoldAtTime` din Chromium nu pune punctul de
      // sprijin când nu mai urmează nimic, așa că rampa pornea de la evenimentul de dinainte (măsurat: fundalul se
      // stingea treptat un minut întreg).
      const { t0, v0, t1, v1 } = this.estompare
      const v = acum >= t1 ? v1 : acum <= t0 ? v0 : v0 + ((v1 - v0) * (acum - t0)) / (t1 - t0)
      const tinta = stare === 'liniste' ? 0 : FUNDAL.volum
      const g = this.volum.gain
      g.cancelScheduledValues(acum)
      g.setValueAtTime(v, acum)
      g.linearRampToValueAtTime(tinta, acum + ESTOMPARE)
      this.estompare = { t0: acum, v0: v, t1: acum + ESTOMPARE, v1: tinta }
    }
    this.stare = stare
    for (const a of this.plan.update(stare, acum)) this.canta(a)
  }

  private canta(a: Acord): void {
    const { ac } = this
    const t0 = a.la
    const t1 = t0 + FUNDAL.atac
    const t2 = t0 + a.durata + FUNDAL.eliberare
    const g = ac.createGain()
    // Volumul împărțit la note, ca un acord de 4 să nu fie mai tare decât unul de 3. Intrarea și stingerea sunt
    // liniare: cu rampe exponențiale, acordul nou stătea aproape mut cât se stingea cel vechi, iar la fiecare
    // schimbare volumul scădea cu ~9 dB (măsurat).
    const v = 1 / a.note.length
    g.gain.setValueAtTime(0, t0)
    g.gain.linearRampToValueAtTime(v, t1)
    g.gain.setValueAtTime(v, t0 + a.durata)
    g.gain.linearRampToValueAtTime(0, t2)
    g.connect(this.filtru)
    let ramase = a.note.length * 2
    for (const f of a.note) {
      for (const [forma, cents] of [
        ['triangle', 0],
        ['sine', FUNDAL.dezacord],
      ] as const) {
        const osc = ac.createOscillator()
        osc.type = forma
        osc.frequency.value = f
        osc.detune.value = cents
        osc.connect(g)
        osc.start(t0)
        osc.stop(t2 + 0.05)
        osc.onended = () => {
          osc.disconnect()
          if (--ramase === 0) g.disconnect()
        }
      }
    }
    this.acorduri++
  }
}
