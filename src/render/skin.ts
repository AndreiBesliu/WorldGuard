// Interfața unui aspect: ce se desenează altfel de la o temă la alta. `world.ts` hotărăște ordinea, aspectul doar formele.
import type { Foe, GameState, Input, Pad, PadKind, Res, ResNode, Shot } from '../sim/state'

/** Un aspect al jocului: tot ce se desenează altfel de la o temă la alta. Citește starea, nu o scrie. */
export interface Skin {
  /** Fondul lumii, pictat o singură dată, la mărimea WORLD. */
  paintSky(): HTMLCanvasElement
  /** Nucleul fără inel: aura, corpul și satelitul. Se desenează sub toate obiectele. */
  core(ctx: CanvasRenderingContext2D, s: GameState): void
  /** Inelul de viață al nucleului. Se desenează peste nave. */
  shield(ctx: CanvasRenderingContext2D, s: GameState): void
  node(ctx: CanvasRenderingContext2D, s: GameState, n: ResNode): void
  building(ctx: CanvasRenderingContext2D, s: GameState, p: Pad): void
  foe(ctx: CanvasRenderingContext2D, s: GameState, f: Foe): void
  hero(ctx: CanvasRenderingContext2D, s: GameState, input: Input): void
  shot(ctx: CanvasRenderingContext2D, sh: Shot): void
  /** Semnul din mijlocul unui cerc de investit. */
  glyph(ctx: CanvasRenderingContext2D, kind: PadKind, x: number, y: number): void
  /** Jetonul unei resurse, într-un pătrat de 10 px cu mijlocul laturii stângi în (x, y). */
  chip(ctx: CanvasRenderingContext2D, res: Res, x: number, y: number): void
  /** Nucleul în mic, pentru indicatorul de la marginea ecranului; (x, y) e centrul. */
  coreIcon(ctx: CanvasRenderingContext2D, x: number, y: number, tone: string): void
}
