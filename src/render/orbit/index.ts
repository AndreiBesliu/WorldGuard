// Aspectul „Orbită”: planetă în spațiu, nave, cristale și asteroizi. Singurul aspect al jocului.
import type { Skin } from '../skin'
import { core, coreIcon, paintSky, shield } from './scene'
import { building, chip, foe, glyph, hero, node, shot } from './things'

export const ORBIT: Skin = { paintSky, core, shield, node, building, foe, hero, shot, glyph, chip, coreIcon }
