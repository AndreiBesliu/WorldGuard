// Motorul de sunet: un singur obiect pentru tot jocul. Ține contextul Web Audio, volumul general, un compresor
// (ca multe sunete deodată să nu distorsioneze) și poarta (`gate.ts`). `main.ts` îi spune doar ce sunet și unde.
//
// Browserele nu lasă o pagină să cânte până nu apasă jucătorul ceva: contextul real se face la primul gest
// (`unlock`). Până atunci, `play` nu face nimic. În verificări, `attach` primește un context offline.

import { SOUNDS, soundLength, VOLUM_GENERAL, type SoundId } from '../data/sunete'
import { Gate } from './gate'
import { playRecipe } from './synth'

export class Sunet {
  private ac?: BaseAudioContext
  private general?: GainNode
  private readonly gate = new Gate()
  private nivel: number
  /** Câte sunete au pornit (pentru verificări). */
  pornite = 0

  constructor(nivel = 1) {
    this.nivel = nivel
  }

  /** Leagă motorul de un context: volumul general → compresor → difuzoare. */
  attach(ac: BaseAudioContext): void {
    const comp = ac.createDynamicsCompressor()
    comp.threshold.value = -14
    comp.knee.value = 10
    comp.ratio.value = 6
    comp.attack.value = 0.003
    comp.release.value = 0.15
    comp.connect(ac.destination)
    const general = ac.createGain()
    general.gain.value = VOLUM_GENERAL * this.nivel
    general.connect(comp)
    this.ac = ac
    this.general = general
    this.gate.reset()
  }

  /** La un gest al jucătorului: face contextul real, sau îl repornește dacă browserul l-a suspendat. */
  unlock(): void {
    if (!this.ac && typeof AudioContext !== 'undefined') this.attach(new AudioContext())
    if (this.ac instanceof AudioContext && this.ac.state === 'suspended') void this.ac.resume()
  }

  get volum(): number {
    return this.nivel
  }

  set volum(n: number) {
    this.nivel = n
    if (this.ac && this.general) this.general.gain.setValueAtTime(VOLUM_GENERAL * n, this.ac.currentTime)
  }

  /**
   * Pornește sunetul `id`, dacă poarta îl lasă. `at` = momentul, pe ceasul contextului (implicit: acum).
   * Întoarce dacă a pornit.
   */
  play(id: SoundId, o: { pan?: number; at?: number } = {}): boolean {
    if (!this.ac || !this.general || this.nivel === 0) return false
    const s = SOUNDS[id]
    const la = o.at ?? this.ac.currentTime
    const durata = soundLength(s) * 1000
    if (!this.gate.admit(id, la * 1000, { interval: s.interval, voci: s.voci, durata, prioritar: 'prioritar' in s && s.prioritar })) return false
    const v = 'variatie' in s ? s.variatie / 100 : 0
    playRecipe(this.ac, this.general, s, la, { pan: o.pan ?? 0, pitch: 1 + (Math.random() * 2 - 1) * v, volum: 1 })
    this.pornite++
    return true
  }
}
