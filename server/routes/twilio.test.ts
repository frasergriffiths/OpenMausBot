import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { json, readBody } from "../harness/http.ts";
import type { RequestAuth } from "../request-auth.ts";
import { SmsService } from "../twilio/service.ts";
import { createTwilioRoutes } from "./twilio.ts";
import { dispatchRoutes } from "./table.ts";

const SID = "AC00000000000000000000000000000001";
const servers: Server[] = [];
const dirs: string[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise((done) => server.close(done))));
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const AUTH: Record<string, RequestAuth> = {
  owner: { kind: "loopback", scopes: ["admin"] },
  stranger: { kind: "service", scopes: [] } as unknown as RequestAuth,
};

async function serve(who: keyof typeof AUTH = "owner"): Promise<{ base: string; sms: SmsService; sent: string[] }> {
  const dir = mkdtempSync(join(tmpdir(), "omb-sms-route-"));
  dirs.push(dir);
  const sent: string[] = [];
  const sms = new SmsService({
    dataDir: dir,
    bots: () => [{ id: "bot-1", name: "MausBot" }],
    threadFor: () => "thread-1",
    startTurn: async () => ({}),
    lastBotText: () => null,
    webhook: () => ({ url: "https://bots.example.com/twilio/sms", error: null, source: "environment" }),
    client: () => ({
      validate: async () => ({ sid: SID, name: "Acme Texts", status: "active" }),
      send: async (message) => { sent.push(message.body); return { sid: "SM1", status: "queued", numSegments: 1 }; },
      setSmsWebhook: async () => ({ updated: true }),
    }),
  });
  const routes = [createTwilioRoutes({ sms, webhookPort: 8800, bots: () => [{ id: "bot-1", name: "MausBot" }] })];
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    try {
      const handled = await dispatchRoutes(routes, {
        req, res, url, path: url.pathname, method: req.method ?? "GET",
        auth: AUTH[who]!, json, readBody,
      });
      if (!handled) json(res, 404, { from: "inline routes" });
    } catch (error) {
      json(res, 500, { error: String(error) });
    }
  });
  servers.push(server);
  await new Promise<void>((ready) => server.listen(0, "127.0.0.1", ready));
  return { base: "http://127.0.0.1:" + String((server.address() as AddressInfo).port), sms, sent };
}

describe("Settings → SMS routes", () => {
  it("connects through the one integration and never returns the auth token", async () => {
    const { base } = await serve();
    const connected = await fetch(base + "/api/twilio/connect", {
      method: "POST",
      body: JSON.stringify({ accountSid: SID, authToken: "secret-token", fromNumber: "+14155550123", toNumber: "+14155550124", botId: "bot-1" }),
    });
    expect(connected.status).toBe(200);
    const text = await connected.text();
    expect(text).not.toContain("secret-token");
    const read = await fetch(base + "/api/twilio").then((response) => response.json()) as { sms: { connected: boolean; toNumber: string }; bots: unknown[] };
    expect(read.sms.connected).toBe(true);
    expect(read.sms.toNumber).toBe("+14155550124");
    expect(read.bots).toHaveLength(1);
  });

  it("sends the first text only after an explicit confirmation", async () => {
    const { base, sent } = await serve();
    await fetch(base + "/api/twilio/connect", {
      method: "POST",
      body: JSON.stringify({ accountSid: SID, authToken: "secret-token", fromNumber: "+14155550123", toNumber: "+14155550124", botId: "bot-1" }),
    });
    const unconfirmed = await fetch(base + "/api/twilio/first-message", { method: "POST", body: JSON.stringify({}) });
    expect(unconfirmed.status).toBe(400);
    expect(sent).toHaveLength(0);
    const confirmed = await fetch(base + "/api/twilio/first-message", { method: "POST", body: JSON.stringify({ confirm: true }) });
    expect(confirmed.status).toBe(200);
    expect(sent).toHaveLength(1);
    const again = await fetch(base + "/api/twilio/first-message", { method: "POST", body: JSON.stringify({ confirm: true }) });
    expect(again.status).toBe(409);
    expect(sent).toHaveLength(1);
  });

  it("keeps everyone who is not the owner out", async () => {
    const { base } = await serve("stranger");
    expect((await fetch(base + "/api/twilio")).status).toBe(403);
    expect((await fetch(base + "/api/twilio/connect", { method: "POST", body: "{}" })).status).toBe(403);
  });

  it("disconnects to a clean state", async () => {
    const { base } = await serve();
    await fetch(base + "/api/twilio/connect", {
      method: "POST",
      body: JSON.stringify({ accountSid: SID, authToken: "secret-token", fromNumber: "+14155550123", toNumber: "+14155550124", botId: "bot-1" }),
    });
    const removed = await fetch(base + "/api/twilio", { method: "DELETE" }).then((response) => response.json()) as { sms: { connected: boolean } };
    expect(removed.sms.connected).toBe(false);
  });
});
