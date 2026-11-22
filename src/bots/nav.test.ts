// Mersul pe harta adevărată, fără nave dușmane (Review Focus 1).
import { describe, expect, it } from 'vitest'
import { BALANCE } from '../data/balance'
import { CLUSTERS, HOME, PAD_R } from '../data/layout'
import { createGame, type GameState, type Pad, type ResNode } from '../sim/state'
import { step } from '../sim/step'
import { heroAt, padOf } from '../sim/testkit'
import { choose } from '../sim/mods'
import { createBot } from './bot'
import { createNav, createSkirt, offForeignPad, slipOff, type Nav } from './nav'
import { POLICIES, type Policy } from './policy'
import { playStep } from './run'

function calm(): GameState {
  const s = createGame(1)
  s.spawnT = 1e9
  return s
}

/** Conduce nava cu `toward` până ajunge; întoarce secundele, sau Infinity dacă n-a ajuns în `limit`. */
function drive(s: GameState, nav: Nav, x: number, y: number, stop: number, limit: number): number {
  const t0 = s.t
  while (s.t - t0 < limit) {
    const input = nav.toward(s, x, y, stop)
    if (input.x === 0 && input.y === 0) return s.t - t0
    if (s.offer !== null) { choose(s, 0); continue }   // o ofertă deschisă ar ține ceasul pe loc
    step(s, input)
  }
  return Infinity
}

const margin = (d: number) => (d / BALANCE.hero.speed) * 1.6 + 2

describe('mersul', () => {
  const pads = calm().pads
  for (let i = 0; i < pads.length; i++) {
    it(`din HOME ajunge la cercul #${i} (${pads[i]!.kind})`, () => {
      const s = calm(), p = s.pads[i]!, limit = margin(Math.hypot(p.x - HOME.x, p.y - HOME.y))
      const t = drive(s, createNav(), p.x, p.y, PAD_R * 0.4, limit + 1)
      expect(t).toBeLessThanOrEqual(limit)
      expect(Math.hypot(s.hero.x - p.x, s.hero.y - p.y)).toBeLessThanOrEqual(PAD_R * 0.4)
    })
  }

  let first = 0
  for (let c = 0; c < CLUSTERS.length; c++) {
    const at = first
    first += CLUSTERS[c]!.n
    it(`din HOME ajunge la primul nod din grupul #${c} (${CLUSTERS[c]!.type})`, () => {
      const s = calm()
      expect(s.nodes.length).toBe(CLUSTERS.reduce((a, k) => a + k.n, 0))
      const n = s.nodes[at]!, stop = BALANCE.node[n.type].r + BALANCE.hero.r + BALANCE.node.reach - 4
      const limit = margin(Math.hypot(n.x - HOME.x, n.y - HOME.y))
      const t = drive(s, createNav(), n.x, n.y, stop, limit + 1)
      expect(t).toBeLessThanOrEqual(limit)
    })
  }

  it('de la (550, 900) la (550, 600), cu planeta pe drum', () => {
    const s = calm(); heroAt(s, 550, 900)
    const t = drive(s, createNav(), 550, 600, 6, margin(300) + 1)
    expect(t).toBeLessThanOrEqual(margin(300))
  })

  it('o țintă nouă după una atinsă: primul pas e vectorul unitate spre ea', () => {
    const s = calm(); heroAt(s, 550, 900)
    const nav = createNav()
    expect(drive(s, nav, 550, 600, 6, 20)).toBeLessThan(Infinity)   // drumul cu planeta pe el, deci cu ocolire
    const tx = 180, ty = 230, d = Math.hypot(tx - s.hero.x, ty - s.hero.y)
    const input = nav.toward(s, tx, ty, 6)
    expect(input.x).toBeCloseTo((tx - s.hero.x) / d, 12)
    expect(input.y).toBeCloseTo((ty - s.hero.y) / d, 12)
  })

  it('o țintă nouă în mijlocul ocolirii o șterge', () => {
    const s = calm(); heroAt(s, 550, 900)
    const nav = createNav()
    for (let i = 0; i < 40; i++) step(s, nav.toward(s, 550, 600, 6))   // blocat de planetă: a început ocolirea
    const tx = 1000, ty = 1400, d = Math.hypot(tx - s.hero.x, ty - s.hero.y)
    const input = nav.toward(s, tx, ty, 6)
    expect(input.x).toBeCloseTo((tx - s.hero.x) / d, 12)
    expect(input.y).toBeCloseTo((ty - s.hero.y) / d, 12)
  })

  it('după ce distanța până la aceeași țintă a crescut brusc, următorii 30 de pași sunt drept spre țintă', () => {
    const s = calm(), nav = createNav(), tx = 700, ty = 1150
    heroAt(s, tx, ty - 40)
    for (let i = 0; i < 5; i++) step(s, nav.toward(s, tx, ty, 6))   // aproape de țintă: memoria ține o distanță mică
    heroAt(s, tx, ty - 300)   // ca la reapariție: aceeași țintă, nava departe
    for (let i = 0; i < 30; i++) {
      const input = nav.toward(s, tx, ty, 20), d = Math.hypot(tx - s.hero.x, ty - s.hero.y)
      expect(input.x).toBeCloseTo((tx - s.hero.x) / d, 12)
      expect(input.y).toBeCloseTo((ty - s.hero.y) / d, 12)
      step(s, input)
    }
  })

  it('pe drum liber, direcția e vectorul unitate spre țintă', () => {
    const s = calm(), nav = createNav()
    const input = nav.toward(s, HOME.x - 30, HOME.y + 40, 6)
    expect(input.x).toBeCloseTo(-0.6, 12)
    expect(input.y).toBeCloseTo(0.8, 12)
  })
})

