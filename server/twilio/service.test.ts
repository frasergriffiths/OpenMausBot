import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { normalisePhone, splitSms } from "../../shared/twilio.ts";
import type { TwilioClient, TwilioSendResult } from "./client.ts";
import { SmsService } from "./service.ts";
import { twilioSignature } from "./signature.ts";

const SID = "AC00000000000000000000000000000001";
const FROM = "+14155550123";
const TO = "+14155550124";
const TOKEN = "the-auth-token";
const URL = "https://bots.example.com/twilio/sms";

const sent: Array<{ from: string; to: string; body: string }> = [];

const client = (): TwilioClient => ({
  validate: async () => ({ sid: SID, name: "Acme Texts", status: "active" }),
  send: async (message): Promise<TwilioSendResult> => {
    sent.push(message);
    return { sid: "SM" + String(sent.length), status: "queued", numSegments: 1 };
  },
});

type Deps = ConstructorParameters<typeof SmsService>[0];

const make = (dataDir: string, overrides: Partial<Deps> = {}) => new SmsService({
  dataDir,
  bots: () => [{ id: "bot-1", name: "MausBot" }, { id: "bot-2", name: "Scout" }],
  threadFor: (botId) => "thread-" + botId,
  startTurn: async () => ({ ok: true }),
  lastBotText: () => null,
  webhook: () => ({ url: URL, error: null }),
  client,
  ...overrides,
});

const signed = (params: Record<string, string>) => twilioSignature(TOKEN, URL, params);
const inbound = (overrides: Record<string, string> = {}) => {
  const params = { From: TO, To: FROM, Body: "Hello there", MessageSid: "SM1", ...overrides };
  return { urls: [URL], params, signature: signed(params) };
};

const connect = (sms: SmsService, botId = "bot-1") => sms.connect({ accountSid: SID, authToken: TOKEN, fromNumber: FROM, toNumber: TO, botId });

let dir = "";
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "omb-sms-")); sent.length = 0; });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

describe("the one SMS integration", () => {
  it("validates with Twilio, stores one record, and never hands the token back", async () => {
    const sms = make(dir);
    const saved = await connect(sms);
    expect(saved.status.connected).toBe(true);
    expect(saved.status.toNumber).toBe(TO);
    expect(saved.status.botName).toBe("MausBot");
    expect(JSON.stringify(saved.status)).not.toContain(TOKEN);
    expect(statSync(join(dir, "sms.json")).mode & 0o777).toBe(0o600);
  });

  it("replaces a second connection instead of adding one", async () => {
    const sms = make(dir);
    await connect(sms);
    await sms.connect({ accountSid: SID, authToken: "other", fromNumber: FROM, toNumber: "+14155550125", botId: "bot-2" });
    const stored = JSON.parse(readFileSync(join(dir, "sms.json"), "utf8"));
    expect(stored.accountSid).toBe(SID);
    expect(stored.toNumber).toBe("+14155550125");
    expect(stored.botId).toBe("bot-2");
  });

  it("refuses a second number unless the first is replaced, and refuses a local number", async () => {
    const sms = make(dir);
    await connect(sms);
    expect(() => sms.linkNumber("+14155550199")).toThrow(/already linked/);
    expect(sms.linkNumber("+14155550199", { replace: true }).toNumber).toBe("+14155550199");
    expect(() => sms.linkNumber("07555 123456")).toThrow(/international form/);
  });

  it("sends the first text exactly once", async () => {
    const sms = make(dir);
    await connect(sms);
    const first = await sms.sendFirstMessage();
    expect(first.sid).toBe("SM1");
    expect(sent).toHaveLength(1);
    await expect(sms.sendFirstMessage()).rejects.toThrow(/already been sent/);
    expect(sent).toHaveLength(1);
    expect(sms.status().firstMessageAt).not.toBeNull();
  });

  it("changes the bot without touching the numbers or the first-text state", async () => {
    const sms = make(dir);
    await connect(sms);
    await sms.sendFirstMessage();
    const moved = sms.designateBot("bot-2");
    expect(moved.botId).toBe("bot-2");
    expect(moved.firstMessageAt).not.toBeNull();
    expect(moved.toNumber).toBe(TO);
  });

  it("refuses to connect without a bot to answer", async () => {
    const sms = make(dir, { bots: () => [] });
    await expect(sms.connect({ accountSid: SID, authToken: TOKEN, fromNumber: FROM, toNumber: TO })).rejects.toThrow(/Create a bot first/);
  });

  it("disconnects to nothing, and can connect again from scratch", async () => {
    const sms = make(dir);
    await connect(sms);
    expect(sms.disconnect().connected).toBe(false);
    expect(sms.status().firstMessageAt).toBeNull();
    await connect(sms);
    expect(sms.status().firstMessageAt).toBeNull();
  });
});

