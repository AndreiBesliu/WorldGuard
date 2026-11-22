import { expect, it } from 'vitest'
import { parseFlags } from './flags'

it('semnele din adresă', () => {
  expect(parseFlags('')).toEqual({ seed: null, debug: false, zbor: null })
  expect(parseFlags('?seed=7&debug=1')).toEqual({ seed: 7, debug: true, zbor: null })
  expect(parseFlags('?seed=abc')).toEqual({ seed: null, debug: false, zbor: null })
})

it('?zbor=N pornește un zbor în sectorul N, doar împreună cu ?debug=1', () => {
  expect(parseFlags('?debug=1&zbor=1').zbor).toBe(1)
  expect(parseFlags('?debug=1&zbor=3').zbor).toBe(3)
  expect(parseFlags('?zbor=1').zbor).toBeNull()                       // fără debug, nimic
  expect(parseFlags('?debug=0&zbor=1').zbor).toBeNull()
  for (const bad of ['0', '-1', '1.5', 'abc', '', '99999999999999999999']) expect(parseFlags(`?debug=1&zbor=${bad}`).zbor).toBeNull()
})
