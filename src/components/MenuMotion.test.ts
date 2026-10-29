import { describe, expect, it } from "vitest";

import { MENU_MOTION_MS, useMenuMotion } from "./MenuMotion";

describe("menu motion", () => {
  it("opens and closes in the same render, with no animation class or exit state", () => {
    expect(useMenuMotion(false)).toEqual({ shown: false, closing: false, className: "", exitProps: {} });
    expect(useMenuMotion(true)).toEqual({ shown: true, closing: false, className: "", exitProps: {} });
    expect(useMenuMotion(false)).toEqual({ shown: false, closing: false, className: "", exitProps: {} });
  });

  it("has no exit window left to wait for", () => {
    expect(MENU_MOTION_MS).toBe(0);
  });
});
