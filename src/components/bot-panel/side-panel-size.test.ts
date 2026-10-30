import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  SIDE_PANEL_WIDTH_KEYS,
  SidePanelResizeHandle,
  clampSidePanelWidth,
  readSidePanelWidth,
  sidePanelWidthBounds,
  type SidePanelSizing,
} from "./side-panel-size";

const store = (value?: string) => ({ getItem: () => value ?? null });

describe("side panel sizes", () => {
  it("uses Nova's one set of numbers: 320/280/420", () => {
    expect(sidePanelWidthBounds(true)).toEqual({ default: 320, min: 280, max: 420 });
    expect(sidePanelWidthBounds(false), "the mode flag no longer changes the panel").toEqual({ default: 320, min: 280, max: 420 });
  });

  it("clamps to the panel's range and to the room this window has", () => {
    expect(clampSidePanelWidth(200, true, 420)).toBe(280);
    expect(clampSidePanelWidth(500, true, 420)).toBe(420);
    expect(clampSidePanelWidth(400, true, 360)).toBe(360);
    expect(clampSidePanelWidth(500, false, 560)).toBe(500);
    expect(clampSidePanelWidth(300, false, 560)).toBe(300);
    expect(clampSidePanelWidth(500, false, 300)).toBe(300);
  });

  it("remembers one width and ignores a stored value outside the range", () => {
    expect(readSidePanelWidth(true, store())).toBe(320);
    expect(readSidePanelWidth(true, store("380"))).toBe(380);
    expect(readSidePanelWidth(false, store("380"))).toBe(380);
    expect(readSidePanelWidth(true, store("900"))).toBe(320);
    expect(readSidePanelWidth(true, store("300"))).toBe(300);
    expect(readSidePanelWidth(true, store("200"))).toBe(320);
    expect(SIDE_PANEL_WIDTH_KEYS.simple).toBe("openmausbot.sidePanelWidth.simple");
  });

  it("draws an 8px keyboard-resizable edge with no grip", () => {
    const sizing = {
      width: 320, min: 280, max: 420, resizing: false,
      handleProps: { onPointerDown: () => {}, onPointerMove: () => {}, onPointerUp: () => {}, onPointerCancel: () => {}, onKeyDown: () => {}, onDoubleClick: () => {} },
    } satisfies SidePanelSizing;
    const html = renderToStaticMarkup(createElement(SidePanelResizeHandle, { sizing }));
    expect(html).toContain('role="separator"');
    expect(html).toContain('aria-orientation="vertical"');
    expect(html).toContain('aria-valuemin="280"');
    expect(html).toContain('aria-valuemax="420"');
    expect(html).toContain('aria-valuenow="320"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain("w-2");
    expect(html).toContain("-start-1");
    expect(html).toContain("hidden");
    expect(html).toContain("md:block");
    expect(html).not.toContain("<span");
  });
});
