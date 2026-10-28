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

const { MacLocalControl, MacCuaPermissionCard } = await import("./MacLocalControl");

afterAll(() => vi.unstubAllGlobals());
afterEach(() => setLocale("en"));

const ALWAYS_VISIBLE = [
  "computer.mac.permission.title",
  "computer.mac.permission.screenName",
  "computer.mac.permission.accessibilityName",
  "computer.mac.permission.granted",
  "computer.mac.permission.notGranted",
  "computer.mac.permission.retry",
  "computer.mac.permission.relaunch",
] as const;

const VISIBLE_KEYS = [
  ...ALWAYS_VISIBLE,
  "computer.mac.permission.openSettings",
  "computer.mac.permission.waiting",
  "computer.mac.permission.settingsHint",
  "computer.mac.permission.relaunchHint",
] as const;

describe("Mac local computer permission card", () => {
  it("shows the missing pane and the granted one side by side", () => {
    const markup = renderToStaticMarkup(createElement(MacLocalControl));
    expect(markup).toContain("Accessibility is required for OpenMausBot");
    expect(markup).toContain("Screen Recording");
    expect(markup).toContain("Granted");
    expect(markup).toContain("Not granted");
    expect(markup).toContain("Open Accessibility Settings");
    expect(markup).toContain("Retry");
    expect(markup).not.toContain("Technical details");
    expect(markup).toContain("Retry");
  });

  it("uses the app card surface and accent, never a warning or danger wash", () => {
    const markup = renderToStaticMarkup(createElement(MacLocalControl));
    expect(markup).toContain('data-mac-permission-card=""');
    expect(markup).toContain("bg-card");
    expect(markup).toContain("lucide-shield text-accent-text");
    expect(markup.indexOf("lucide-shield")).toBeLessThan(markup.indexOf("Allow control of this computer"));
    expect(markup).not.toContain("bg-accent/12");
    expect(markup).not.toContain("bg-accent/10");
    expect(markup).not.toContain("border-warning/25");
    expect(markup).not.toContain("bg-warning/10 p-4");
    expect(markup).not.toContain("hover:bg-danger");
    expect(markup).not.toContain("rounded-full border-current");
  });

  it("keeps the raw driver reason out of the card", () => {
    fixture.localComputer = { available: false, message: "Accessibility required; grant access in System Settings" } as DesktopCapabilities["localComputer"];
    const markup = renderToStaticMarkup(createElement(MacLocalControl));
    expect(markup).not.toContain("<details");
    expect(markup).not.toContain("Accessibility required; grant access in System Settings");
  });

  it("renders both permission rows when both are missing, Screen Recording first", () => {
    fixture.localComputer = { available: false, message: "Screen Recording and Accessibility required" } as DesktopCapabilities["localComputer"];
    const markup = renderToStaticMarkup(createElement(MacLocalControl));
    expect(markup).toContain("Screen Recording and Accessibility are required");
    expect(markup.match(/>Not granted</g)?.length).toBe(2);
    expect(markup.indexOf("Screen Recording")).toBeLessThan(markup.indexOf("Accessibility"));
    expect(markup).toContain("Open Screen Recording Settings");
    expect(markup).toContain("Open Accessibility Settings");
    expect(markup).toContain("Open System Settings");
  });

  it("does not diagnose a permission when the reason names none", () => {
    fixture.localComputer = { available: false, status: "unavailable" } as DesktopCapabilities["localComputer"];
    const markup = renderToStaticMarkup(createElement(MacLocalControl));
    expect(markup).toContain("Local computer control is not ready");
    expect(markup).not.toContain("Not granted");
    expect(markup).toContain("Open System Settings");
    expect(markup).not.toContain("Relaunch OpenMausBot");
  });

  it("renders the chat mount identically without a red bubble", () => {
    fixture.localComputer = { available: false, message: "Accessibility required; grant access in System Settings" } as DesktopCapabilities["localComputer"];
    const card = renderToStaticMarkup(createElement(MacCuaPermissionCard, { permissions: ["accessibility"], logReason: "Accessibility required; grant access in System Settings" }));
    const row = (html: string) => html.slice(html.indexOf('data-mac-cua-actions=""'), html.indexOf("</div>", html.indexOf('data-mac-cua-actions=""')) + 6);
    expect(row(card)).toBe(row(renderToStaticMarkup(createElement(MacLocalControl))));
    expect(card).not.toContain("border-danger/30 bg-danger/10");
  });

  it("has every visible key translated in all 15 packs, with no English fallback", () => {
    for (const [code, pack] of Object.entries(locales)) {
      for (const key of VISIBLE_KEYS) {
        expect(pack[key], `${code} ${key}`).toBeTruthy();
        if (code !== "en") expect(pack[key], `${code} ${key}`).not.toBe(locales.en![key]);
      }
    }
    for (const key of ["computer.mac.permission.requiredOne", "computer.mac.permission.requiredBoth", "computer.mac.permission.screenSettings", "computer.mac.permission.accessibilitySettings"] as const) {
      for (const [code, pack] of Object.entries(locales)) expect(pack[key], `${code} ${key}`).toBeTruthy();
    }
  });

  it("renders every visible word from the Japanese pack", () => {
    setLocale("ja");
    const pack = locales.ja!;
    const markup = renderToStaticMarkup(createElement(MacLocalControl));
    for (const key of ALWAYS_VISIBLE) expect(markup).toContain(pack[key]!);
    expect(markup).not.toContain("Allow control of this computer");
    expect(markup).not.toContain("Open System Settings");
    expect(markup).not.toContain("Not granted");
  });

  it("does not offer host repair actions to a remote renderer", () => {
    fixture.localComputer = { available: false, status: "unavailable", reasonCode: "remote-server" } as DesktopCapabilities["localComputer"];
    expect(renderToStaticMarkup(createElement(MacLocalControl))).toBe("");
  });
});