describe("inbound texts", () => {
  it("starts a turn on the designated bot for the linked phone", async () => {
    const turns: Array<{ botId: string; text: string; threadId: string }> = [];
    const sms = make(dir, { startTurn: async (botId, text, options) => { turns.push({ botId, text, threadId: options.threadId }); } });
    await connect(sms);
    await expect(sms.inbound(inbound())).resolves.toEqual({ ok: true, answered: true });
    expect(turns).toEqual([{ botId: "bot-1", text: "Hello there", threadId: "thread-bot-1" }]);
  });

  it("refuses a bad signature, and any other number", async () => {
    const sms = make(dir);
    await connect(sms);
    await expect(sms.inbound({ ...inbound(), signature: "not-a-signature" })).resolves.toMatchObject({ ok: false, status: 403 });
    await expect(sms.inbound(inbound({ From: "+14155550199" }))).resolves.toMatchObject({ ok: false, status: 403 });
  });

  it("answers a replayed MessageSid once", async () => {
    const turns: string[] = [];
    const sms = make(dir, { startTurn: async (_botId, text) => { turns.push(text); } });
    await connect(sms);
    await sms.inbound(inbound());
    await expect(sms.inbound(inbound())).resolves.toMatchObject({ ok: true, duplicate: true });
    expect(turns).toHaveLength(1);
  });

  it("accepts a signature made for the address that arrived, too", async () => {
    const sms = make(dir);
    await connect(sms);
    const arrived = "http://127.0.0.1:8800/twilio/sms";
    const params = { From: TO, To: FROM, Body: "Hi", MessageSid: "SM9" };
    await expect(sms.inbound({ urls: [URL, arrived], params, signature: twilioSignature(TOKEN, arrived, params) })).resolves.toMatchObject({ ok: true });
  });
});

describe("outbound replies", () => {
  it("sends the bot's last text, only for the designated bot's thread, and only once", async () => {
    let text = "Hello from the bot";
    const sms = make(dir, { lastBotText: (threadId) => (threadId === "thread-bot-1" ? { id: "m1", text } : null) });
    await connect(sms);
    await sms.turnCompleted("thread-bot-2");
    expect(sent).toHaveLength(0);
    await sms.turnCompleted("thread-bot-1");
    expect(sent).toEqual([{ from: FROM, to: TO, body: "Hello from the bot" }]);
    await sms.turnCompleted("thread-bot-1");
    expect(sent).toHaveLength(1);
    text = "A second answer";
    await sms.turnCompleted("thread-bot-1");
    expect(sent).toHaveLength(1);
  });

  it("splits a long reply on paragraph boundaries and keeps the order", async () => {
    const paragraph = "x".repeat(1_200);
    const sms = make(dir, { lastBotText: () => ({ id: "m1", text: paragraph + "\n\n" + paragraph }) });
    await connect(sms);
    await sms.turnCompleted("thread-bot-1");
    expect(sent).toHaveLength(2);
    expect(sent[0]!.body).toBe(paragraph);
    expect(sent[1]!.body).toBe(paragraph);
  });

  it("does nothing while SMS is disconnected", async () => {
    const sms = make(dir, { lastBotText: () => ({ id: "m1", text: "Hi" }) });
    await sms.turnCompleted("thread-bot-1");
    expect(sent).toHaveLength(0);
  });
});

describe("phone helpers", () => {
  it("normalises the numbers this app accepts", () => {
    expect(normalisePhone("+1 (415) 555-0123")).toBe("+14155550123");
    expect(normalisePhone("0044 20 7946 0000")).toBe("+442079460000");
    expect(normalisePhone("07946 000000")).toBeNull();
    expect(normalisePhone("")).toBeNull();
  });

  it("splits long text without cutting words", () => {
    const parts = splitSms("word ".repeat(400));
    expect(parts.length).toBeGreaterThan(1);
    expect(parts.every((part) => part.length <= 1_530)).toBe(true);
  });
});
