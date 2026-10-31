/**
 * The catalog definitions. The outlines themselves live in `botkit-bodies.ts`.
 */

import { BOTKIT_BODY_DEFS } from "./botkit-bodies.ts";

export interface BodyDef {
  id: string
  name: string
  /** Absolute cubic path data: `M`, `C` and `Z` only. */
  d: string
  /** Separate filled shapes, when the drawing is more than one path. */
  paths?: string[]
  /** Eye-pair centre in the source artwork. */
  face?: { x: number; y: number }
  /** `[minX, minY, width, height]` of the nominal canvas, advisory only:
   * bounds come from flattening the path. */
  viewBox: [number, number, number, number]
  /** Visual nudge in face-space units. */
  offset?: { x?: number; y?: number }
}

/** The BotKit outlines, in the order the picker shows them. */
export const BODY_DEFS: BodyDef[] = BOTKIT_BODY_DEFS

export const BODY_IDS: string[] = BODY_DEFS.map(s => s.id)
