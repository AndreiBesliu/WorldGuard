// Interfața unui aspect: ce se desenează altfel de la o temă la alta. `world.ts` hotărăște ordinea, aspectul doar formele.
import type { Foe, GameState, Input, Pad, PadKind, Res, ResNode, Shot } from '../sim/state'

/**
 * Un aspect al jocului: formele de pe canvas care se desenează altfel de la o temă la alta. Citește starea, nu o scrie.
 * Contractul stării canvasului: aspectul lasă `globalAlpha` cum l-a găsit (un cerc estompat își desenează semnul și
 * jetoanele la opacitatea lui); celelalte proprietăți (culori, grosimi, `lineCap`) și le pune singur cine desenează.
 */
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
  /** Jetonul unei resurse, cu mijlocul laturii stângi în (x, y): cam 11 px lățime (de la x − 0,5 la x + 10,5) și până la 13 px
   *  înălțime (y ± 6,5). `world.ts` începe textul de lângă el la x + 16. */
  chip(ctx: CanvasRenderingContext2D, res: Res, x: number, y: number): void
  /** Nucleul în mic, pentru indicatorul de la marginea ecranului; (x, y) e centrul. */
  coreIcon(ctx: CanvasRenderingContext2D, x: number, y: number, tone: string): void
}
