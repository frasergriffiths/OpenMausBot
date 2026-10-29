import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, describe, expect, it, vi } from "vitest";
import type { Bot, InstanceInfo } from "@/state/store";
import type { ApprovalModeSelector } from "./ApprovalModeSelector";
import type { ModelPicker } from "./ModelPicker";
import { CODEX_USAGE_LIMIT_REACHED, CODEX_USAGE_URL } from "../../shared/codex-usage-limit";
import { failedTurnTool } from "../../shared/failed-turn";

const fixture = vi.hoisted(() => {
  vi.stubGlobal("window", {});
  vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {} });
  return { showThreads: true, threadsWanted: true, advanced: true, phone: false, menus: [] as { ariaLabel: string; items: { key: string; disabled?: boolean; heading?: string; active?: boolean }[] }[], dispatch: vi.fn(), canWrite: null as boolean | null, showToolCalls: false, platform: "other", localReasonCode: "cua-driver-unavailable", localMessage: "", model: null as ComponentProps<typeof ModelPicker> | null,
    approval: null as ComponentProps<typeof ApprovalModeSelector> | null };
});
vi.mock("@/state/store", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/state/store")>();
  return { ...original, useStore: () => ({
    state: { ...original.initialState, config: fixture.showToolCalls ? { features: { showToolCalls: true } } : null,
      instances: [{ instanceId: "test", driverKind: "codex", displayName: "Test", models: { options: [] } } as unknown as InstanceInfo] },
    dispatch: fixture.dispatch,
  }) };
});
// The real useCaptionChrome rides along: it only asks this module for the window chrome.
vi.mock("./DesktopCapabilities", async (importOriginal) => ({
  ...await importOriginal<typeof import("./DesktopCapabilities")>(),
  useDesktopCapabilities: () => ({ capabilities: { dictation: { available: false }, host: { packaged: true, platform: fixture.platform }, localComputer: { available: false, reasonCode: fixture.localReasonCode, message: fixture.localMessage } }, ready: true }),
}));
vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));
vi.mock("@/lib/thread-preferences", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/thread-preferences")>(),
  useShowThreads: () => fixture.showThreads,
  useShowThreadsChoice: () => fixture.threadsWanted,
}));
// Only the phone breakpoint varies here; every other query answers as it does without a matchMedia.
vi.mock("@/lib/use-media-query", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/use-media-query")>(),
  useMediaQuery: (query: string) => (query === "(max-width: 767.98px)" ? fixture.phone : false),
}));
// The trigger still renders, so the markup assertions in this file see the same header.
vi.mock("./SidebarPopoverMenu", async (importOriginal) => ({
  ...await importOriginal<typeof import("./SidebarPopoverMenu")>(),
  SidebarPopoverMenu: (props: { ariaLabel: string; items: never[]; renderTrigger: (state: { open: boolean }) => unknown }) => {
    fixture.menus.push({ ariaLabel: props.ariaLabel, items: props.items });
    return props.renderTrigger({ open: false });
  },
}));
vi.mock("@/lib/cloud-guest", () => ({ useCanWriteIn: () => fixture.canWrite, useReactor: () => "user" }));
vi.mock("./ModelPicker", () => ({ ModelPicker: (props: ComponentProps<typeof ModelPicker>) => {
  fixture.model = props;
  return createElement("span", { "data-test-model-control": true });
} }));
vi.mock("./ApprovalModeSelector", () => ({ ApprovalModeSelector: (props: ComponentProps<typeof ApprovalModeSelector>) => {
  fixture.approval = props;
  return createElement("span", { "data-test-approval-control": true });
} }));

const { ChatView, ErrorRow, FailedTurnRow, claudeUpdateTarget } = await import("./ChatView");
const { NewConversationInstead } = await import("./NewConversationInstead");
const { activityPreview } = await import("@/lib/failed-turn");
afterAll(() => vi.unstubAllGlobals());

const bot: Bot = {
  id: "bot", threadId: "selected", name: "Pepper", title: "", description: "", color: "green",
  notifications: true, unread: false, busy: true, messages: [],
  modelSelection: { instanceId: "test", model: "profile-default" },
  tasks: [{ threadId: "selected", title: "Selected", createdAt: 1, busy: false, activity: "idle",
    modelSelection: { instanceId: "test", model: "thread-model" }, approvalMode: "ask" }],
};

