import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({
  available: false,
  message: "screen-recording,accessibility",
}));

vi.mock("../DesktopCapabilities", () => ({
  useDesktopCapabilities: () => ({
    ready: true,
    capabilities: {
      host: { platform: "darwin" },
      localComputer: { available: fixture.available, message: fixture.message, reasonCode: "permissions" },
    },
  }),
}));

const { AllowComputerBeat } = await import("./AllowComputerBeat");
const { MacCuaPermissionCard } = await import("../MacLocalControl");
import { missingMacCuaPermissions } from "@/lib/mac-cua-permissions";

describe("the first run's permission beat", () => {
  it("asks for both grants with Open System Settings, Check again and Skip for now", () => {
    const html = renderToStaticMarkup(createElement(AllowComputerBeat, { onNext: () => {}, onSkip: () => {} }));
    expect(html).toContain("Allow control of this computer");
    expect(html).toContain("Screen Recording");
    expect(html).toContain("Accessibility");
    expect(html).toContain("Open System Settings");
    expect(html).toContain("Check again");
    expect(html).toContain("Skip for now");
  });

  it("keeps the Settings card to its one action", () => {
    const html = renderToStaticMarkup(createElement(MacCuaPermissionCard, { permissions: missingMacCuaPermissions(fixture.message) }));
    expect(html).toContain("Open System Settings");
    expect(html).not.toContain("Check again");
    expect(html).not.toContain("Skip for now");
  });
});
