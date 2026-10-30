import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import en from "@/locales/en.json";

const fixture = vi.hoisted(() => ({ config: null as unknown }));
vi.mock("@/state/store", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/state/store")>();
  return { ...original, useStore: () => ({ state: { ...original.initialState, config: fixture.config }, dispatch: vi.fn() }) };
});

const { CloudBackendPicker } = await import("./CloudBackendPicker");
const picker = (value: "box" | "vps" = "box") => renderToStaticMarkup(createElement(CloudBackendPicker, { value, onChange: () => {} }));

describe("CloudBackendPicker", () => {
  afterEach(() => { fixture.config = null; });

  it("offers Boat or a self-hosted VPS on a desktop or self-hosted server", () => {
    fixture.config = { cloudHome: false };
    expect(picker()).toContain("Self-hosted VPS");
  });

  it("uses the shared pressed-button choice for the two providers", () => {
    fixture.config = { cloudHome: false };
    const markup = picker("vps");
    expect(markup).toContain('role="group"');
    expect(markup).toContain('aria-label="Cloud backend"');
    expect(markup.match(/data-cloud-backend="/g)).toHaveLength(2);
    expect(markup).toMatch(/data-cloud-backend="vps" aria-pressed="true"[^>]*>Self-hosted VPS/);
    expect(markup).toMatch(/data-cloud-backend="box" aria-pressed="false"[^>]*>Boat/);
    expect(markup).not.toContain('role="tab"');
  });

  it("names the compact picker's tabs by provider", () => {
    fixture.config = { cloudHome: false };
    const markup = renderToStaticMarkup(createElement(CloudBackendPicker, { value: "box", compact: true, onChange: () => {} }));
    expect(markup).toContain('aria-label="Cloud provider"');
  });

  it("is hidden on My Cloud", () => {
    fixture.config = { cloudHome: true };
    expect(picker()).toBe("");
  });

  it.each(["box", "vps"] as const)("offers both backends whichever is chosen (%s)", (value) => {
    const markup = picker(value);
    expect(markup).toContain("Boat");
    expect(markup).toContain("Self-hosted VPS");
    expect(markup).not.toMatch(/<button[^>]*\sdisabled(?:=|\s|>)/);
    expect(markup).not.toMatch(/ACP model provider/);
  });

  it("leaves no message that tells someone to switch backends for an engine", () => {
    expect(Object.keys(en)).not.toContain("computer.err.vpsEngine");
    expect(Object.values(en).filter((value) => /switch the cloud backend to Boat/i.test(value))).toEqual([]);
  });
});