describe("the header's right side", () => {
  const header = (of: Bot = bot) => {
    fixture.menus = [];
    fixture.model = null;
    const markup = renderToStaticMarkup(createElement(ChatView, { bot: of }));
    return { markup, controls: markup.slice(markup.indexOf("data-chathead-controls"), markup.indexOf("role=\"log\"")) };
  };

  it("keeps the model picker in view in Simple mode, leaving the computer to the bot panel", () => {
    fixture.advanced = false;
    try {
      const { markup, controls } = header();
      expect(controls).toContain("data-test-model-control");
      expect(fixture.model).toMatchObject({ threadId: "selected" });
      expect(controls).not.toContain('data-tour="computer"');
      expect(markup).not.toContain('data-testid="chat-more"');
      expect(fixture.menus.find((menu) => menu.ariaLabel === "More")).toBeUndefined();
      expect(markup).toContain("data-chathead-pill");
    } finally {
      fixture.advanced = true;
    }
  });


  it("moves Stop out of the Simple header into the composer's round button while a turn runs", () => {
    fixture.advanced = false;
    try {
      const busy = { ...bot, busy: true, tasks: (bot.tasks ?? []).map((task) => ({ ...task, busy: true })) };
      const { markup, controls } = header(busy);
      expect(controls).not.toContain("Stop this turn");
      const stop = markup.match(/<button[^>]*data-composer-stop="slot"[^>]*>/)?.[0] ?? "";
      expect(stop).toContain('aria-label="Stop this turn"');
      expect(markup).not.toContain('data-call-button="composer"');
      expect(header({ ...busy, waitingForTeammates: true, busy: false, tasks: (bot.tasks ?? []).map((task) => ({ ...task, busy: false, waitingForTeammates: true })) }).markup)
        .toContain('data-composer-stop="slot"');
    } finally {
      fixture.advanced = true;
    }
  });


});

describe("the Simple header", () => {

  it("opens the bot panel from the pill", () => {
    fixture.advanced = false;
    fixture.dispatch.mockClear();
    try {
      const markup = renderToStaticMarkup(createElement(ChatView, { bot }));
      expect(markup).toMatch(/<button[^>]*data-chathead-pill="true"[^>]*aria-label="Open Pepper&#x27;s profile"/);
    } finally {
      fixture.advanced = true;
    }
  });
});

describe("header name", () => {
  it("renames only from the bot's settings in Simple mode: no pencil, and the whole pill opens them", () => {
    fixture.advanced = false;
    const markup = renderToStaticMarkup(createElement(ChatView, { bot }));
    expect(markup).not.toContain('aria-label="Rename Pepper"');
    const pill = markup.match(/<button[^>]*data-chathead-pill="true"[^>]*>([\s\S]*?)<\/button>/);
    expect(pill?.[0]).toContain('aria-label="Open Pepper&#x27;s profile"');
    expect(pill?.[1]).toContain(">Pepper</span>");
    expect(pill?.[0]).toContain("rounded-full");
    fixture.advanced = true;
  });


  it("leaves the bot's role to the bot panel", () => {
    expect(renderToStaticMarkup(createElement(ChatView, { bot: { ...bot, title: " Research " } }))).not.toContain("data-chathead-role");
  });


  it("draws no working dots in the header pill, keeping one width, while a status still tells a screen reader", () => {
    {
      const busyMarkup = renderToStaticMarkup(createElement(ChatView, { bot: { ...bot, busy: true, tasks: (bot.tasks ?? []).map((task) => ({ ...task, busy: true })) } }));
      const idleMarkup = renderToStaticMarkup(createElement(ChatView, { bot: { ...bot, busy: false } }));
      const pillOf = (markup: string) => {
        const start = markup.indexOf("data-chathead-pill");
        return markup.slice(start, markup.indexOf("data-chathead-status", start));
      };
      expect(pillOf(busyMarkup)).not.toContain("animate-status-pulse");
      expect(pillOf(busyMarkup)).toBe(pillOf(idleMarkup));
      expect(busyMarkup).toMatch(/<span role="status" class="sr-only" data-chathead-status="true">Working…<\/span>/);
      expect(idleMarkup).toMatch(/<span role="status" class="sr-only" data-chathead-status="true"><\/span>/);
    }
  });


  it("centres the bot in the header's middle column, with the controls in the last", () => {
    const markup = renderToStaticMarkup(createElement(ChatView, { bot }));
    const row = markup.match(/data-chathead-row="true" class="([^"]*)"/)?.[1] ?? "";
    expect(row).toContain("@min-[30rem]/chathead:grid-cols-[minmax(0,1fr)_minmax(0,auto)_minmax(max-content,1fr)]");
    expect(markup).toMatch(/data-chathead-identity="true" class="[^"]*@min-\[30rem\]\/chathead:col-start-2[^"]*justify-self-center/);
    expect(markup).toMatch(/data-chathead-controls="true" class="[^"]*@min-\[30rem\]\/chathead:col-start-3/);
  });
});

