/** Every body a bot can wear. */

import { z } from "zod";

import { botMascotBody, MASCOT_BODY_IDS } from "./mascot-bodies.ts";

export const BOT_BODY_IDS = MASCOT_BODY_IDS;

export type BotBodyId = (typeof BOT_BODY_IDS)[number];

export const botBodySchema = z.enum(BOT_BODY_IDS);

/** Runtime-safe read of an untrusted persisted or streamed body id. */
export function botBodyId(value: unknown): BotBodyId {
  const direct = botBodySchema.safeParse(value).data;
  if (direct) return direct;
  return botMascotBody(value);
}

