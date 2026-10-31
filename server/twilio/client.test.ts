import { describe, expect, it } from "vitest";

import { createTwilioClient, describeTwilioError, TwilioError } from "./client.ts";

const SID = "AC00000000000000000000000000000001";
const CREDENTIALS = { accountSid: SID, authToken: "super-secret-token" };

const answer = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("the Twilio client", () => {
  it("validates an account and reports its friendly name", async () => {
    const seen: Array<{ url: string; authorization: string | null }> = [];
    const client = createTwilioClient(CREDENTIALS, {
      apiBase: "https://twilio.test",
      fetch: async (input, init) => {
        seen.push({ url: String(input), authorization: new Headers(init?.headers).get("authorization") });
        return answer(200, { sid: SID, friendly_name: "Acme Texts", status: "active" });
      },
    });
    await expect(client.validate()).resolves.toEqual({ sid: SID, name: "Acme Texts", status: "active" });
    expect(seen[0]!.url).toBe(`https://twilio.test/2010-04-01/Accounts/${SID}.json`);
    expect(seen[0]!.authorization).toBe(`Basic ${Buffer.from(`${SID}:super-secret-token`).toString("base64")}`);
  });

  it("says a wrong SID or token is wrong, without repeating either", async () => {
    const client = createTwilioClient(CREDENTIALS, {
      apiBase: "https://twilio.test",
      fetch: async () => answer(401, { code: 20003, message: "Authenticate", status: 401 }),
    });
    const error = await client.validate().catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(TwilioError);
    expect(describeTwilioError(error)).toBe("Twilio refused the SID and auth token");
    expect(describeTwilioError(error)).not.toContain("super-secret-token");
  });

  it("sends a form-encoded message and reads the SID back", async () => {
    let form: URLSearchParams | null = null;
    const client = createTwilioClient(CREDENTIALS, {
      apiBase: "https://twilio.test",
      fetch: async (input, init) => {
        if (!String(input).endsWith("/Messages.json") || init?.method !== "POST") return answer(500, { message: "unexpected request" });
        form = new URLSearchParams(String(init?.body));
        return answer(201, { sid: "SM123", status: "queued", num_segments: "2" });
      },
    });
    await expect(client.send({ from: "+14155550123", to: "+14155550124", body: "Hello" }))
      .resolves.toEqual({ sid: "SM123", status: "queued", numSegments: 2 });
    expect(form).not.toBeNull();
    expect(Object.fromEntries(form!)).toEqual({ From: "+14155550123", To: "+14155550124", Body: "Hello" });
  });

  it("keeps Twilio's own words for a refused send", async () => {
    const client = createTwilioClient(CREDENTIALS, {
      apiBase: "https://twilio.test",
      fetch: async () => answer(400, { code: 21608, message: "The number is unverified", status: 400 }),
    });
    const error = await client.send({ from: "+14155550123", to: "+14155550124", body: "Hi" }).catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(TwilioError);
    expect((error as TwilioError).code).toBe(21608);
    expect(describeTwilioError(error)).toBe("The number is unverified");
  });

  it("does not claim success when the answer is not a message", async () => {
    const client = createTwilioClient(CREDENTIALS, {
      apiBase: "https://twilio.test",
      fetch: async () => new Response("<html>oops</html>", { status: 200 }),
    });
    await expect(client.send({ from: "+14155550123", to: "+14155550124", body: "Hi" })).rejects.toThrow("did not look like one");
  });
});