describe("glass header", () => {
  it("floats the header over the transcript, which starts below it and scrolls on underneath", () => {
    const markup = renderToStaticMarkup(createElement(ChatView, { bot }));
    const frame = markup.indexOf("data-glass-frame");
    const header = markup.indexOf('data-glass-bar="top"');
    const name = markup.indexOf("data-chathead-row");
    const scroller = markup.indexOf('class="glass-scroller ');
    expect(frame).toBeGreaterThan(-1);
    expect(frame).toBeLessThan(header);
    expect(header).toBeLessThan(name);
    expect(name).toBeLessThan(scroller);
    expect(markup.slice(frame, header)).toContain("[--glass-tint:var(--color-app)]");
    expect(markup.slice(scroller)).toMatch(/class="glass-scroller-content[^"]*"[^>]*role="log"/);
  });

  it("fades the glass header over the transcript now that no title-bar switcher sits in it", () => {
    const bar = (markup: string) => markup.match(/<div data-glass-bar="top"[^>]*>/)?.[0] ?? "";
    const markup = renderToStaticMarkup(createElement(ChatView, { bot }));
    expect(bar(markup)).toContain('data-glass-fade=""');
    expect(bar(markup)).not.toContain("before:hidden");
    expect(markup).toMatch(/class="glass-scroller [^"]*" style="scroll-padding-bottom:calc\(/);
  });

  it("holds every row's positioned parts inside the transcript, so nothing in it can make the window scroll", () => {
    // An absolutely positioned reply label with no positioned ancestor in the scroller is placed past
    // the window, which then scrolls by script: an app frame's scrollIntoView lifts the whole app off the top.
    const markup = renderToStaticMarkup(createElement(ChatView, { bot }));
    const transcript = markup.match(/class="(glass-scroller-content[^"]*)"[^>]*role="log"/)?.[1] ?? "";
    expect(transcript.split(" ")).toContain("relative");
  });
});

