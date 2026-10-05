import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { TERRAFORM_TYPES } from '../data/economie'
import { REACTIONS, type ReactionType } from '../data/reactions'
import { NIVELURI_SUNET, SOUNDS, soundLength, type SoundId, type SoundInfo } from '../data/sunete'
import { TOWER_TYPES } from '../data/towers'
import type { StepEvent } from '../events'
import { newGame, type Decision, type Enemy } from '../sim/game'
import { key } from '../sim/hex'
import { decisionPan, decisionSound, panOf, stepCues } from './cues'
import { Gate } from './gate'

const all = Object.entries(SOUNDS) as [SoundId, SoundInfo][]

describe('rețetele sunetelor', () => {
  it('cifrele au sens: volume în (0, 1], timpi pozitivi, frecvențe auzibile (și cu variația de înălțime)', () => {
    for (const [id, s] of all) {
      const ctx = `sunetul ${id}`
      expect(s.straturi.length, ctx).toBeGreaterThan(0)
      expect(s.volum, ctx).toBeGreaterThan(0)
      expect(s.volum, ctx).toBeLessThanOrEqual(1)
      expect(s.interval, ctx).toBeGreaterThanOrEqual(0)
      expect(Number.isInteger(s.voci) && s.voci >= 1, ctx).toBe(true)
      const v = (s.variatie ?? 0) / 100
      expect(v, ctx).toBeLessThanOrEqual(0.25)
      for (const l of s.straturi) {
        expect(l.volum, ctx).toBeGreaterThan(0)
        expect(l.volum, ctx).toBeLessThanOrEqual(1)
        expect(l.atac, ctx).toBeGreaterThanOrEqual(0)
        expect(l.durata, ctx).toBeGreaterThan(0)
        expect(l.start ?? 0, ctx).toBeGreaterThanOrEqual(0)
        const frecvente = [...(l.sursa === 'zgomot' ? [] : l.frecventa), ...(l.filtru?.frecventa ?? [])]
        for (const f of frecvente) {
          expect(f * (1 - v), ctx).toBeGreaterThanOrEqual(20)
          expect(f * (1 + v), ctx).toBeLessThanOrEqual(20_000)
        }
      }
      // Niciun sunet nu ține mai mult de 2 secunde: sunt semnale, nu muzică.
      expect(soundLength(s), ctx).toBeLessThanOrEqual(2)
    }
    expect(NIVELURI_SUNET).toContain(0)
  })

  it('tot ce se întâmplă are un sunet: fiecare reacție, fiecare turn, fiecare terraformare', () => {
    for (const r of Object.keys(REACTIONS) as ReactionType[]) expect(SOUNDS[r], r).toBeDefined()
    for (const t of TOWER_TYPES) expect(SOUNDS[`turn-${t}`], t).toBeDefined()
    for (const t of TERRAFORM_TYPES) expect(SOUNDS[`teren-${t}`], t).toBeDefined()
  })
})

describe('poarta', () => {
  const regula = { interval: 100, voci: 2, durata: 300 }

  it('același sunet nu repornește mai des decât intervalul lui', () => {
    const g = new Gate()
    expect(g.admit('a', 0, regula)).toBe(true)
    expect(g.admit('a', 50, regula)).toBe(false)
    expect(g.admit('b', 50, regula)).toBe(true) // alt sunet, altă socoteală
    expect(g.admit('a', 100, regula)).toBe(true)
  })

  it('cel mult `voci` exemplare deodată; un exemplar terminat face loc', () => {
    const g = new Gate()
    expect(g.admit('a', 0, regula)).toBe(true)
    expect(g.admit('a', 100, regula)).toBe(true)
    expect(g.admit('a', 200, regula)).toBe(false) // două sună încă (până la 300 și 400)
    expect(g.admit('a', 300, regula)).toBe(true) // primul s-a terminat
  })

  it('plafonul total oprește sunetele obișnuite, nu și pe cele prioritare', () => {
    const g = new Gate(3)
    for (const id of ['a', 'b', 'c']) expect(g.admit(id, 0, regula)).toBe(true)
    expect(g.sunand(0)).toBe(3)
    expect(g.admit('d', 0, regula)).toBe(false)
    expect(g.admit('baza', 0, { ...regula, prioritar: true })).toBe(true)
    expect(g.sunand(400)).toBe(0)
    expect(g.admit('d', 400, regula)).toBe(true)
  })
})

