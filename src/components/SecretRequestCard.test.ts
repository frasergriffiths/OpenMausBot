import { Children, createElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Message } from "@/state/store";

const dispatch = vi.fn();
const fixture = vi.hoisted(() => ({ counting: false, values: [] as unknown[], index: 0, api: vi.fn() }));
vi.mock("react", async (original) => {
  const react = await original<typeof import("react")>();
  return {
    ...react,
    useState: (initial: unknown) => {
      if (!fixture.counting) return react.useState(initial);
      const index = fixture.index++;
      if (!(index in fixture.values)) fixture.values[index] = initial;
      return [fixture.values[index], (next: unknown) => { fixture.values[index] = next; }];
    },
  };
});
vi.mock("@/state/store", async (original) => ({
  ...await original<typeof import("@/state/store")>(),
  api: fixture.api,
  useStore: () => ({ dispatch }),
}));

import { SecretRequestCard } from "./SecretRequestCard";

const secretCard = (secret: Record<string, unknown>): Message => ({
  id: "secret-card",
  role: "bot",
  kind: "secret",
  at: 1,
  text: "Securely provide the ElevenLabs API key.",
  secret: {
    target: "ttsKey",
    label: "ElevenLabs API key",
    description: "Enables text-to-speech voices in calls.",
    placeholder: "Paste your ElevenLabs API key",
    helpUrl: "https://elevenlabs.io/app/settings/api-keys",
    requestKey: "request-key-1",
    ...secret,
  },
});

const view = (secret: Record<string, unknown>) => renderToStaticMarkup(createElement(SecretRequestCard, {
  botId: "bot-1",
  threadId: "thread-1",
  message: secretCard(secret),
}));

beforeEach(() => {
  vi.stubGlobal("window", {});
  dispatch.mockReset();
});

describe("SecretRequestCard superseded requests", () => {
  it("still offers entry while the newest request is pending", () => {
    const html = view({});
    expect(html).toContain("Save securely");
    expect(html).toContain("never added to chat.");
  });

  it("stops offering entry and names its replacement once superseded", () => {
    const html = view({ superseded: true });
    expect(html).toContain("Superseded");
    expect(html).toContain("replaced by a newer one for the same key");
    expect(html).toContain("Superseded by a newer request");
    expect(html).not.toContain("Save securely");
    expect(html).not.toContain("type=\"password\"");
    expect(html).not.toContain("Not now");
    expect(html).not.toContain("Waiting to resume safely");
  });
});

describe("SecretRequestCard ask card", () => {
  it("waits as a compact ask card with a masked field", () => {
    const html = view({});
    expect(html).toContain('data-ask-card="pending"');
    expect(html).toContain("text-accent-text");
    expect(html).toContain('type="password"');
    expect(html).toContain('autoComplete="new-password"');
  });

  it("folds into one line that names the key once it is saved and the bot resumed", () => {
    const html = view({ provided: true, resumed: true });
    expect(html).toContain('data-ask-card="settled"');
    expect(html).toContain("ElevenLabs API key saved securely");
    expect(html).toContain("Bot resumed without seeing the key");
    expect(html).not.toContain("<input");
    expect(html).not.toContain("<form");
  });

  it("keeps a retry on the line when resuming after the save failed", () => {
    const html = view({ provided: true, error: "The bot could not be resumed." });
    expect(html).toContain('data-ask-card="settled"');
    expect(html).toContain("Try again");
    expect(html).toContain("The bot could not be resumed.");
    expect(html).not.toContain('type="password"');
  });
});