describe("thread control placement", () => {
  it("leaves All threads out of the header", () => {
    const markup = renderToStaticMarkup(createElement(ChatView, { bot }));
    expect(markup).not.toContain('aria-label="All threads"');
  });

  it.each([true, false])("calls from the composer beside dictation, not the header (advanced %s)", (advanced) => {
    fixture.advanced = advanced;
    const markup = renderToStaticMarkup(createElement(ChatView, { bot }));
    const header = markup.slice(markup.indexOf("data-chathead-controls"), markup.indexOf("data-composer-row"));
    expect(header).not.toContain("data-call-button");
    expect(markup).not.toContain('data-call-button="header"');
    const actions = markup.slice(markup.indexOf("data-composer-actions"));
    expect(actions).toContain('data-call-button="composer"');
    expect(markup.match(/data-call-button=/g)).toHaveLength(1);
    fixture.advanced = true;
  });


  it("keeps the composer inert until the deleted thread's replacement transcript arrives", () => {
    const markup = renderToStaticMarkup(createElement(ChatView, { bot: { ...bot, awaitingThreadSnapshot: true } }));
    expect(markup).toMatch(/<textarea[^>]*disabled=""[^>]*aria-busy="true"/);
    expect(markup).not.toContain("Finish group setup");
  });


  it("explains provider safety errors without offering an ineffective Retry", () => {
    const markup = renderToStaticMarkup(createElement(ErrorRow, { message: "Blocked by our safety systems", onRetry: () => {} }));
    expect(markup).toContain("Full access controls tool approvals, not provider safety checks");
    expect(markup).not.toContain("<button");
    expect(renderToStaticMarkup(createElement(ErrorRow, { message: "Network timeout", onRetry: () => {} }))).toContain("<button");
  });
  it("draws Retry and the next action on the 28px control step", () => {
    const retry = renderToStaticMarkup(createElement(ErrorRow, { message: "Network timeout", onRetry: () => {} }));
    const action = renderToStaticMarkup(createElement(ErrorRow, { message: "Network timeout", action: { label: "Open", onClick: () => {} } }));
    for (const markup of [retry, action]) {
      expect(markup).toContain('class="ui-button ui-button-md ');
      expect(markup).not.toContain("text-[13px]");
    }
  });
  it("directs ChatGPT plan limits to usage settings rather than repeatedly retrying", () => {
    const markup = renderToStaticMarkup(createElement(ErrorRow, { message: "ChatGPT plan usage limit reached (subscription_sharing_usage_limit_exceeded)", onRetry: () => {} }));
    expect(markup).toContain("Manage usage");
    expect(markup).toContain("https://chatgpt.com/settings/usage");
    expect(markup).not.toContain(">Retry<");
  });
  it("sends a Codex usage limit to the account's Codex usage page, not Retry", () => {
    const codex = { instanceId: "codex", driverKind: "codex", displayName: "Codex", snapshot: { state: "available", authenticated: true } } as unknown as InstanceInfo;
    const limit = `${CODEX_USAGE_LIMIT_REACHED} This is OpenAI's limit, not your MausBot plan. It resets at 5:23 PM (UTC).`;
    const markup = renderToStaticMarkup(createElement(FailedTurnRow, { tool: failedTurnTool(limit), engine: codex, onRetry: () => {} }));
    expect(markup).toContain(limit.replaceAll("'", "&#x27;"));
    expect(markup).toContain(`href="${CODEX_USAGE_URL}"`);
    expect(markup).toContain("Manage usage");
    expect(markup).not.toContain("<button");
  });
  it("opens a signed-out engine's failed turn with one sentence and the sign-in, the CLI's words under Details", () => {
    const claude = {
      instanceId: "claude", driverKind: "claudeAgent", displayName: "Claude",
      snapshot: { state: "available", authenticated: false },
      install: { command: { darwin: "x", linux: "x", win32: "x" }, signInCommand: "claude /login", server: { package: "@anthropic-ai/claude-code" } },
      authentication: { method: "paste-code" },
      models: { default: "sonnet", options: [] },
    } as InstanceInfo;
    const markup = renderToStaticMarkup(createElement(FailedTurnRow, { tool: { name: "error: Not logged in · Please run /login", ok: false, setup: true }, engine: claude, onRetry: () => {} }));
    expect(markup).toContain(">Claude isn&#x27;t signed in yet. Sign in below, then send your message again.</span>");
    expect(markup).toContain("Sign in to Claude</button>");
    expect(markup).toMatch(/<summary[^>]*>.*?<\/summary><p[^>]*>Not logged in · Please run \/login<\/p>/);
    expect(markup).not.toContain(">Retry<");
    const update = { name: "error: Claude Code 2.1.268 does not support this model", ok: false, setup: true, claudeUpdate: true };
    for (const engine of [claude, { ...claude, readOnly: true }]) {
      const row = renderToStaticMarkup(createElement(FailedTurnRow, { tool: update, engine }));
      expect(row).toContain(">Claude Code 2.1.268 does not support this model</span>");
      expect(row).not.toContain("isn&#x27;t signed in");
      expect(activityPreview(update, engine)).toBe("Claude Code 2.1.268 does not support this model");
    }
  });
  it("opens a failed turn with a technical cause on one plain line, the engine's words under Details", () => {
    const raw = 'API Error: 529 {"type":"error","error":{"type":"overloaded_error","message":"Overloaded"}}';
    const markup = renderToStaticMarkup(createElement(FailedTurnRow, { tool: { name: `error: ${raw}`, ok: false }, engine: undefined, onRetry: () => {} }));
    expect(markup).toContain(">The service is busy right now. Try again in a moment.</span>");
    expect(markup).toMatch(/<summary[^>]*>.*?<\/summary><p[^>]*>API Error: 529/);
    expect(markup).toContain(" Retry</button>");
    const plain = renderToStaticMarkup(createElement(FailedTurnRow, { tool: { name: "error: no activity for 10 minutes — the turn was stopped", ok: false }, engine: undefined }));
    expect(plain).toContain(">no activity for 10 minutes — the turn was stopped</span>");
    expect(plain).not.toContain(">Details</summary>");
  });
  it("offers to update Claude Code for a too-old install, or hands over the command", () => {
    const claude = { instanceId: "claude", driverKind: "claudeAgent", displayName: "Claude", snapshot: { state: "available", authenticated: true } } as InstanceInfo;
    const markup = renderToStaticMarkup(createElement(ErrorRow, {
      message: "API Error: 400 Claude Code 2.1.268 does not support this model; version 2.1.280 or newer is required.",
      onRetry: () => {},
      setupInstance: claude,
      claudeUpdateInstance: claude,
    }));
    expect(markup).toContain("Update Claude for me");
    expect(markup).toContain("I&#x27;ll do it myself");
    expect(markup).not.toContain(">Retry<");
  });
  it("updates only a local Claude Code engine from chat", () => {
    const claude = { instanceId: "claude", driverKind: "claudeAgent", displayName: "Claude" } as InstanceInfo;
    expect(claudeUpdateTarget(claude)).toBe(claude);
    expect(claudeUpdateTarget({ ...claude, readOnly: true })).toBeUndefined();
    expect(claudeUpdateTarget({ ...claude, driverKind: "codex" })).toBeUndefined();
    expect(claudeUpdateTarget(undefined)).toBeUndefined();
  });
  it("keeps Retry on the last failed turn after its digest, but never on an older turn", () => {
    const messages: Bot["messages"] = [
      { id: "ask", role: "user", kind: "text", at: 1, text: "Try the new model" },
      { id: "error", role: "bot", kind: "activity", at: 2, tool: { name: "error: outdated engine", ok: false } },
      { id: "digest", role: "bot", kind: "digest", at: 3, text: "no tool activity" },
    ];
    const render = () => renderToStaticMarkup(createElement(ChatView, { bot: { ...bot, busy: false, messages } }));
    expect(render()).toContain("Retry</button>");
    messages.push({ id: "next", role: "user", kind: "text", at: 4, text: "A different request" });
    expect(render()).not.toContain("Retry</button>");
  });
  it("keeps Retry on a failed turn after hanging up, when the call's record is the last row", () => {
    const messages: Bot["messages"] = [
      { id: "ask", role: "user", kind: "text", at: 1, text: "Try the new model", via: "call", callId: "c1" },
      { id: "error", role: "bot", kind: "activity", at: 2, tool: { name: "error: outdated engine", ok: false } },
      {
        id: "record", role: "bot", kind: "call", at: 3, text: "Call with Pepper · 0:42",
        call: { callId: "c1", botId: "bot", client: "ios", startedAt: 0, endedAt: 3, seconds: 42, endReason: "hung-up" },
      },
    ];
    const render = () => renderToStaticMarkup(createElement(ChatView, { bot: { ...bot, busy: false, messages } }));
    expect(render()).toContain("Retry</button>");
    expect(render()).toContain('data-testid="call-record"');
    messages.push({ id: "next", role: "user", kind: "text", at: 4, text: "A different request" });
    expect(render()).not.toContain("Retry</button>");
  });
  it.each([false, true])("keeps recovery visible and outside tool folds when tool calls are %s", (showToolCalls) => {
    fixture.showToolCalls = showToolCalls;
    const explanation = "Automatic recovery: Qwen could not start. Trying Backup · fixture-model once in this thread.";
    const messages: Bot["messages"] = [
      { id: "read", role: "bot", kind: "activity", at: 1, tool: { name: "Read", ok: true } },
      { id: "edit", role: "bot", kind: "activity", at: 2, tool: { name: "Edit", ok: true } },
      { id: "recovery", role: "bot", kind: "activity", at: 3, tool: { name: `recovery: ${explanation}`, ok: true } },
      { id: "bash", role: "bot", kind: "activity", at: 4, tool: { name: "Bash", ok: true } },
      { id: "write", role: "bot", kind: "activity", at: 5, tool: { name: "Write", ok: true } },
    ];
    try {
      const markup = renderToStaticMarkup(createElement(ChatView, { bot: { ...bot, busy: false, messages } }));
      expect(markup).toContain('data-mid="recovery"><div role="status"');
      expect(markup).toContain(explanation);
      expect(markup).not.toContain(`recovery: ${explanation}`);
      expect(markup.match(/Automatic recovery:/g)).toHaveLength(1);
      if (!showToolCalls) expect(markup).not.toContain('data-testid="tool-activity"');
    } finally {
      fixture.showToolCalls = false;
    }
  });

  it("offers one shared macOS recovery row only for a named CUA permission failure", () => {
    fixture.platform = "darwin";
    fixture.localMessage = "Screen Recording required";
    window.ogb = { platform: "darwin", permOpenSettings: vi.fn(), relaunch: vi.fn() } as unknown as NonNullable<Window["ogb"]>;
    const screen = renderToStaticMarkup(createElement(ErrorRow, {
      message: "OpenMausBot can't use this computer yet — embedded host failed: Screen Recording required. Relaunch OpenMausBot after granting any missing macOS permission.",
    }));
    expect(screen).toContain('data-mac-cua-actions=""');
    expect(screen).toContain("Open Screen Recording Settings");
    expect(screen).toContain("Open System Settings");
    expect(screen).not.toContain("Retry");
    expect(screen).not.toContain("Open Accessibility Settings");
    expect(screen).toContain(">Open System Settings<");
    fixture.localMessage = "Accessibility required";
    const accessibility = renderToStaticMarkup(createElement(ErrorRow, {
      message: "OpenMausBot can't use this computer yet — Accessibility required",
    }));
    expect(accessibility).toContain("Open Accessibility Settings");
    expect(accessibility).not.toContain("Open Screen Recording Settings");
    expect(renderToStaticMarkup(createElement(ErrorRow, { message: "Network timeout" }))).not.toContain('data-mac-cua-actions=""');
    fixture.localReasonCode = "remote-server";
    expect(renderToStaticMarkup(createElement(ErrorRow, { message: "OpenMausBot can't use this computer yet — Screen Recording required" }))).not.toContain('data-mac-cua-actions=""');
    fixture.localReasonCode = "cua-driver-unavailable";
    fixture.platform = "other";
    fixture.localMessage = "";
    delete window.ogb;
  });
  it.each([
    "شغّل الاختبارات\nThen run typecheck\nوبعدها ارفع الفرع",
    "שלום עולם\nThen run typecheck\nתודה רבה",
    `${"مرحبا\n".repeat(10)}Then run typecheck`,
  ])("applies per-line direction to the actual user text, including collapsed messages", (text) => {
    const markup = renderToStaticMarkup(createElement(ChatView, { bot: {
      ...bot,
      messages: [{ id: "mixed-script", role: "user", kind: "text", at: 1, text }],
    } }));
    // unicode-bidi does not inherit, so the class must sit on the node holding the prose.
    expect(markup).toMatch(/<div class="chat-text[^"]*"[^>]*>(?:شغّل|שלום|مرحبا)/);
    expect(markup).not.toMatch(/class="[^"]*chat-text[^"\n]*bg-bubble-user/);
  });

  it("wraps the header into a name line and a chip line when the column is narrow", () => {
    const markup = renderToStaticMarkup(createElement(ChatView, { bot: { ...bot, busy: false } }));
    expect(markup).toContain("@container/chathead");
    const row = /data-chathead-row="[^"]*" class="([^"]*)"/.exec(markup)!;
    expect(row[1].split(" ")).toContain("@max-[30rem]/chathead:flex-wrap");
    const identity = /data-chathead-identity="[^"]*" class="([^"]*)"/.exec(markup)!;
    expect(identity[1].split(" ")).toEqual(expect.arrayContaining(["min-w-0", "@max-[30rem]/chathead:basis-full"]));
    const controls = /data-chathead-controls="[^"]*" class="([^"]*)"/.exec(markup)!;
    expect(controls[1].split(" ")).toEqual(expect.arrayContaining(["shrink-0", "@max-[30rem]/chathead:ml-auto", "@max-[30rem]/chathead:flex-wrap"]));
  });




  it("keeps both controls hidden for remote clients", () => {
    window.ogb = { remoteClient: { active: true } } as NonNullable<Window["ogb"]>;
    const markup = renderToStaticMarkup(createElement(ChatView, { bot }));
    expect(markup).not.toContain("data-test-model-control");
    expect(markup).not.toContain("data-test-approval-control");
    delete window.ogb;
  });

});

describe("screen reader announcements", () => {
  it("keeps the transcript log out of live announcements", () => {
    const markup = renderToStaticMarkup(createElement(ChatView, { bot }));
    expect(markup).toMatch(/role="log" aria-live="off" aria-label="Conversation with Pepper"/);
  });

  it("does not make the working label a second live region", async () => {
    const { TurnPresence } = await import("./TurnPresence");
    const markup = renderToStaticMarkup(createElement(TurnPresence, { avatar: null, visible: true, label: "Running a command", since: 1 }));
    expect(markup).toContain("Running a command");
    expect(markup).not.toMatch(/thinking-shimmer[^"]*" aria-live/);
  });

  it("renders one visually hidden status line for finished replies", () => {
    const markup = renderToStaticMarkup(createElement(ChatView, { bot }));
    expect(markup.match(/data-testid="transcript-announcer"/g)).toHaveLength(1);
    expect(markup).toMatch(/<p role="status" aria-live="polite" aria-atomic="true" class="sr-only" data-testid="transcript-announcer">/);
  });
});

describe("a guest's composer on a Cloud home", () => {
  it("offers a new conversation in one click, with no dialog", () => {
    const onNew = vi.fn();
    const markup = renderToStaticMarkup(createElement(NewConversationInstead, { onNew }));
    expect(markup).toContain("You can only write in conversations you started on this Cloud.");
    expect(markup).toContain(">New conversation<");
    expect(markup).not.toContain("<textarea");
    const tree = NewConversationInstead({ onNew }) as { props: { children: Array<{ type: string; props: { onClick?: () => void } }> } };
    tree.props.children.find((child) => child.type === "button")!.props.onClick!();
    expect(onNew).toHaveBeenCalledOnce();
  });

  it("takes the composer's place only where the device may not write", () => {
    fixture.canWrite = false;
    const refused = renderToStaticMarkup(createElement(ChatView, { bot }));
    expect(refused).toContain('data-testid="cloud-guest-composer"');
    expect(refused).not.toContain("<textarea");
    fixture.canWrite = true;
    const allowed = renderToStaticMarkup(createElement(ChatView, { bot }));
    expect(allowed).not.toContain('data-testid="cloud-guest-composer"');
    expect(allowed).toContain("<textarea");
    fixture.canWrite = null;
  });
});

describe("the way back to the bot's own conversation", () => {
  const visiting: Bot = {
    ...bot, threadId: "side", mainThreadId: "main",
    tasks: [
      { threadId: "main", title: "Our chat", createdAt: 1, busy: false, activity: "idle" },
      { threadId: "side", title: "Routine report", createdAt: 2, busy: false, activity: "idle" },
    ],
  };
  const header = (shown: boolean, of: Bot) => {
    fixture.showThreads = shown;
    try { return renderToStaticMarkup(createElement(ChatView, { bot: of })); } finally { fixture.showThreads = true; }
  };


  it("never with threads shown, nor in the main thread itself", () => {
    expect(header(true, visiting)).not.toContain("data-chathead-back");
    expect(header(false, { ...visiting, threadId: "main" })).not.toContain("data-chathead-back");
    expect(header(false, { ...visiting, mainThreadId: "unknown" })).not.toContain("data-chathead-back");
  });
});
