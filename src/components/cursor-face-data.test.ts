import { describe, expect, it } from "vitest";

import {
  EXPRESSIONS,
  EXPRESSION_COUNT,
  FACE_BOX,
  FACE_CENTRE,
  GAZE,
  GAZE_TRAVEL,
} from "./cursor-face-data";

describe("cursor face data", () => {
  it("carries one entry per expression in every table", () => {
    expect(EXPRESSION_COUNT).toBe(25);
    expect(EXPRESSIONS).toHaveLength(25);
    expect(GAZE).toHaveLength(25);
  });

  it("gives every expression two eye rings of 48 points", () => {
    for (const expression of EXPRESSIONS) {
      expect(expression).toHaveLength(2);
      for (const ring of expression) expect(ring).toHaveLength(48);
    }
  });

  it("keeps the face-space constants the renderer and the phone agree on", () => {
    expect(FACE_BOX).toBe(228.541);
    expect(FACE_CENTRE).toEqual([120, 122.5]);
    expect(GAZE_TRAVEL).toEqual({ x: 13.2, y: 8.4 });
  });
});
