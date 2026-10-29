// @vitest-environment happy-dom
// Steer on an engine with no mid-turn steering: in a 1:1 chat Enter stops the running turn and sends the words
// as the next one. These mount the composer so the ordering, the single send and the queue fallback are real.
import { createElement, type ComponentProps } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Bot, Group, InstanceInfo } from "@/state/store";
import { setBusySendMode } from "@/lib/busy-send";
import { restoreComposerDraft } from "@/lib/drafts";
import type { ApprovalModeSelector } from "./ApprovalModeSelector";
import type { ModelPicker } from "./ModelPicker";

const fixture = vi.hoisted(() => ({
  dispatch: vi.fn(),
  instances: [] as unknown[],
}));
vi.mock("@/state/store", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/state/store")>();
  return {
    ...original,
    api: vi.fn(async () => ({})),
    useStore: () => ({
      state: { ...original.initialState, instances: fixture.instances },
      dispatch: fixture.dispatch,
    }),
  };
});
vi.mock("./DesktopCapabilities", async (importOriginal) => ({
  ...await importOriginal<typeof import("./DesktopCapabilities")>(),
  useDesktopCapabilities: () => ({ capabilities: { dictation: { available: false }, host: { packaged: true, platform: "other" }, localComputer: { available: false, reasonCode: "x", message: "" } }, ready: true }),
}));
vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));
vi.mock("@/lib/cloud-guest", () => ({ useCanWriteIn: () => null, useReactor: () => "user" }));
vi.mock("./ModelPicker", () => ({ ModelPicker: (_props: ComponentProps<typeof ModelPicker>) => createElement("span") }));
vi.mock("./ApprovalModeSelector", () => ({ ApprovalModeSelector: (_props: ComponentProps<typeof ApprovalModeSelector>) => createElement("span") }));
vi.mock("@/components/Avatar", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/components/Avatar")>(),
  MausAvatar: () => null,
}));

const { Composer, STEER_INTERRUPT_SETTLE_MS } = await import("./Composer");

const bot: Bot = {
  id: "bot", threadId: "selected", name: "Pepper", title: "", description: "", color: "green",
  notifications: true, unread: false, busy: false, messages: [],
  modelSelection: { instanceId: "test", model: "profile-default" },
  tasks: [{ threadId: "selected", title: "Selected", createdAt: 1, busy: false, activity: "idle",
    modelSelection: { instanceId: "test", model: "thread-model" }, approvalMode: "ask" }],
};

let host: HTMLDivElement;
let root: Root;
const render = (busy: boolean) => flushSync(() => root.render(createElement(Composer, {
  bot: { ...bot, busy, tasks: [{ ...bot.tasks![0]!, busy }] },
})));
const textarea = () => host.querySelector<HTMLTextAreaElement>("textarea")!;
const actions = () => fixture.dispatch.mock.calls.map(([action]) => action);
const interrupts = () => actions().filter((action) => action.type === "interrupt");
const sends = () => actions().filter((action) => action.type === "send");
const notices = () => actions().filter((action) => action.type === "notice");

function type(value: string) {
  const setValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
  flushSync(() => {
    setValue.call(textarea(), value);
    textarea().dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function press() {
  const event = new KeyboardEvent("keydown", { key: "Enter", keyCode: 13, bubbles: true, cancelable: true });
  flushSync(() => textarea().dispatchEvent(event));
  return event;
}

beforeEach(() => {
  fixture.dispatch.mockClear();
  // No queueing capability: this engine takes no words mid-turn, like every ACP engine.
  fixture.instances = [{ instanceId: "test", driverKind: "acp", displayName: "ACP", capabilities: {} } as unknown as InstanceInfo];
  restoreComposerDraft("bot:bot:selected", { text: "", attachments: [] });
  setBusySendMode("steer");
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  flushSync(() => root.unmount());
  host.remove();
  setBusySendMode("queue");
  vi.useRealTimers();
});

describe("Steer with an engine that cannot steer", () => {
  it("stops the turn first and sends the message only once it has ended", () => {
    render(true);
    type("one more thing");
    expect(press().defaultPrevented).toBe(true);

    expect(interrupts()).toHaveLength(1);
    expect(interrupts()[0]).toMatchObject({ botId: "bot", threadId: "selected" });
    expect(sends(), "nothing is sent into the turn being stopped").toHaveLength(0);

    render(false);
    expect(sends()).toHaveLength(1);
    expect(sends()[0]).toMatchObject({ type: "send", botId: "bot", threadId: "selected", text: "one more thing" });
  });

  it("sends once on a double Enter, never twice", () => {
    render(true);
    type("only once");
    press();
    press();
    render(false);
    expect(interrupts()).toHaveLength(1);
    expect(sends()).toHaveLength(1);
    expect(new Set(sends().map((action) => action.sendId)).size).toBe(1);
  });

  it("keeps a second message behind the words already waiting for the stop", () => {
    render(true);
    type("first words");
    press();
    type("second words");
    press();
    expect(sends(), "both wait for one interrupt").toHaveLength(0);
    render(false);
    expect(interrupts()).toHaveLength(1);
    expect(sends().map((action) => action.text)).toEqual(["first words", "second words"]);
  });

  it("queues the message and says so when the interrupt fails", () => {
    render(true);
    type("still send it");
    press();
    const failed = interrupts()[0];
    failed.onError();
    expect(sends()).toHaveLength(1);
    expect(sends()[0]).toMatchObject({ text: "still send it" });
    expect(notices()).toHaveLength(1);
    expect(notices()[0].notice.text).toBe("Still working — queued this message instead");
  });

  it("queues it and says so when the stopped turn never settles", () => {
    vi.useFakeTimers();
    render(true);
    type("after the wait");
    press();
    expect(sends()).toHaveLength(0);
    vi.advanceTimersByTime(STEER_INTERRUPT_SETTLE_MS);
    expect(sends()).toHaveLength(1);
    expect(notices()).toHaveLength(1);
  });

  it("says Enter stops the turn before it happens", () => {
    render(true);
    type("now");
    expect(textarea().placeholder).toBe("Pepper is working — Enter stops this turn and sends this message now");
    expect(host.querySelector('button[aria-label="Stop this turn and send"]')).not.toBeNull();
  });

  it("keeps queueing in a room", () => {
    const room = {
      id: "room", threadId: "room-thread", name: "Launch", memberIds: ["bot"],
      defaultResponder: { kind: "member", botId: "bot" }, bulletin: "", unread: false,
      createdAt: 1, messages: [], busyBotId: "bot",
    } as unknown as Group;
    restoreComposerDraft("group:room:room-thread", { text: "", attachments: [] });
    flushSync(() => root.render(createElement(Composer, {
      group: room,
      members: [{ ...bot, busy: true, modelSelection: { instanceId: "test", model: "m" } }],
    })));
    type("room words");
    press();
    expect(interrupts()).toHaveLength(0);
    expect(sends()).toHaveLength(0);
    expect(fixture.dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: "sendGroup", text: "room words" }));
  });
});
