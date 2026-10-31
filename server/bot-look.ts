import { MASCOT_BODY_IDS, type MascotBodyId } from "../shared/mascot-bodies.ts";
import { MAUS_COLOR_NAMES, type MausColor } from "../shared/wire.ts";

export const STARTER_COLORS: readonly MausColor[] = MAUS_COLOR_NAMES;
const ROTATION: readonly MausColor[] = ["green", "blue", "red", "orange", "purple", "cyan", "pink", "yellow", "teal", "coral"];

/** The colour of the bot made `index`-th when nothing else picks one. */
export const rotationColor = (index: number): MausColor => ROTATION[index % ROTATION.length]!;

/** A new bot's first look: a random colour and shape no bot here wears yet, when any are left. */
export function freshLook(
  bots: ReadonlyArray<{ color: MausColor; mascotBody?: string | null }>,
  random: () => number = Math.random,
): { color: MausColor; mascotBody: MascotBodyId } {
  const unworn = STARTER_COLORS.filter((color) => !bots.some((bot) => bot.color === color));
  const pool = unworn.length ? unworn : STARTER_COLORS;
  const unwornBodies = MASCOT_BODY_IDS.filter((id) => !bots.some((bot) => bot.mascotBody === id));
  const bodyPool: readonly MascotBodyId[] = unwornBodies.length ? unwornBodies : MASCOT_BODY_IDS;
  return {
    color: pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))]!,
    mascotBody: bodyPool[Math.min(bodyPool.length - 1, Math.floor(random() * bodyPool.length))]!,
  };
}