/**
 * Conduce nava cu jucătorul întreg până la `done` sau până la `limit` secunde. Întoarce secundele (Infinity dacă n-a ajuns),
 * cel mai scurt drum făcut de navă într-o fereastră de `WINDOW` pași (aproape zero: a rămas pe loc) și câți pași a numărat
 * cercul `pad` (nava a călcat pe el).
 */
function ride(s: GameState, p: Policy, pad: Pad, done: () => boolean, limit: number): { t: number; still: number; on: number } {
  const t0 = s.t, xs: number[] = [], ys: number[] = [], bot = createBot(p)
  let still = Infinity, on = 0
  while (!done()) {
    if (s.t - t0 >= limit) return { t: Infinity, still, on }
    if (s.offer !== null) { playStep(s, p, bot); continue }   // o ofertă deschisă se alege, ca în playOne
    step(s, bot(s))
    if (pad.dwell > 0) on++
    xs.push(s.hero.x); ys.push(s.hero.y)
    const n = xs.length
    if (n > WINDOW) still = Math.min(still, Math.hypot(xs[n - 1]! - xs[n - 1 - WINDOW]!, ys[n - 1]! - ys[n - 1 - WINDOW]!))
  }
  return { t: s.t - t0, still, on }
}
const WINDOW = 30   // 0,5 s
const MOVING = 20   // atâția px măcar, în orice fereastră de 0,5 s (din 82,5 cât merge nava în linie dreaptă)

describe('jucătorul întreg pe lângă un cerc construit (clădirea și cercul ei, ca un singur obstacol)', () => {
  const ship = POLICIES.find((p) => p.name === 'doar-nava')!

  it('turela: de lângă cercul navei la cristalul de dincolo de turelă, pe lângă colțul dintre clădire și cerc', () => {
    const s = calm(), pad = padOf(s, 'turret', 0)
    pad.lvl = 1
    s.crystal = 0; s.metal = 0   // „Doar navă” are nevoie de cristal: merge să strângă
    s.hero.xp = 6                // pragul nivelului 2 e atins: cercul navei e ținta
    const crystals = s.nodes.filter((n) => n.type === 'crystal')
    const away = (n: ResNode) => Math.hypot(n.x - pad.x, n.y - pad.y)
    const node = crystals.reduce((a, n) => (away(n) < away(a) ? n : a))   // singurul cristal lăsat: cel mai apropiat de turelă
    for (const n of crystals) if (n !== node) { n.left = 0; n.regrowAt = 1e9 }
    heroAt(s, 500, 640)
    expect(node.x).toBeLessThan(pad.x - PAD_R)   // ținta e de cealaltă parte a cercului
    const limit = margin(Math.hypot(node.x - s.hero.x, node.y - s.hero.y))
    const run = ride(s, ship, pad, () => s.crystal > 0, limit + 1)
    expect(run.t).toBeLessThanOrEqual(limit)
    expect(run.still).toBeGreaterThanOrEqual(MOVING)
    expect(run.on).toBe(0)
  })

  it('colectorul: de jos din stânga la cercul navei, cu cercul colectorului în drum', () => {
    const s = calm(), pad = padOf(s, 'collector'), target = padOf(s, 'hero')
    pad.lvl = 1
    s.crystal = 999; s.metal = 999   // plătește direct la cercul navei
    s.hero.xp = 6                    // pragul nivelului 2 e atins
    heroAt(s, 240, 820)
    const limit = margin(Math.hypot(target.x - s.hero.x, target.y - s.hero.y))
    const run = ride(s, ship, pad, () => Math.hypot(s.hero.x - target.x, s.hero.y - target.y) <= PAD_R * 0.4, limit + 1)
    expect(run.t).toBeLessThanOrEqual(limit)
    expect(run.still).toBeGreaterThanOrEqual(MOVING)
    expect(run.on).toBe(0)
  })
})

