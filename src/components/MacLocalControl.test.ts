import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { setLocale } from "@/lib/i18n";
import { locales } from "@/locales";

const fixture = vi.hoisted(() => ({
  localComputer: { available: false, message: "Accessibility required; grant access in System Settings" } as DesktopCapabilities["localComputer"],
}));
vi.stubGlobal("window", {
  ogb: { platform: "darwin", permOpenSettings: vi.fn(), relaunch: vi.fn(), localControl: { retry: vi.fn() } },
});
vi.mock("./DesktopCapabilities", () => ({
  useDesktopCapabilities: () => ({ capabilities: { host: { platform: "darwin" }, localComputer: fixture.localComputer }, ready: true }),
}));

const { MacLocalControl } = await import("./MacLocalControl");
const { MacCuaRecoveryActions } = await import("./MacCuaRecoveryActions");

afterAll(() => vi.unstubAllGlobals());
afterEach(() => setLocale("en"));

describe("Mac local computer status", () => {
  it("shows the recorded Accessibility failure and its matching recovery actions", () => {
    const markup = renderToStaticMarkup(createElement(MacLocalControl));
    expect(markup).toContain("Accessibility is required for OpenMausBot");
    expect(markup).toContain("Open System Settings");
    expect(markup).toContain("Relaunch OpenMausBot");
    expect(markup).toContain("Driver detail");
    expect(markup).toContain("Retry");
  });

  it("uses the app card surface and carries the warning in the badge, never a red hover", () => {
    const markup = renderToStaticMarkup(createElement(MacLocalControl));
    expect(markup).toContain('data-mac-permission-card=""');
    expect(markup).toContain("border-hairline/40 bg-card");
    expect(markup).not.toContain("border-warning/25");
    expect(markup).not.toContain("bg-warning/10 p-4");
    expect(markup).not.toContain("hover:bg-danger");
    expect(markup).toContain("bg-warning/10");
  });

  it("keeps the driver reason behind the styled disclosure, unedited", () => {
    const markup = renderToStaticMarkup(createElement(MacLocalControl));
    expect(markup).toContain("<details");
    expect(markup).toContain("<summary");
    expect(markup).toContain("group-open:rotate-90");
    expect(markup).toContain("Accessibility required; grant access in System Settings");
  });

  it("renders the same action row inside the card and at the chat call site", () => {
    const card = renderToStaticMarkup(createElement(MacLocalControl));
    const actions = renderToStaticMarkup(createElement(MacCuaRecoveryActions, {
      reason: "Accessibility required; grant access in System Settings",
    }));
    const row = (html: string) => html.slice(html.indexOf('data-mac-cua-actions=""'), html.indexOf("</div>", html.indexOf('data-mac-cua-actions=""')) + 6);
    expect(row(card)).toBe(row(actions));
  });

  it("has every card string translated in every shipped locale", () => {
    for (const [code, pack] of Object.entries(locales)) {
      for (const key of [
        "computer.mac.permission.allowControl",
        "computer.mac.permission.openSystemSettings",
        "computer.mac.permission.retry",
        "computer.mac.permission.driverDetail",
        "computer.mac.permission.relaunch",
      ] as const) {
        expect(pack[key], `${code} ${key}`).toBeTruthy();
      }
    }
  });

  it("renders every visible word from the Japanese pack", () => {
    setLocale("ja");
    const pack = locales.ja!;
    const markup = renderToStaticMarkup(createElement(MacLocalControl));
    for (const key of [
      "computer.mac.permission.allowControl",
      "computer.mac.permission.openSystemSettings",
      "computer.mac.permission.relaunch",
      "computer.mac.permission.retry",
      "computer.mac.permission.driverDetail",
    ] as const) {
      expect(markup).toContain(pack[key]!);
    }
    expect(markup).not.toContain("Allow control of this computer");
    expect(markup).not.toContain("Open System Settings");
  });

  it("does not turn a missing reason into a claimed permission diagnosis", () => {
    fixture.localComputer = { available: false, status: "unavailable" } as DesktopCapabilities["localComputer"];
    const markup = renderToStaticMarkup(createElement(MacLocalControl));
    expect(markup).toContain("Local computer control is not ready");
    expect(markup).not.toContain("Accessibility is required");
    expect(markup).toContain("Open System Settings");
    expect(markup).not.toContain("<details");
  });

  it("does not offer host repair actions to a remote renderer", () => {
    fixture.localComputer = { available: false, status: "unavailable", reasonCode: "remote-server" } as DesktopCapabilities["localComputer"];
    expect(renderToStaticMarkup(createElement(MacLocalControl))).toBe("");
  });
});
