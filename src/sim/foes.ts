// Dușmanii: apariții, mers, atac, împins, despărțire, scoaterea celor doborâți.
import { BALANCE, foeHp, spawnEvery } from '../data/balance'
import { CASTLE, WORLD } from '../data/layout'
import { DT, EPS, NEVER, type Foe, type GameState } from './state'
import { createRng } from './rng'
import { hurtHero } from './hero'

export function makeFoe(s: GameState, x: number, y: number, brute: boolean): Foe {
  const cfg = brute ? BALANCE.foe.brute : BALANCE.foe.grunt
  const hp = foeHp(s.t) * (brute ? BALANCE.foe.brute.hpTimes : 1)
  const f: Foe = {
    id: s.nextId++, x, y, r: cfg.r, hp, maxHp: hp, speed: cfg.speed, dmg: cfg.dmg, brute,
    atkT: BALANCE.foe.firstHit, kx: 0, ky: 0, a: 0, hitT: NEVER, lungeT: NEVER,
  }
  s.foes.push(f)
  return f
}

/** Următorul dușman din șir, într-un punct uniform de pe marginea hărții (fluxul depinde doar de număr). */
export function spawnFoe(s: GameState): void {
  s.spawnN += 1
  const { w, h } = WORLD
  const u = createRng(s.seed, 'aparitie-' + s.spawnN).next() * 2 * (w + h)
  let x: number, y: number
  if (u < w) { x = u; y = 0 }                           // sus
  else if (u < w + h) { x = w; y = u - w }              // dreapta
  else if (u < 2 * w + h) { x = w - (u - w - h); y = h } // jos
  else { x = 0; y = h - (u - 2 * w - h) }               // stânga
  const brute = s.t > BALANCE.foe.brute.after && s.spawnN % BALANCE.foe.brute.every === 0
  makeFoe(s, x, y, brute)
}

export function hurtFoe(s: GameState, f: Foe, dmg: number): void {
  f.hp -= dmg
  f.hitT = s.t
}

/** Un dușman viu: își alege ținta, merge sau, oprit, lovește. */
function act(s: GameState, f: Foe): void {
  const hero = s.hero
  const heroD = Math.hypot(hero.x - f.x, hero.y - f.y)
  const chaseHero = !hero.dead && heroD < BALANCE.foe.chase     // eroul doborât nu e urmărit
  const tx = chaseHero ? hero.x : CASTLE.x
  const ty = chaseHero ? hero.y : CASTLE.y
  const stop = chaseHero ? f.r + BALANCE.hero.r + 2 : CASTLE.r + f.r + 1
  const dx = tx - f.x, dy = ty - f.y, d = Math.hypot(dx, dy)
  if (d > EPS) f.a = Math.atan2(dy, dx)
  if (d > stop + EPS) {
    const step = Math.min(f.speed * DT, d - stop)
    f.x += (dx / d) * step
    f.y += (dy / d) * step
    return
  }
  f.atkT -= DT
  if (f.atkT > EPS) return
  f.lungeT = s.t
  if (chaseHero) { hurtHero(s, f.dmg); f.atkT = BALANCE.foe.hitHeroEvery }
  else { s.castle.hp -= f.dmg; s.castle.hitT = s.t; f.atkT = BALANCE.foe.hitCastleEvery }
}

/** Perechile care se suprapun sunt împinse egal în părți opuse; în același punct, pe axa x. */
function separate(foes: Foe[]): void {
  for (let i = 0; i < foes.length; i++) {
    const a = foes[i]!
    for (let j = i + 1; j < foes.length; j++) {
      const b = foes[j]!
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = a.r + b.r
      if (d >= min) continue
      const nx = d <= EPS ? 1 : dx / d, ny = d <= EPS ? 0 : dy / d
      const half = (min - d) / 2
      a.x -= nx * half; a.y -= ny * half
      b.x += nx * half; b.y += ny * half
    }
  }
}

export function updateFoes(s: GameState): void {
  s.spawnT -= DT
  while (s.spawnT <= EPS) { spawnFoe(s); s.spawnT += spawnEvery(s.t) }
  const live = s.foes.filter((f) => f.hp > EPS)
  const damp = Math.exp(-BALANCE.hero.pushDamping * DT)
  for (const f of live) {
    act(s, f)
    f.x += f.kx * DT; f.y += f.ky * DT
    f.kx *= damp; f.ky *= damp
  }
  separate(live)
  for (const f of live) {                                       // cine a ajuns în castel e scos pe normală
    const dx = f.x - CASTLE.x, dy = f.y - CASTLE.y, d = Math.hypot(dx, dy), min = CASTLE.r + f.r
    if (d >= min) continue
    f.x = CASTLE.x + (d <= EPS ? min : (dx / d) * min)
    f.y = CASTLE.y + (d <= EPS ? 0 : (dy / d) * min)
  }
  for (const f of s.foes) {
    if (f.hp > EPS) continue
    s.kills += 1
    s.fx.push({ kind: 'puff', r: f.r + BALANCE.fx.puffPad, x: f.x, y: f.y, t0: s.t })
  }
  s.foes = live
}