describe('ieșitul de pe cercurile străine', () => {
  it('în centrul cercului navei, cu altă țintă: o direcție nenulă', () => {
    const s = calm(), p = padOf(s, 'hero'); heroAt(s, p.x, p.y)
    const out = offForeignPad(s, padOf(s, 'turret'))
    expect(out).not.toBeNull()
    expect(Math.hypot(out!.x, out!.y)).toBeCloseTo(1, 12)
  })
  it('la 10 px de centru, dinspre centru', () => {
    const s = calm(), p = padOf(s, 'hero'); heroAt(s, p.x - 6, p.y + 8)
    const out = offForeignPad(s, null)!
    expect(out.x).toBeCloseTo(-0.6, 12)
    expect(out.y).toBeCloseTo(0.8, 12)
  })
  it('și de pe cercul de reparat', () => {
    const s = calm(), p = padOf(s, 'repair'); heroAt(s, p.x + PAD_R + 3, p.y)
    expect(offForeignPad(s, null)).toEqual({ x: 1, y: 0 })
  })
  it('pe ținta lui: null', () => {
    const s = calm(), p = padOf(s, 'hero'); heroAt(s, p.x - 6, p.y + 8)
    expect(offForeignPad(s, p)).toBeNull()
  })
  it('în mers, pe un cerc străin care a început să numere: iese pe diagonală, în partea în care voia', () => {
    const s = calm(), p = padOf(s, 'hero'); heroAt(s, p.x + 10, p.y)
    expect(slipOff(s, null, { x: -1, y: 0 })).toBeNull()   // încă nu numără
    p.dwell = 0.05
    const out = slipOff(s, null, { x: -0.6, y: 0.8 })!     // voia înapoi prin centru și în jos
    expect(out.x).toBeCloseTo(Math.SQRT1_2, 12)
    expect(out.y).toBeCloseTo(Math.SQRT1_2, 12)
    expect(slipOff(s, p, { x: -1, y: 0 })).toBeNull()      // pe ținta lui rămâne
  })
  it('în colțul dintre o turelă construită și cercul ei, iese într-o parte, nu spre clădire', () => {
    const s = calm(), p = padOf(s, 'turret', 0)
    p.lvl = 1
    heroAt(s, p.x + 16, (p.y + p.by) / 2)   // pe cerc, la înălțimea dintre centru și clădire
    expect(offForeignPad(s, null)).toEqual({ x: 1, y: 0 })
    p.dwell = 0.05
    const out = slipOff(s, null, { x: -1, y: 0 })!   // voia prin cerc, spre stânga
    expect(out.x).toBeCloseTo(Math.SQRT1_2, 12)
    expect(Math.abs(out.y)).toBeCloseTo(Math.SQRT1_2, 12)
  })
  it('lângă o turelă construită, cu ținta chiar în spatele ei: o ocolește pe aceeași parte la fiecare pas', () => {
    const s = calm(), p = padOf(s, 'turret', 0), skirt = createSkirt()
    p.lvl = 1
    const tx = p.x - 200, ty = p.y - 30   // în spatele laturii dintre centrul cercului și clădire
    heroAt(s, p.x + PAD_R + 4, ty)
    const sides: number[] = []
    for (let i = 0; i < 8; i++) {
      const d = Math.hypot(tx - s.hero.x, ty - s.hero.y)
      const out = skirt(s, null, { x: (tx - s.hero.x) / d, y: (ty - s.hero.y) / d })!
      expect(out.x).toBeCloseTo(0, 12)   // de-a lungul laturii, nu spre ea
      sides.push(Math.sign(out.y))
      heroAt(s, s.hero.x, s.hero.y + out.y * 2.75)
    }
    expect(new Set(sides).size).toBe(1)
  })
  it('ocolitul: nimic lângă un cerc neconstruit, lângă ținta de plată sau departe de cercuri', () => {
    const s = calm(), p = padOf(s, 'turret', 0), skirt = createSkirt()
    heroAt(s, p.x + PAD_R + 4, p.y)
    expect(skirt(s, null, { x: -1, y: 0 })).toBeNull()   // neconstruit
    p.lvl = 1
    expect(skirt(s, p, { x: -1, y: 0 })).toBeNull()      // ținta de plată
    expect(skirt(s, null, { x: 1, y: 0 })).toBeNull()    // pleacă de lângă el
    expect(skirt(s, null, { x: -1, y: 0 })).not.toBeNull()
    heroAt(s, HOME.x, HOME.y)
    expect(skirt(s, null, { x: 1, y: 0 })).toBeNull()
  })
  it('în afara oricărui cerc: null', () => {
    const s = calm()
    expect(offForeignPad(s, null)).toBeNull()
    heroAt(s, padOf(s, 'hero').x + PAD_R + 4, padOf(s, 'hero').y)
    expect(offForeignPad(s, null)).toBeNull()
  })
})
