// @vitest-environment happy-dom
// The permission card's job is a sequence of side effects: open the named panes, then check once when the
// person comes back. This mounts the real component and drives those steps.
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

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  fixture.localComputer = { available: false, message: "Screen Recording and Accessibility required" } as DesktopCapabilities["localComputer"];
  fixture.permOpenSettings.mockClear();
  fixture.relaunch.mockClear();
  fixture.retry.mockClear();
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
  it("opens each named pane, then retries once when focus returns", async () => {
    await mount();
    await act(async () => button("Open System Settings")!.click());
    expect(fixture.permOpenSettings.mock.calls).toEqual([["accessibility"], ["screen"]]);

    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });
    await flush();
    expect(fixture.retry).toHaveBeenCalledTimes(1);

    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });
    expect(fixture.retry).toHaveBeenCalledTimes(1);
  });

  it("opens only the pane the reason names", async () => {
    fixture.localComputer = { available: false, message: "Accessibility required; grant access in System Settings" } as DesktopCapabilities["localComputer"];
    await mount();
    await act(async () => button("Open System Settings")!.click());
    expect(fixture.permOpenSettings.mock.calls).toEqual([["accessibility"]]);
  });

  it("opens both panes for a generic driver failure, as the old card did", async () => {
    fixture.localComputer = { available: false, status: "unavailable" } as DesktopCapabilities["localComputer"];
    await mount();
    await act(async () => button("Open System Settings")!.click());
    expect(fixture.permOpenSettings.mock.calls).toEqual([["accessibility"], ["screen"]]);
  });

  it("relaunches and retries from their own buttons, with no red hover", async () => {
    await mount();
    expect(button("Retry")!.className).not.toContain("danger");
    expect(button("Relaunch OpenMausBot")!.className).not.toContain("danger");
    await act(async () => button("Relaunch OpenMausBot")!.click());
    expect(fixture.relaunch).toHaveBeenCalledTimes(1);
    await act(async () => button("Retry")!.click());
    await flush();
    expect(fixture.retry).toHaveBeenCalledTimes(1);
  });
});
