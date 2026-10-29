// @vitest-environment happy-dom
import { createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Bot } from "@/state/store";
import { restoreComposerDraft } from "@/lib/drafts";

const fixture = vi.hoisted(() => ({ dispatch: vi.fn() }));
vi.mock("@/state/store", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/state/store")>();
  return { ...original, useStore: () => ({
    state: {
      ...original.initialState,
      bots: [bot],
      instances: [{ instanceId: "claude", driverKind: "claudeAgent", displayName: "Claude", capabilities: { agentsMcp: true } }],
    },
    dispatch: fixture.dispatch,
  }) };
});
vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));
vi.mock("@/lib/use-owner-or-admin", () => ({ useOwnerOrAdmin: () => false }));
vi.mock("./CallView", () => ({ CallButton: () => null }));

import { Composer } from "./Composer";

const bot: Bot = {
  id: "slash-bot", threadId: "slash-thread", name: "Atlas", title: "", description: "",
  color: "blue", notifications: false, unread: false, busy: false, messages: [],
  modelSelection: { instanceId: "claude", model: "fake" },
};
const draftId = `bot:${bot.id}:${bot.threadId}`;

describe("the composer as a combobox while the / picker is open", () => {
  let root: Root;
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
    vi.spyOn(HTMLElement.prototype, "scrollIntoView").mockImplementation(() => {});
    restoreComposerDraft(draftId, { text: "", attachments: [] });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    flushSync(() => root.render(createElement(Composer, { bot })));
  });
  afterEach(() => {
    flushSync(() => root.unmount());
    container.remove();
    restoreComposerDraft(draftId, { text: "", attachments: [] });
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  const input = () => container.querySelector("textarea")!;
  const type = (value: string) => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(input(), value);
    flushSync(() => input().dispatchEvent(new Event("input", { bubbles: true })));
    flushSync(() => input().dispatchEvent(new KeyboardEvent("keyup", { key: value.slice(-1), bubbles: true })));
  };

  it("reports the listbox, its id and the highlighted option, and moves it with ArrowDown", () => {
    type("/");
    expect(input().getAttribute("role")).toBe("combobox");
    expect(input().getAttribute("aria-haspopup")).toBe("listbox");
    expect(input().getAttribute("aria-expanded")).toBe("true");
    expect(input().getAttribute("aria-autocomplete")).toBe("list");
    expect(input().getAttribute("aria-controls")).toBe("composer-slash-menu");
    expect(input().getAttribute("aria-activedescendant")).toBe("composer-slash-option-0");
    expect(container.querySelector("#composer-slash-option-0")?.getAttribute("role")).toBe("option");

    flushSync(() => input().dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true })));
    expect(input().getAttribute("aria-activedescendant")).toBe("composer-slash-option-1");

    flushSync(() => input().dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })));
    expect(input().getAttribute("role")).toBeNull();
    expect(input().getAttribute("aria-controls")).toBeNull();
  });
});
