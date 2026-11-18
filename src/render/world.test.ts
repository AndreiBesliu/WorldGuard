import { beforeAll, describe, expect, it, vi } from 'vitest'
import { addFoe, addNode, padOf, quietGame } from '../sim/testkit'
import type { Skin } from './skin'
import { drawWorld } from './world'

beforeAll(() => {
  vi.stubGlobal('document', { documentElement: {} })
  vi.stubGlobal('getComputedStyle', () => ({ getPropertyValue: () => '#123456' }))
})

/** Un context care înghite orice apel; measureText dă o lățime fixă. */
function fakeCtx(): CanvasRenderingContext2D {
  return new Proxy({}, {
    get: (_t, k) => (k === 'measureText' ? () => ({ width: 10 }) : () => undefined),
    set: () => true,
  }) as unknown as CanvasRenderingContext2D
}

function recorder(): { skin: Skin; calls: string[] } {
  const calls: string[] = []
  const note = (name: string) => (): void => { calls.push(name) }
  const skin: Skin = {
    paintSky: () => { throw new Error('cerul nu se pictează din drawWorld') },
    core: note('core'), shield: note('shield'), node: note('node'), building: note('building'), foe: note('foe'),
    hero: note('hero'), shot: note('shot'), glyph: note('glyph'), chip: note('chip'), coreIcon: note('coreIcon'),
  }
  return { skin, calls }
}

describe('ordinea straturilor', () => {
  it('nucleul sub obiecte, inelul peste nave, razele peste inel', () => {
    const s = quietGame()
    addNode(s, 'crystal', 500, 700)
    padOf(s, 'turret', 0).lvl = 1
    addFoe(s, 560, 690); addFoe(s, 540, 820)          // una deasupra nucleului pe ecran, una dedesubt
    s.shots.push({ x: 500, y: 700, tx: 560, ty: 690, a: 0, targetId: -1, dmg: 1 })
    const { skin, calls } = recorder()
    drawWorld(fakeCtx(), s, { x: 0, y: 0 }, { l: 0, t: 0, r: 1100, b: 1500 }, skin)
    const first = (n: string): number => calls.indexOf(n), last = (n: string): number => calls.lastIndexOf(n)
    expect(calls.filter((c) => c === 'core')).toHaveLength(1)
    expect(calls.filter((c) => c === 'shield')).toHaveLength(1)
    expect(calls.filter((c) => c === 'foe')).toHaveLength(2)
    for (const n of ['node', 'building', 'foe', 'hero']) {
      expect(first('core')).toBeLessThan(first(n))
      expect(last(n)).toBeLessThan(first('shield'))
    }
    expect(first('shield')).toBeLessThan(first('shot'))
  })
  it('ce nu se vede nu se desenează', () => {
    const s = quietGame()
    addFoe(s, 1000, 1400)
    const { skin, calls } = recorder()
    drawWorld(fakeCtx(), s, { x: 0, y: 0 }, { l: 300, t: 500, r: 700, b: 1000 }, skin)
    expect(calls).not.toContain('foe')
    expect(calls).toContain('core')
  })
})
