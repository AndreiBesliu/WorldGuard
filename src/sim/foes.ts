// Dușmanii: apariții, mers, atac, împins, despărțire, scoaterea celor doborâți.
import { BALANCE, foeHp, spawnEvery } from '../data/balance'
import { CORE, WORLD } from '../data/layout'
import { DT, EPS, NEVER, type Foe, type GameState } from './state'
import { createRng } from './rng'
import { hurtHero } from './hero'
import { xpNeed } from './mods'

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
  const tx = chaseHero ? hero.x : CORE.x
  const ty = chaseHero ? hero.y : CORE.y
  const stop = chaseHero ? f.r + BALANCE.hero.r + BALANCE.foe.stopHero : CORE.r + f.r + BALANCE.foe.stopCore
  const dx = tx - f.x, dy = ty - f.y, d = Math.hypot(dx, dy)
  if (d > EPS) f.a = Math.atan2(dy, dx)
  if (d > stop + EPS) {
    const move = Math.min(f.speed * DT, d - stop)
    f.x += (dx / d) * move
    f.y += (dy / d) * move
    return
  }
  f.atkT -= DT
  if (f.atkT > EPS) return
  f.lungeT = s.t
  if (chaseHero) { hurtHero(s, f.dmg); f.atkT = BALANCE.foe.hitHeroEvery }
  else { s.core.hp -= f.dmg; s.core.hitT = s.t; f.atkT = BALANCE.foe.hitCoreEvery }
}

/** Perechile care se suprapun sunt împinse egal în părți opuse; în același punct, pe axa x. */
function separate(foes: Foe[]): void {
  for (let i = 0; i < foes.length; i++) {
    const a = foes[i]!
    for (let j = i + 1; j < foes.length; j++) {
      const b = foes[j]!
      const dx = b.x - a.x, dy = b.y - a.y, min = a.r + b.r
      if (dx > min || dx < -min || dy > min || dy < -min) continue   // perechile depărtate sar peste hypot, ca în prototip
      const d = Math.hypot(dx, dy)
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
    if (Math.abs(f.kx) < BALANCE.foe.pushFloor) f.kx = 0       // împinsul mic se stinge de tot (fără rest, fără zero negativ)
    if (Math.abs(f.ky) < BALANCE.foe.pushFloor) f.ky = 0
  }
  separate(live)
  for (const f of live) {                                       // cine a ajuns în nucleu e scos pe normală
    const dx = f.x - CORE.x, dy = f.y - CORE.y, d = Math.hypot(dx, dy), min = CORE.r + f.r
    if (d >= min) continue
    f.x = CORE.x + (d <= EPS ? min : (dx / d) * min)
    f.y = CORE.y + (d <= EPS ? 0 : (dy / d) * min)
  }
  for (const f of s.foes) {
    if (f.hp > EPS) continue
    s.kills += 1
    if (xpNeed(s.hero.lvl) !== null) s.hero.xp += f.brute ? BALANCE.foe.xp.brute : BALANCE.foe.xp.grunt   // oricine l-a doborât; la nivelul maxim, nimic
    s.fx.push({ kind: 'puff', r: f.r + BALANCE.fx.puffPad, x: f.x, y: f.y, t0: s.t })
  }
  s.foes = live
}
