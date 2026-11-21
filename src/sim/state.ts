// Starea jocului: date simple, fără funcții și fără referințe între obiecte.
// Trebuie să supraviețuiască lui JSON.parse(JSON.stringify(s)) și să continue identic.
import { BALANCE } from '../data/balance'
import { CLUSTERS, HOME, LAYOUT_SEED, NODE_GAP, PADS } from '../data/layout'
import type { ModId } from '../data/modules'
import { NO_UPS, type Ups } from '../data/workshop'
import { coreMaxHp, hullHp } from './boost'
import { createRng } from './rng'

export const DT = 1 / 60
export const EPS = 1e-9          // cronometrele se compară cu `<= EPS`, nu cu `<= 0`
export const NEVER = -9          // „nu s-a întâmplat încă”, pentru câmpurile …T de afișare

export type Res = 'crystal' | 'metal'
export type BuildKind = 'turret' | 'collector' | 'mine' | 'hero'
export type PadKind = BuildKind | 'repair'
export interface Input { x: number; y: number }                    // lungime ≤ 1
export interface ResNode { type: Res; x: number; y: number; left: number; regrowAt: number; shakeT: number; shape: number[] }
export interface Pad { kind: PadKind; x: number; y: number; bx: number; by: number; lvl: number; paid: Record<Res, number>; dwell: number; payT: number; flip: boolean; cool: number; prodT: number; popT: number }
export interface Mod { id: ModId; tier: number; t: number }      // t: ceasul modulului (0 unde nu are)
export interface Offer { id: ModId; tier: number }               // tier 1 = modul nou; 2 sau 3 = întărire până la acea treaptă
export interface Hero { x: number; y: number; face: number; hp: number; lvl: number; xp: number; mods: Mod[]; dead: boolean; respawnT: number; strikeT: number; gatherT: number; waveT: number; waveA: number; hurtT: number; moved: boolean }
export interface Foe { id: number; x: number; y: number; r: number; hp: number; maxHp: number; speed: number; dmg: number; brute: boolean; atkT: number; kx: number; ky: number; a: number; hitT: number; lungeT: number }
// targetId = -1 după moartea țintei. `bolt`: raza unei turele, lovește doar ținta. `missile`: racheta navei, lovește tot ce e în `blast`.
export interface Shot { x: number; y: number; tx: number; ty: number; a: number; targetId: number; dmg: number; kind: 'bolt' | 'missile'; blast: number }
export type Fx =
  | { kind: 'gain'; res: Res; x: number; y: number; t0: number }
  | { kind: 'level'; what: BuildKind; lvl: number; x: number; y: number; t0: number }
  | { kind: 'heroDown'; x: number; y: number; t0: number }
  | { kind: 'puff'; r: number; x: number; y: number; t0: number }
  | { kind: 'beam'; x: number; y: number; tx: number; ty: number; t0: number }   // raza laserului, de la navă la țintă
  | { kind: 'blast'; r: number; x: number; y: number; t0: number }              // explozia unei rachete, cu zona ei
  | { kind: 'block'; x: number; y: number; t0: number }                         // scutul a oprit o lovitură
export interface GameState {
  seed: number; mode: 'playing' | 'over'; tick: number; t: number   // t = tick * DT
  crystal: number; metal: number; kills: number
  core: { hp: number; hitT: number }
  hero: Hero; nodes: ResNode[]; pads: Pad[]; foes: Foe[]; shots: Shot[]; fx: Fx[]
  spawnT: number; spawnN: number; nextId: number
  offer: Offer[] | null            // ofertele deschise la un nivel nou; cât nu e null, pasul stă pe loc
  ups: Ups                         // întăririle din atelier cu care a pornit partida; nu se schimbă în timpul ei
}

/** Așază resursele în grupurile lor, cu un flux propriu: harta nu depinde de sămânța partidei. */
function layNodes(): ResNode[] {
  const rng = createRng(LAYOUT_SEED, 'harta')
  const nodes: ResNode[] = []
  for (const c of CLUSTERS) {
    let placed = 0
    for (let tries = 0; tries < 400 && placed < c.n; tries++) {
      const ang = rng.next() * 2 * Math.PI
      const dist = Math.sqrt(rng.next()) * c.rad
      const x = c.x + Math.cos(ang) * dist
      const y = c.y + Math.sin(ang) * dist
      if (nodes.some((n) => Math.hypot(n.x - x, n.y - y) < NODE_GAP)) continue
      const shape: number[] = []
      if (c.type === 'metal') for (let i = 0; i < 7; i++) shape.push(0.78 + rng.next() * 0.3)
      nodes.push({ type: c.type, x, y, left: BALANCE.node[c.type].amount, regrowAt: 0, shakeT: NEVER, shape })
      placed++
    }
  }
  return nodes
}

/** O partidă nouă, cu întăririle date (fără ele, ca înainte de atelier): planeta și nava pornesc cu viața plină. */
export function createGame(seed: number, ups: Ups = NO_UPS): GameState {
  const s: GameState = {
    seed, mode: 'playing', tick: 0, t: 0,
    crystal: BALANCE.start.crystal, metal: BALANCE.start.metal, kills: 0,
    core: { hp: BALANCE.core.hp, hitT: NEVER },
    hero: {
      x: HOME.x, y: HOME.y, face: 0, hp: BALANCE.hero.hp, lvl: 1, xp: 0, mods: [{ id: 'wave', tier: 1, t: 0 }], dead: false, respawnT: 0,
      strikeT: NEVER, gatherT: NEVER, waveT: NEVER, waveA: 0, hurtT: NEVER, moved: false,
    },
    nodes: layNodes(),
    pads: PADS.map((p) => ({
      kind: p.kind, x: p.x, y: p.y, bx: p.bx, by: p.by, lvl: 0, paid: { crystal: 0, metal: 0 },
      dwell: 0, payT: NEVER, flip: false, cool: 0, prodT: NEVER, popT: NEVER,
    })),
    foes: [], shots: [], fx: [],
    spawnT: BALANCE.foe.firstAt, spawnN: 0, nextId: 0,
    offer: null,
    ups: { ...ups },
  }
  s.core.hp = coreMaxHp(s)
  s.hero.hp = BALANCE.hero.hp + hullHp(s)
  return s
}
