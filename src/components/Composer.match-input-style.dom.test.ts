// @vitest-environment happy-dom
// The mention mirror paints the composer's text while a transparent textarea carries the native caret. Every metric
// that decides where a glyph lands must be copied, in both interface modes, or the paint drifts from the caret.
import { createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Bot } from "@/state/store";
import { restoreComposerDraft } from "@/lib/drafts";

const fixture = vi.hoisted(() => ({
  advanced: false,
  bot: {
    id: "atlas", threadId: "atlas-thread", name: "Atlas", title: "", description: "",
    color: "purple", notifications: false, unread: false, busy: false, messages: [], approvalMode: "ask",
    modelSelection: { instanceId: "claude", model: "fake" },
  } as Bot,
}));

vi.mock("@/state/store", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/state/store")>();
  return { ...original, useStore: () => ({
    state: { ...original.initialState, bots: [fixture.bot] },
    dispatch: vi.fn(),
  }) };
});
vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));
vi.mock("@/lib/cloud-guest", async (importOriginal) => ({ ...await importOriginal<typeof import("@/lib/cloud-guest")>(), useReactor: () => "user" }));
vi.mock("@/lib/use-owner-or-admin", () => ({ useOwnerOrAdmin: () => true }));
vi.mock("./CallView", () => ({ CallButton: () => null }));
vi.mock("./GroupCallView", () => ({ GroupCallButton: () => null }));
import { Composer } from "./Composer";
import { GLYPH_METRICS } from "./MentionTextarea";

const bot = fixture.bot;

let root: Root;
let container: HTMLDivElement;
const render = () => flushSync(() => root.render(createElement(Composer, { bot })));

beforeEach(() => {
  fixture.advanced = false;
  restoreComposerDraft(`bot:${bot.id}:${bot.threadId}`, { text: "", attachments: [] });
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  flushSync(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const field = () => {
  const input = container.querySelector("textarea")!;
  const mirror = container.querySelector<HTMLElement>(".mention-editor-mirror")!;
  return { input, mirror };
};

const expectSameMetrics = () => {
  const { input, mirror } = field();
  for (const metric of GLYPH_METRICS) {
    expect(mirror.style.getPropertyValue(metric), metric).toBe(getComputedStyle(input).getPropertyValue(metric));
  }
};

/** React reads a textarea's value through its own tracker, so set it the way the platform does. */
const type = (input: HTMLTextAreaElement, value: string) => {
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(input, value);
  flushSync(() => input.dispatchEvent(new Event("input", { bubbles: true })));
};

describe("the composer's mirror metrics", () => {
  it("copies every glyph metric from the textarea in Simple mode", () => {
    render();
    expectSameMetrics();
    const { input, mirror } = field();
    input.style.fontFamily = "Georgia";
    input.style.letterSpacing = "0.7px";
    input.style.paddingLeft = "9px";
    type(input, "hello");
    expectSameMetrics();
    expect(mirror.style.getPropertyValue("letter-spacing")).toBe("0.7px");
    expect(mirror.style.getPropertyValue("padding-left")).toBe("9px");
  });

  it("copies them in Advanced mode too", () => {
    fixture.advanced = true;
    render();
    expectSameMetrics();
    const { input, mirror } = field();
    input.style.fontWeight = "600";
    type(input, "hello");
    expectSameMetrics();
    expect(mirror.style.getPropertyValue("font-weight")).toBe("600");
  });
});
