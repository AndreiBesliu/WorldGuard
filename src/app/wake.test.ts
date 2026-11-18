import { describe, expect, it } from 'vitest'
import { createWake, type WakeNav } from './wake'

const fake = (fail = false) => {
  const log: string[] = []
  const nav: WakeNav = { wakeLock: { request: async () => { log.push('cere'); if (fail) throw new Error('refuzat'); return { release: async () => { log.push('lasă') } } } } }
  return { log, nav }
}
const settle = () => new Promise((r) => setTimeout(r, 0))

describe('ecranul aprins', () => {
it('fără sprijin din partea telefonului nu face nimic și nu aruncă', () => {
  const w = createWake({}); expect(() => { w.on(); w.off() }).not.toThrow()
})
it('cere o singură dată, lasă la oprire și poate cere din nou', async () => {
  const { log, nav } = fake(); const w = createWake(nav)
  w.on(); w.on(); await settle(); expect(log).toEqual(['cere'])
  w.off(); await settle(); expect(log).toEqual(['cere', 'lasă'])
  w.on(); await settle(); expect(log).toEqual(['cere', 'lasă', 'cere'])
})
it('oprit înainte să primească răspunsul, lasă blocarea când sosește', async () => {
  const { log, nav } = fake(); const w = createWake(nav)
  w.on(); w.off(); await settle()
  expect(log).toEqual(['cere', 'lasă'])
})
it('un refuz nu aruncă nimic', async () => {
  const { log, nav } = fake(true); const w = createWake(nav)
  w.on(); await settle(); w.off(); await settle()
  expect(log).toEqual(['cere'])
})
})
