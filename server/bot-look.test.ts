import { describe, expect, it } from "vitest";

import { MASCOT_BODY_IDS } from "../shared/mascot-bodies.ts";
import { freshLook, STARTER_COLORS } from "./bot-look.ts";

describe("a new bot's first look", () => {
  it("wears one of the nine shapes, picked at random, in one of the twelve hues", () => {
    expect(STARTER_COLORS).toEqual(["green", "blue", "red", "orange", "purple", "cyan", "pink", "yellow", "teal", "coral", "white", "black"]);
    for (const roll of [0, 0.5, 0.999]) expect(MASCOT_BODY_IDS).toContain(freshLook([], () => roll).mascotBody);
    expect(freshLook([], () => 0).mascotBody).not.toBe(freshLook([], () => 0.999).mascotBody);
  });

  it("prefers a shape no bot here wears yet", () => {
    const worn = MASCOT_BODY_IDS.slice(0, MASCOT_BODY_IDS.length - 1).map((mascotBody) => ({ color: "green" as const, mascotBody }));
    const left = freshLook(worn, () => 0.42).mascotBody;
    expect(left).toBe(MASCOT_BODY_IDS[MASCOT_BODY_IDS.length - 1]);
  });

  it("picks its colour at random, preferring one no bot here wears yet", () => {
    expect(freshLook([], () => 0).color).not.toBe(freshLook([], () => 0.999).color);
    const worn = [{ color: "red" as const }, { color: "blue" as const }];
    for (const roll of [0, 0.3, 0.6, 0.999]) expect(["red", "blue"]).not.toContain(freshLook(worn, () => roll).color);
  });
});
