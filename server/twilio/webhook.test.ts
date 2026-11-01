import { mkdtempSync, rmSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { SmsService } from "./service.ts";
import { twilioSignature } from "./signature.ts";
import { SMS_WEBHOOK_PATH, createSmsWebhook } from "./webhook.ts";

const SID = "AC00000000000000000000000000000001";
const FROM = "+14155550123";
const TO = "+14155550124";
const TOKEN = "the-auth-token";
const PUBLIC = "https://bots.example.com";

interface Captured { status: number; body: string; contentType: string | undefined }

const response = () => {
  const captured: Captured = { status: 0, body: "", contentType: undefined };
  const res = {
    writeHead(status: number, headers?: Record<string, string>) { captured.status = status; captured.contentType = headers?.["content-type"]; return res; },
    end(body?: string) { captured.body = body ?? ""; return res; },
  };
  return { res: res as unknown as ServerResponse, captured };
};

const request = (method: string, headers: Record<string, string> = {}) => ({
  method,
  url: SMS_WEBHOOK_PATH,
  headers: { host: "127.0.0.1:8800", ...headers },
}) as unknown as IncomingMessage;

let dir = "";
let sms: SmsService;
let turns: string[] = [];

beforeEach(async () => {
  dir = mkdtempSync(join(tmpdir(), "omb-sms-hook-"));
  turns = [];
  sms = new SmsService({
    dataDir: dir,
    bots: () => [{ id: "bot-1", name: "MausBot" }],
    threadFor: () => "thread-1",
    startTurn: async (_botId, text) => { turns.push(text); },
    lastBotText: () => null,
    webhook: () => ({ url: PUBLIC + SMS_WEBHOOK_PATH, error: null, source: "environment" }),
    client: () => ({
      validate: async () => ({ sid: SID, name: "Acme", status: "active" }),
      send: async () => ({ sid: "SM1", status: "queued", numSegments: 1 }),
      setSmsWebhook: async () => ({ updated: true }),
    }),
  });
  await sms.connect({ accountSid: SID, authToken: TOKEN, fromNumber: FROM, toNumber: TO, botId: "bot-1" });
});

afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

const bodyText = () => new URLSearchParams({ From: TO, To: FROM, Body: "Hi from my phone", MessageSid: "SM1" }).toString();

describe("Twilio's callback", () => {
  it("acknowledges a signed message with empty TwiML and starts the bot", async () => {
    const params = { From: TO, To: FROM, Body: "Hi from my phone", MessageSid: "SM1" };
    const { res, captured } = response();
    const handled = await createSmsWebhook({ sms, publicBaseUrl: () => PUBLIC })(
      request("POST", { "x-twilio-signature": twilioSignature(TOKEN, PUBLIC + SMS_WEBHOOK_PATH, params) }),
      res,
      new URL(PUBLIC + SMS_WEBHOOK_PATH),
      async () => bodyText(),
    );
    expect(handled).toBe(true);
    expect(captured.status).toBe(200);
    expect(captured.contentType).toContain("text/xml");
    expect(captured.body).toContain("<Response></Response>");
    expect(turns).toEqual(["Hi from my phone"]);
  });

  it("refuses an unsigned callback without starting a turn", async () => {
    const { res, captured } = response();
    await createSmsWebhook({ sms, publicBaseUrl: () => PUBLIC })(
      request("POST", { "x-twilio-signature": "forged" }),
      res,
      new URL(PUBLIC + SMS_WEBHOOK_PATH),
      async () => bodyText(),
    );
    expect(captured.status).toBe(403);
    expect(turns).toHaveLength(0);
  });

  it("leaves other addresses to the automation receiver", async () => {
    const webhook = createSmsWebhook({ sms, publicBaseUrl: () => PUBLIC });
    const other = response();
    expect(await webhook(request("POST"), other.res, new URL(PUBLIC + "/hooks/wh_1"), async () => bodyText())).toBe(false);
  });

  it("refuses anything but POST", async () => {
    const webhook = createSmsWebhook({ sms, publicBaseUrl: () => PUBLIC });
    const get = response();
    await webhook(request("GET"), get.res, new URL(PUBLIC + SMS_WEBHOOK_PATH), async () => "");
    expect(get.captured.status).toBe(405);
  });
});