describe('ce sună și unde', () => {
  const s = newGame(7)
  const enemy = (tip: Enemy['tip'], progres = 0): Enemy => ({ id: 1, tip, viata: 0, progres, stari: {} })

  it('stereo-ul urmează harta: intrarea (stânga) în stânga, baza (dreapta) în dreapta, mijlocul la mijloc', () => {
    expect(panOf(s.map.spawn, s.map.radius)).toBeLessThan(-0.4)
    expect(panOf(s.map.base, s.map.radius)).toBeGreaterThan(0.4)
    expect(panOf({ q: 0, r: 0 }, s.map.radius)).toBe(0)
    // Pe ecran contează coloana, nu q singur: (−2, 4) e drept sub centru, (2, −4) drept deasupra.
    expect(panOf({ q: -2, r: 4 }, s.map.radius)).toBe(0)
    expect(panOf({ q: 2, r: -4 }, s.map.radius)).toBe(0)
    for (const k of s.map.terrain.keys()) {
      const [q, r] = k.split(',').map(Number) as [number, number]
      expect(Math.abs(panOf({ q, r }, s.map.radius))).toBeLessThanOrEqual(1)
    }
  })

  it('evenimentele → sunete', () => {
    const evs: StepEvent[] = [
      { tip: 'reactie', reactie: 'abur', inamic: 1, progres: 0 },
      { tip: 'lovitura', turnuri: ['fizic', 'frig'], hex: key(s.map.base), combinat: true },
      { tip: 'lovit', inamic: 1 },
      { tip: 'ucis', inamic: enemy('rapid') },
      { tip: 'ucis', inamic: enemy('boss') },
      { tip: 'scapat', inamic: enemy('normal') },
      { tip: 'aparut', inamic: enemy('normal') },
      { tip: 'aparut', inamic: enemy('boss') },
      { tip: 'sfarsit', faza: 'pregatire' },
      { tip: 'sfarsit', faza: 'castigat' },
      { tip: 'sfarsit', faza: 'pierdut' },
    ]
    expect(stepCues(evs, s).map((c) => c.sunet)).toEqual([
      'abur',
      'turn-fizic',
      'turn-frig',
      'ucis',
      'boss-ucis',
      'baza',
      'boss',
      'val-gata',
      'castigat',
      'pierdut',
    ])
    // Reacția de la intrare se aude în stânga; lovitura de lângă bază, în dreapta.
    const [abur, fizic] = stepCues(evs, s)
    expect(abur!.pan).toBeLessThan(0)
    expect(fizic!.pan).toBeGreaterThan(0)
  })

  it('fiecare decizie are sunetul ei, iar cele cu un hexagon se aud de acolo', () => {
    const decizii: Decision[] = [
      { tip: 'ocol', start: 1, span: 1, hexuri: [] },
      { tip: 'pornesteVal' },
      { tip: 'turn', turn: 'foc', hex: key(s.map.base) },
      { tip: 'tintire', turn: 1, mod: 'primul' },
      { tip: 'alege', carte: 'bastionul' },
      ...TERRAFORM_TYPES.map((a): Decision => ({ tip: 'teren', actiune: a, hex: '0,0' })),
      { tip: 'mina', hex: '0,0' },
      { tip: 'combina', turn: 1, activ: true },
    ]
    const sunete = decizii.map(decisionSound)
    for (const id of sunete) expect(SOUNDS[id]).toBeDefined()
    expect(new Set(sunete).size).toBe(sunete.length)
    expect(decisionPan({ tip: 'turn', turn: 'foc', hex: key(s.map.base) }, s)).toBeGreaterThan(0)
    expect(decisionPan({ tip: 'pornesteVal' }, s)).toBe(0)
  })

  it('maparea și poarta sunt pure: fără ceas și fără aleator', () => {
    for (const f of ['./cues.ts', './gate.ts']) {
      const code = readFileSync(new URL(f, import.meta.url), 'utf8').replace(/\/\/.*$/gm, '')
      expect(code, f).not.toMatch(/Math\.random|Date\.now|new Date|performance\.now/)
    }
  })
})
