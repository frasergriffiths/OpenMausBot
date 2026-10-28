// @vitest-environment happy-dom
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { Message } from "@/state/store";

const fixture = vi.hoisted(() => ({
  state: {} as Record<string, unknown>,
  dispatch: vi.fn(),
  api: vi.fn(async (..._args: unknown[]) => ({}) as unknown),
}));
vi.mock("@/state/store", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/state/store")>(),
  useStore: () => ({ state: fixture.state, dispatch: fixture.dispatch }),
  api: (...args: unknown[]) => fixture.api(...args),
}));
vi.mock("@/lib/thread-preferences", () => ({ useShowThreads: () => false }));

const { ApprovalCard } = await import("./ApprovalCard");

const now = Date.now();
const bot = { id: "bot-1", name: "Scout", hidden: false };
const routine = {
  id: "routine-1", name: "Morning brief", prompt: "Summarize the inbox and post the three priorities.", target: "bot", botId: "bot-1", runOn: "maus",
  enabled: true, schedule: { type: "daily", time: "09:00", weekdays: [1, 2, 3, 4, 5] }, durationMinutes: 30, nextRunAt: now + 3_600_000,
  createdAt: now, updatedAt: now,
};
const webhook = {
  id: "hook-1", endpointId: "wh_abc", name: "Interested replies", prompt: "Draft a follow-up for the lead.", botId: "bot-1", runOn: "maus",
  enabled: true, createdAt: now, updatedAt: now, deliveryCount: 0,
};
const base = { version: 1 as const, requestId: "request-1", botId: "bot-1", threadId: "thread-1", createdAt: now };
function card(extra: Partial<NonNullable<Message["card"]>>): Message {
  return {
    id: "card-1", role: "bot", kind: "options", at: now,
    card: { title: "Trigger", subtitle: "", options: [], answered: "allow", dismissed: true, autoApplied: true, requestId: "request-1", ...extra },
  };
}
const scheduleCard = card({ tool: "schedule_routine", routineRequest: { ...base, resultId: "routine-1", operation: { action: "create", routine: {
  name: "Morning brief", instructions: routine.prompt, schedule: { type: "daily", time: "09:00", weekdays: [1, 2, 3, 4, 5] }, runOn: "maus", durationMinutes: 30,
} }, undo: { name: "Morning brief" } } });
const webhookCard = card({ tool: "create_trigger", webhookRequest: { ...base, resultId: "hook-1", operation: { action: "create", webhook: { name: "Interested replies", instructions: webhook.prompt, runOn: "maus" } }, undo: { name: "Interested replies" } } });

const render = (message: Message) => renderToStaticMarkup(createElement(ApprovalCard, { bot: { name: "Scout" }, message, threadId: "thread-1" }));
describe("the chat card a bot-made automation leaves", () => {
  it("says what was set up and what happens next, with no management controls", () => {
    fixture.state = { bots: [bot], routines: [routine], webhooks: [], routineRuns: [], routinesLoadState: "ready", appTriggers: { triggers: [], loaded: true } };
    const html = render(scheduleCard);
    expect(html).toContain("data-trigger-card");
    expect(html).toContain("Scout");
    expect(html).not.toContain("<button");
    for (const gone of ["Pause", "Resume", "Edit", "Undo", "Copy address"]) expect(html).not.toContain(gone);
  });

  it("still renders the run status line read-only", () => {
    fixture.state = {
      bots: [bot], routines: [routine], webhooks: [], routinesLoadState: "ready", appTriggers: { triggers: [], loaded: true },
      routineRuns: [{ id: "run-1", routineId: "routine-1", routineName: "Morning brief", botId: "bot-1", status: "failed", scheduledFor: now - 60_000, startedAt: now - 60_000, finishedAt: now - 30_000, error: "boom", manual: false, target: "bot", runOn: "maus" }],
    };
    const html = render(scheduleCard);
    expect(html).toContain('data-automation-status=');
    expect(html).not.toContain("<button");
  });

  it("says when the automation no longer exists, without a way to bring it back", () => {
    fixture.state = { bots: [bot], routines: [], webhooks: [], routineRuns: [], routinesLoadState: "ready", appTriggers: { triggers: [], loaded: true } };
    const html = render(scheduleCard);
    expect(html).toContain("data-trigger-card");
    expect(html).toContain("Morning brief");
    expect(html).not.toContain("<button");
  });

  it("shows a webhook-made automation the same way, with no address or secret", () => {
    fixture.state = { bots: [bot], routines: [], webhooks: [webhook], routineRuns: [], routinesLoadState: "ready", appTriggers: { triggers: [], loaded: true } };
    const html = render(webhookCard);
    expect(html).toContain('data-trigger-card="hook-1"');
    expect(html).not.toContain("wh_abc");
    expect(html).not.toContain("<button");
  });
});
