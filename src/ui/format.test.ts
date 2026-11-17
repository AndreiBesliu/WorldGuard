import { expect, it } from 'vitest'
import { clock } from './format'

it('ceasul', () => { expect([clock(0), clock(59.9), clock(60), clock(272.9), clock(3600)]).toEqual(['0:00', '0:59', '1:00', '4:32', '60:00']) })
