// @vitest-environment happy-dom
import { act, createElement, Fragment } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({ advanced: false }));
vi.mock("@/lib/interface-mode", () => ({ useAdvancedMode: () => fixture.advanced }));

const { Select, readSelectOptions } = await import("./Select");

let container: HTMLDivElement;
let root: Root;

const options = () => [
  createElement("option", { key: "a", value: "a" }, "Alpha"),
  createElement("optgroup", { key: "g", label: "More" }, [
    createElement("option", { key: "b", value: "b" }, "Bravo"),
    createElement("option", { key: "c", value: "c", disabled: true }, "Charlie"),
  ]),
];

const mount = async (props: Parameters<typeof Select>[0]) => {
  root = createRoot(container);
  await act(async () => root.render(createElement(Select, props)));
};

const trigger = () => container.querySelector<HTMLButtonElement>('[role="combobox"]')!;
const listbox = () => document.querySelector<HTMLElement>('[role="listbox"]');
const rows = () => [...(listbox()?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])];

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  fixture.advanced = false;
  container = document.createElement("div");
  document.body.append(container);
});

afterEach(async () => {
  await act(async () => root?.unmount());
  container.remove();
  document.body.innerHTML = "";
});

describe("the app select", () => {
  it("reads option and optgroup children without changing the public Select API", () => {
    const { options: parsed, entries } = readSelectOptions(options());
    expect(parsed).toEqual([
      { value: "a", label: "Alpha", disabled: false },
      { value: "b", label: "Bravo", disabled: false },
      { value: "c", label: "Charlie", disabled: true },
    ]);
    expect(entries.filter((entry) => entry.kind === "group").map((entry) => entry.label)).toEqual(["More"]);
  });

  it("reads options nested inside fragments", () => {
    const { options: parsed } = readSelectOptions(
      createElement(Fragment, null,
        createElement("option", { value: "none" }, "Does not repeat"),
        createElement(Fragment, null,
          createElement("option", { value: "monthly" }, "Monthly"),
          createElement("option", { value: "yearly" }, "Yearly"),
          createElement("option", { value: "cron" }, "Custom cron"),
        ),
      ),
    );
    expect(parsed.map((option) => option.value)).toEqual(["none", "monthly", "yearly", "cron"]);
  });

  it("keeps pointer and mouse presses inside the portalled listbox away from window dismissers", async () => {
    const onChange = vi.fn();
    const pointerdown = vi.fn();
    const mousedown = vi.fn();
    window.addEventListener("pointerdown", pointerdown);
    window.addEventListener("mousedown", mousedown);
    try {
      await mount({ value: "b", onChange, children: options() });
      await act(async () => trigger().click());
      pointerdown.mockClear();
      mousedown.mockClear();
      const alpha = rows()[0]!;
      await act(async () => { alpha.dispatchEvent(new Event("pointerdown", { bubbles: true })); });
      await act(async () => { alpha.dispatchEvent(new MouseEvent("mousedown", { bubbles: true })); });
      expect(pointerdown).not.toHaveBeenCalled();
      expect(mousedown).not.toHaveBeenCalled();
      await act(async () => alpha.click());
      expect(onChange).toHaveBeenCalledWith({ target: { value: "a" } });
    } finally {
      window.removeEventListener("pointerdown", pointerdown);
      window.removeEventListener("mousedown", mousedown);
    }
  });

  it("reads options wrapped in a fragment, as routine repeat choices are", () => {
    const { options: parsed } = readSelectOptions(createElement(Fragment, null,
      createElement("option", { value: "daily" }, "Daily"),
      createElement(Fragment, null,
        createElement("option", { value: "monthly" }, "Monthly"),
        createElement("option", { value: "cron" }, "Custom cron"),
      ),
    ));
    expect(parsed.map((option) => option.value)).toEqual(["daily", "monthly", "cron"]);
  });

  it("shows the selected label and opens a real listbox with groups", async () => {
    const onChange = vi.fn();
    await mount({ value: "b", onChange, children: options() });
    expect(trigger().textContent).toContain("Bravo");
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
    await act(async () => trigger().click());
    expect(trigger().getAttribute("aria-expanded")).toBe("true");
    expect(listbox()).not.toBeNull();
    expect(listbox()!.textContent).toContain("More");
    expect(rows().map((row) => row.textContent)).toEqual(["Alpha", "Bravo", "Charlie"]);
  });

  it("portals the listbox to the document body, out of a glass dialog's containing block", async () => {
    fixture.advanced = false;
    container.style.backdropFilter = "blur(28px) saturate(170%)";
    await mount({ value: "b", onChange: () => {}, children: options() });
    await act(async () => trigger().click());
    expect(listbox()!.parentElement).toBe(document.body);
    expect(container.querySelector('[role="listbox"]')).toBeNull();
  });

  it("keeps presses inside the portalled listbox away from window dismissers", async () => {
    const onChange = vi.fn();
    const onPointer = vi.fn();
    const onMouse = vi.fn();
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("mousedown", onMouse);
    try {
      await mount({ value: "b", onChange, children: options() });
      await act(async () => trigger().click());
      onPointer.mockClear();
      onMouse.mockClear();
      const alpha = rows()[0]!;
      await act(async () => alpha.dispatchEvent(new Event("pointerdown", { bubbles: true })));
      await act(async () => alpha.dispatchEvent(new MouseEvent("mousedown", { bubbles: true })));
      expect(onPointer).not.toHaveBeenCalled();
      expect(onMouse).not.toHaveBeenCalled();
      await act(async () => alpha.click());
      expect(onChange).toHaveBeenCalledWith({ target: { value: "a" } });
      expect(trigger().getAttribute("aria-expanded")).toBe("false");
    } finally {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("mousedown", onMouse);
    }
  });

  it("walks enabled rows with the keyboard, skips disabled options and applies Enter", async () => {
    const onChange = vi.fn();
    await mount({ value: "b", onChange, children: options() });
    await act(async () => trigger().click());
    const [alpha, bravo] = rows();
    await act(async () => alpha!.focus());
    await act(async () => alpha!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true })));
    expect(document.activeElement).toBe(bravo);
    // Charlie is disabled, so the next enabled row wraps to Alpha.
    await act(async () => bravo!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true })));
    expect(document.activeElement).toBe(alpha);
    // And the other way skips Charlie too.
    await act(async () => alpha!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true, cancelable: true })));
    expect(document.activeElement).toBe(bravo);
    await act(async () => alpha!.focus());
    await act(async () => alpha!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })));
    expect(onChange).toHaveBeenCalledWith({ target: { value: "a" } });
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger());
  });

  it("closes on Escape without choosing", async () => {
    const onChange = vi.fn();
    await mount({ value: "b", onChange, children: options() });
    await act(async () => trigger().click());
    await act(async () => rows()[0]!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })));
    expect(onChange).not.toHaveBeenCalled();
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
  });

  it("keeps the native select in Advanced mode", async () => {
    fixture.advanced = true;
    await mount({ value: "b", onChange: () => {}, children: options() });
    expect(container.querySelector("select")).not.toBeNull();
    expect(container.querySelector<HTMLSelectElement>("select")!.value).toBe("b");
    expect(trigger()).toBeNull();
  });

  it("is disabled with no options, and marks its selected row", async () => {
    await mount({ value: "b", onChange: () => {}, children: options() });
    await act(async () => trigger().click());
    expect(rows()[1]!.getAttribute("aria-selected")).toBe("true");
    await act(async () => root.unmount());
    root = createRoot(container);
    await act(async () => root.render(createElement(Select, { value: "", onChange: () => {}, children: [] })));
    expect(trigger().disabled).toBe(true);
  });
});
