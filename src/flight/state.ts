// Starea unui zbor: date simple, fără funcții și fără referințe între obiecte (nava de elită se găsește prin `eliteId`,
// ținta unei rachete prin `targetId`).
// Trebuie să supraviețuiască lui JSON.parse(JSON.stringify(f)) și să continue identic.
import { FLIGHT, type FlightFoeKind, type FlightModId } from '../data/flight'
import { NO_UPS, WORKSHOP, type Ups } from '../data/workshop'

export { DT, EPS, NEVER } from '../sim/state'

/** Mișcarea cerută de la pasul trecut, în unități de câmp, înainte de înmulțirea cu `FLIGHT.drive.gain`. */
export interface FlightInput { dx: number; dy: number }

export interface FlightFoe {
  id: number; kind: FlightFoeKind; x: number; y: number; r: number; hp: number; maxHp: number
  hitT: number                     // clipa ultimei lovituri primite (pentru desen)
  x0: number; ph: number; age: number   // șerpuitoarea: mijlocul, faza și vârsta leagănului
  dir: number; stay: number; leaving: boolean   // nava grea: sensul plimbării, cât a stat, dacă pleacă
  sway: number; pat: number; spin: number       // elita: ceasul leagănului, al câtelea foc din tipar, rotirea cercului
  fireT: number                    // secunde până la următorul foc
  fired: number                    // câte focuri a tras (numele fluxului pentru pauza următoare)
}
export interface FlightShip {
  x: number; y: number; hp: number; maxHp: number
  inv: number                      // secunde rămase fără lovituri
  rx: number; ry: number           // restul mișcării cerute, încă nefăcut
  fireT: number                    // secunde până la următoarea salvă a Tunului
  mods: Record<FlightModId, number>   // treapta fiecărui modul, 0 = nu îl are
  laserT: number                   // secunde până la următoarea rază a Laserului
  missileT: number                 // secunde până la următoarea rachetă
  shieldUp: boolean                // Scutul e încărcat și oprește următoarea lovitură
  shieldT: number                  // cât Scutul nu e încărcat: secunde până se reîncarcă
}
export interface FlightShot { x: number; y: number; vx: number; vy: number }   // proiectil dușman
export interface FlightBolt { x: number; y: number; vx: number }                // proiectilul Tunului; urcă cu `FLIGHT.gun.speed`
export interface FlightAsteroid { x: number; y: number; vx: number; vy: number; r: number; rot: number; vr: number; hp: number; hitT: number; shape: number[] }
export interface FlightDrop { kind: 'crystal' | 'metal'; x: number; y: number }
/** Un lucru de cules lăsat de un transport: un modul sau o reparație. */
export interface FlightPick { kind: FlightModId | 'repair'; x: number; y: number }
/** O rachetă în zbor; ținta e `id`-ul unui dușman, −1 fără țintă; lovitura exploziei e hotărâtă la lansare. */
export interface FlightMissile { x: number; y: number; vx: number; vy: number; targetId: number; dmg: number }
export type FlightFx =
  | { kind: 'puff'; what: 'foe' | 'elite' | 'asteroid' | 'shot'; r: number; x: number; y: number; t0: number }   // ceva a căzut sau s-a spart
  | { kind: 'hurt'; x: number; y: number; t0: number }   // nava a fost lovită
  | { kind: 'down'; x: number; y: number; t0: number }   // nava a căzut
  | { kind: 'beam'; x1: number; y1: number; x2: number; y2: number; t0: number }   // raza Laserului, de la navă la țintă
  | { kind: 'blast'; x: number; y: number; r: number; t0: number }   // explozia unei rachete
  | { kind: 'block'; x: number; y: number; t0: number }   // Scutul a oprit o lovitură
  | { kind: 'took'; what: FlightModId | 'repair'; tier: number; maxed: boolean; t0: number }   // ce s-a cules (pentru banda de sus); `maxed`: modulul era deja la treapta 3 și a dat cristale

/** Aparițiile care se repetă: dronele, șerpuitoarele, navele grele, asteroizii, transporturile, escorta elitei. */
export type SpawnKind = 'drone' | 'weaver' | 'gunship' | 'asteroid' | 'cargo' | 'escort'

export interface FlightState {
  seed: number; sector: number; ups: Ups
  mode: 'flying' | 'explored' | 'down'; tick: number; t: number   // t = tick * DT
  ship: FlightShip
  foes: FlightFoe[]; shots: FlightShot[]; bolts: FlightBolt[]; asteroids: FlightAsteroid[]; drops: FlightDrop[]; fx: FlightFx[]
  picks: FlightPick[]; missiles: FlightMissile[]
  crystal: number; metal: number; kills: number
  eliteId: number                  // −1 până apare nava de elită
  exploreAt: number                // −1 până cade nava de elită; apoi clipa în care zborul se încheie cu sectorul explorat
  next: Record<SpawnKind, number>  // clipa următoarei apariții de fiecare fel
  spawned: Record<SpawnKind, number>   // câte apariții de fiecare fel au fost (numele fluxului pentru următoarea)
  lootN: number                    // câte prăzi au căzut (numele fluxului pentru următoarea)
  nextId: number
}

/** Un zbor nou prin sectorul `sector` (de la 1), cu întăririle date: Tunul la treapta 1, plus Arsenalul de pornire, la treapta 1. */
export function createFlight(seed: number, sector: number, ups: Ups = NO_UPS): FlightState {
  const { w, h } = FLIGHT.field
  const hp = FLIGHT.ship.hp + (WORKSHOP.hull.hits[ups.hull] ?? 0)
  const sp = FLIGHT.spawn
  const mods: Record<FlightModId, number> = { gun: 1, laser: 0, missile: 0, shield: 0, magnet: 0 }
  for (const id of WORKSHOP.kit.mods[ups.kit] ?? []) mods[id] = 1
  return {
    seed, sector, ups: { ...ups }, mode: 'flying', tick: 0, t: 0,
    ship: {
      x: w / 2, y: h * FLIGHT.ship.startY, hp, maxHp: hp, inv: 0, rx: 0, ry: 0, fireT: FLIGHT.gun.firstAt,
      mods, laserT: 0, missileT: 0, shieldUp: mods.shield > 0, shieldT: 0,   // Scutul pornește încărcat
    },
    foes: [], shots: [], bolts: [], asteroids: [], drops: [], fx: [], picks: [], missiles: [],
    crystal: 0, metal: 0, kills: 0, eliteId: -1, exploreAt: -1,
    next: { drone: sp.drone.first, weaver: sp.weaver.first, gunship: sp.gunship.first, asteroid: sp.asteroid.first, cargo: sp.cargo.first, escort: -1 },
    spawned: { drone: 0, weaver: 0, gunship: 0, asteroid: 0, cargo: 0, escort: 0 },
    lootN: 0, nextId: 0,
  }
}

/** Nava de elită, cât e în joc. */
export function eliteOf(f: FlightState): FlightFoe | null {
  if (f.eliteId < 0) return null
  return f.foes.find((foe) => foe.id === f.eliteId) ?? null
}

/** Drumul până la nava de elită, de la 0 la 1 (1 din clipa în care apare). */
export function sectorProgress(f: FlightState): number {
  if (f.eliteId >= 0) return 1
  return Math.min(1, f.t / (FLIGHT.sectorSecs + FLIGHT.eliteDelay))
}
