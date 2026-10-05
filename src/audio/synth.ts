// Sintetizatorul: cântă o rețetă din `data/sunete.ts` prin Web Audio. Fiecare strat e un oscilator sau zgomot alb,
// opțional printr-un filtru, cu un anvelopă (atac liniar, stingere exponențială), apoi totul printr-un panoramic
// stereo. Merge pe orice `BaseAudioContext`: cel real în joc, unul offline în verificări (randare fără difuzoare).

import type { SoundInfo } from '../data/sunete'

/** O secundă de zgomot alb pe context, refolosită de toate straturile de zgomot (pornite din puncte diferite). */
const zgomote = new WeakMap<BaseAudioContext, AudioBuffer>()

function zgomot(ac: BaseAudioContext): AudioBuffer {
  let b = zgomote.get(ac)
  if (!b) {
    b = ac.createBuffer(1, ac.sampleRate, ac.sampleRate)
    const d = b.getChannelData(0)
    // Aleatorul de aici e doar sunet: simularea nu-l vede.
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    zgomote.set(ac, b)
  }
  return b
}

/** Frecvența de la `a` la `b`, exponențial, între `t0` și `t1`. */
function aluneca(p: AudioParam, a: number, b: number, t0: number, t1: number): void {
  p.setValueAtTime(a, t0)
  if (a !== b) p.exponentialRampToValueAtTime(b, t1)
}

export interface PlayOptions {
  /** Poziția în stereo, de la −1 (stânga) la 1 (dreapta). */
  readonly pan: number
  /** Înălțimea: 1 = cea din rețetă. */
  readonly pitch: number
  /** Înmulțește volumul rețetei. */
  readonly volum: number
}

/** Programează sunetul `s` să pornească la momentul `la` (secunde, pe ceasul contextului), spre nodul `out`. */
export function playRecipe(ac: BaseAudioContext, out: AudioNode, s: SoundInfo, la: number, o: PlayOptions): void {
  const pan = ac.createStereoPanner()
  pan.pan.value = Math.max(-1, Math.min(1, o.pan))
  pan.connect(out)
  let ramase = s.straturi.length
  for (const l of s.straturi) {
    const t0 = la + (l.start ?? 0)
    const t1 = t0 + l.atac
    const t2 = t1 + l.durata
    const g = ac.createGain()
    g.gain.setValueAtTime(0, t0)
    g.gain.linearRampToValueAtTime(l.volum * s.volum * o.volum, t1)
    g.gain.exponentialRampToValueAtTime(0.0001, t2)
    let src: AudioScheduledSourceNode
    if (l.sursa === 'zgomot') {
      const b = ac.createBufferSource()
      b.buffer = zgomot(ac)
      b.loop = true
      src = b
    } else {
      const osc = ac.createOscillator()
      osc.type = l.sursa
      aluneca(osc.frequency, l.frecventa[0] * o.pitch, l.frecventa[1] * o.pitch, t0, t2)
      src = osc
    }
    let capat: AudioNode = src
    if (l.filtru) {
      const f = ac.createBiquadFilter()
      f.type = l.filtru.tip
      aluneca(f.frequency, l.filtru.frecventa[0] * o.pitch, l.filtru.frecventa[1] * o.pitch, t0, t2)
      f.Q.value = l.filtru.q ?? 1
      src.connect(f)
      capat = f
    }
    capat.connect(g)
    g.connect(pan)
    if (src instanceof AudioBufferSourceNode) src.start(t0, Math.random() * 0.9)
    else src.start(t0)
    src.stop(t2 + 0.02)
    // Nodurile terminate se desprind, ca graful să nu crească pe durata unei partide.
    src.onended = () => {
      g.disconnect()
      capat.disconnect()
      if (--ramase === 0) pan.disconnect()
    }
  }
}
