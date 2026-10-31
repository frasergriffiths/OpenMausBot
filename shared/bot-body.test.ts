import { describe, expect, it } from "vitest";

import { BOT_BODY_IDS, botBodyId, botBodySchema } from "./bot-body.ts";
import { MASCOT_BODY_IDS } from "./mascot-bodies.ts";

describe("bot bodies", () => {
  it("accepts every gradient body the catalog ships", () => {
    expect(BOT_BODY_IDS).toEqual(MASCOT_BODY_IDS);
    for (const id of BOT_BODY_IDS) expect(botBodySchema.safeParse(id).success).toBe(true);
  });

  it("falls back to the default for anything it does not know", () => {
    expect(botBodyId("star")).toBe("star");
    expect(botBodyId("hexagram")).toBe("cursor");
    expect(botBodyId(undefined)).toBe("cursor");
  });
});
