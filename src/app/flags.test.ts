import { expect, it } from 'vitest'
import { parseFlags } from './flags'

it('semnele din adresă', () => {
  expect(parseFlags('')).toEqual({ seed: null, debug: false })
  expect(parseFlags('?seed=7&debug=1')).toEqual({ seed: 7, debug: true })
  expect(parseFlags('?seed=abc')).toEqual({ seed: null, debug: false })
})
