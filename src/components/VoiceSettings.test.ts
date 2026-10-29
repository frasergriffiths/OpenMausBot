// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Bot } from "@/state/store";

const fixture = vi.hoisted(() => ({
  api: vi.fn(),
  config: { tts: { configured: true, provider: "elevenlabs", voice: "" } } as Record<string, unknown>,
}));
vi.mock("@/state/store", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/state/store")>(),
  api: fixture.api,
  useStore: () => ({ state: { config: fixture.config }, dispatch: vi.fn() }),
}));

const { VoiceSettings } = await import("./VoiceSettings");

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const LIBRARY = { id: "lib-1", label: "Library Rachel", description: "irish", publicOwnerId: "owner2" };
const bot = (id: string): Bot => ({
  id, threadId: "t", name: id, title: "", description: "", color: "green",
  notifications: true, unread: false, messages: [], modelSelection: { instanceId: "codex", model: "m" },
});

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  document.documentElement.dataset.reducedMotion = "true";
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  fixture.api.mockReset();
});

function addLater() {
  let resolve!: (value: { voiceId: string }) => void;
  const added = new Promise<{ voiceId: string }>((done) => (resolve = done));
  fixture.api.mockImplementation((path: string) =>
    path === "/api/tts/voices/add" ? added : Promise.resolve({ voices: [LIBRARY] }));
  return resolve;
}

const render = (forBot: Bot, onPatch: (patch: Record<string, unknown>) => void) =>
  act(async () => root.render(createElement(VoiceSettings, { bot: forBot, onPatch })));
const trigger = () => host.querySelector<HTMLButtonElement>("[data-voice-picker]")!;

async function pickLibraryVoice() {
  await act(async () => trigger().click());
  const row = [...document.body.querySelectorAll<HTMLElement>('[role="option"]')].find((option) => option.textContent?.includes("Library Rachel"))!;
  await act(async () => row.click());
}

describe("VoiceSettings", () => {
  it("sets a library voice once ElevenLabs has added it, and says it is adding meanwhile", async () => {
    const resolve = addLater();
    const onPatch = vi.fn();
    await render(bot("pepper"), onPatch);
    await pickLibraryVoice();

    expect(fixture.api).toHaveBeenCalledWith("/api/tts/voices/add", expect.objectContaining({ method: "POST" }));
    expect(trigger().textContent).toContain("Adding…");
    await act(async () => resolve({ voiceId: "added-1" }));
    expect(onPatch).toHaveBeenCalledWith({ voice: "added-1" });
    expect(trigger().disabled).toBe(false);
  });

  it("drops an add that settles after the bot changed, so it never lands on the wrong bot", async () => {
    const resolve = addLater();
    const onPatch = vi.fn();
    await render(bot("pepper"), onPatch);
    await pickLibraryVoice();

    await render(bot("salt"), onPatch);
    expect(trigger().textContent).not.toContain("Adding…");
    await act(async () => resolve({ voiceId: "added-1" }));
    expect(onPatch).not.toHaveBeenCalled();
  });

  it("lists the five voice services as radio rows, with the Mac-only reason in the row", async () => {
    fixture.api.mockResolvedValue({ voices: [] });
    await render(bot("pepper"), vi.fn());
    const group = host.querySelector<HTMLElement>('[role="radiogroup"][aria-label="Voice provider"]')!;
    expect(group.className).toContain("flex-col");
    expect(group.className).toContain("divide-y");
    const rows = [...group.querySelectorAll<HTMLButtonElement>('[role="radio"]')];
    const title = (row: Element) => row.firstElementChild?.firstElementChild?.textContent;
    expect(rows.map(title)).toEqual(["ElevenLabs", "Fish Audio", "Grok (xAI)", "Built-in Mac voices", "Chatterbox (local)"]);
    for (const row of rows) {
      expect(row.getAttribute("aria-checked")).toMatch(/true|false/);
      expect(row.getAttribute("aria-pressed")).toBeNull();
      expect(row.className).toContain("px-0");
      expect(row.className).not.toContain("rounded-full");
    }
    expect(rows.filter((row) => row.getAttribute("aria-checked") === "true")).toHaveLength(1);
    const system = rows[3]!;
    expect(system.disabled).toBe(true);
    expect(system.textContent).toContain("Built-in voices are available only on macOS");
  });
});
