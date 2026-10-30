// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";

import { moveBetweenPillTabs } from "./pill-tabs";

describe("a pill tab row", () => {
  const row = () => {
    document.body.innerHTML = '<div id="row"><button role="tab" id="a">A</button><button role="tab" id="b">B</button><button role="tab" id="c">C</button></div>';
    return document.getElementById("row")!;
  };
  const press = (tabs: HTMLElement, key: string, from: string) => {
    document.getElementById(from)!.focus();
    let selected = "";
    moveBetweenPillTabs({ key, currentTarget: tabs, preventDefault: () => {} }, (tab) => { selected = tab.id; });
    return selected;
  };

  it("moves with the arrow keys and wraps at either end", () => {
    const tabs = row();
    expect(press(tabs, "ArrowRight", "a")).toBe("b");
    expect(press(tabs, "ArrowRight", "c")).toBe("a");
    expect(press(tabs, "ArrowLeft", "a")).toBe("c");
    expect(press(tabs, "ArrowLeft", "b")).toBe("a");
  });

  it("jumps to the first or last tab with Home and End, and leaves other keys alone", () => {
    const tabs = row();
    expect(press(tabs, "Home", "b")).toBe("a");
    expect(press(tabs, "End", "a")).toBe("c");
    expect(press(tabs, "Tab", "b")).toBe("");
  });
});
