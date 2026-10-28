// @vitest-environment happy-dom
// The permission card is a sequence of side effects: open the next pane, wait for the person, then check once.
// This mounts the real component and drives those steps.
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({
  localComputer: { available: false, message: "Screen Recording and Accessibility required" } as DesktopCapabilities["localComputer"],
  permOpenSettings: vi.fn(async () => {}),
  relaunch: vi.fn(async () => {}),
  retry: vi.fn(async () => {}),
}));

vi.mock("./DesktopCapabilities", () => ({
  useDesktopCapabilities: () => ({
    capabilities: { host: { platform: "darwin" }, localComputer: fixture.localComputer },
    ready: true,
  }),
}));

const { MacLocalControl } = await import("./MacLocalControl");

let container: HTMLDivElement;
let root: Root;

const flush = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

const mount = async () => {
  root = createRoot(container);
  await act(async () => root.render(createElement(MacLocalControl)));
  await flush();
};

const button = (label: string) =>
  [...container.querySelectorAll<HTMLButtonElement>("button")].find((candidate) => candidate.textContent === label);
// A permission row's visible text is the pane and its status; the action lives in its accessible name.
const row = (name: string) =>
  [...container.querySelectorAll<HTMLButtonElement>("button[aria-label]")].find((candidate) => candidate.getAttribute("aria-label")!.startsWith(name));

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  fixture.localComputer = { available: false, message: "Screen Recording and Accessibility required" } as DesktopCapabilities["localComputer"];
  fixture.permOpenSettings.mockClear();
  fixture.relaunch.mockClear();
  fixture.retry.mockClear();
  fixture.retry.mockResolvedValue(undefined);
  (window as unknown as { ogb: unknown }).ogb = {
    platform: "darwin",
    permOpenSettings: fixture.permOpenSettings,
    relaunch: fixture.relaunch,
    localControl: { retry: fixture.retry },
  };
  container = document.createElement("div");
  document.body.append(container);
});

afterEach(async () => {
  await act(async () => root?.unmount());
  container.remove();
  document.body.innerHTML = "";
});

describe("the Mac permission card actions", () => {
  it("offers one filled action and no Retry", async () => {
    await mount();
    const primary = button("Open System Settings")!;
    expect(primary.className).toContain("h-8");
    expect(primary.className).toContain("max-w-[18rem]");
    expect(primary.className).not.toContain("danger");
    expect(primary.className).not.toContain("rounded-full");
    expect(primary.className).toContain("bg-accent");
    expect(button("Relaunch OpenMausBot")).toBeUndefined();
    expect(button("Retry")).toBeUndefined();
    expect(container.querySelector(".border-t")).toBeNull();
    // The row's name carries the status the label would otherwise hide from a screen reader.
    expect(row("Screen Recording")!.getAttribute("aria-label")).toBe("Screen Recording, Not granted. Open Screen Recording Settings");
  });

  it("opens only the first missing pane from the primary action", async () => {
    await mount();
    await act(async () => button("Open System Settings")!.click());
    expect(fixture.permOpenSettings.mock.calls).toEqual([["screen"]]);
  });

  it("marks the opened row Waiting, then flips the primary to Relaunch when a retry is still missing", async () => {
    await mount();
    await act(async () => button("Open System Settings")!.click());
    expect(container.textContent).toContain("Waiting for you");
    expect(container.textContent).toContain("this card updates by itself");

    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });
    await flush();
    expect(fixture.retry).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain("Already granted it? Relaunch OpenMausBot.");
    expect(button("Relaunch OpenMausBot")!.className).toContain("bg-accent");

    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });
    expect(fixture.retry).toHaveBeenCalledTimes(1);
  });

  it("opens the missing pane when only Accessibility is absent", async () => {
    fixture.localComputer = { available: false, message: "Accessibility required; grant access in System Settings" } as DesktopCapabilities["localComputer"];
    await mount();
    expect(container.textContent).toContain("Accessibility is required");
    expect(container.textContent).toContain("Granted");
    expect(row("Accessibility")!.getAttribute("aria-label")).toBe("Accessibility, Not granted. Open Accessibility Settings");
    await act(async () => row("Accessibility")!.click());
    expect(fixture.permOpenSettings.mock.calls).toEqual([["accessibility"]]);
  });

  it("opens the Privacy root for a generic failure and offers no relaunch", async () => {
    fixture.localComputer = { available: false, status: "unavailable" } as DesktopCapabilities["localComputer"];
    await mount();
    expect(container.textContent).toContain("Local computer control is not ready");
    expect(container.textContent).not.toContain("Not granted");
    await act(async () => button("Open System Settings")!.click());
    expect(fixture.permOpenSettings.mock.calls).toEqual([["privacy"]]);
  });

  it("relaunches from the filled slot once a grant is pending", async () => {
    await mount();
    await act(async () => button("Open System Settings")!.click());
    await act(async () => { window.dispatchEvent(new Event("focus")); });
    await flush();
    await act(async () => button("Relaunch OpenMausBot")!.click());
    expect(fixture.relaunch).toHaveBeenCalledTimes(1);
    // One automatic re-check when the window regains focus; there is no manual Retry.
    expect(fixture.retry).toHaveBeenCalledTimes(1);
  });

  it("shows a thrown automatic re-check as one alert line and keeps the card usable", async () => {
    fixture.retry.mockRejectedValueOnce(new Error("boom"));
    await mount();
    await act(async () => button("Open System Settings")!.click());
    await act(async () => { window.dispatchEvent(new Event("focus")); });
    await flush();
    const alerts = container.querySelectorAll('[role="alert"]');
    expect(alerts).toHaveLength(1);
    expect(alerts[0]!.textContent).toContain("boom");
    expect(button("Open System Settings")!.disabled).toBe(false);
  });

  it("logs the raw driver reason the card no longer shows", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    fixture.localComputer = { available: false, message: "Embedded host failed: Accessibility and Screen Recording required" } as DesktopCapabilities["localComputer"];
    await mount();
    expect(warn).toHaveBeenCalledWith("[mac-permissions] Local computer control is unavailable:", "Embedded host failed: Accessibility and Screen Recording required");
    expect(container.textContent).not.toContain("Embedded host failed");
    warn.mockRestore();
  });
});
