import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import { twilioSignature, verifyTwilioSignature } from "./signature.ts";

// Twilio's documented worked example: the URL, one field, and the auth token
// from their own docs, so this pins our recipe to theirs.
const TOKEN = "12345";
const URL_UNDER_TEST = "https://mycompany.com/myapp.php?foo=1&bar=2";
const PARAMS = { CallSid: "CA1234567890ABCDE", Caller: "+14158675310", Digits: "1234", From: "+14158675310", To: "+18005551212" };

describe("Twilio signatures", () => {
  it("signs the URL then every field in key order", () => {
    const expected = createHmac("sha1", TOKEN)
      .update(Buffer.from(URL_UNDER_TEST + "CallSidCA1234567890ABCDECaller+14158675310Digits1234From+14158675310To+18005551212", "utf8"))
      .digest("base64");
    expect(twilioSignature(TOKEN, URL_UNDER_TEST, PARAMS)).toBe(expected);
  });

  it("accepts the signature as sent, and rejects a changed field, URL or token", () => {
    const signature = twilioSignature(TOKEN, URL_UNDER_TEST, PARAMS);
    expect(verifyTwilioSignature({ authToken: TOKEN, url: URL_UNDER_TEST, params: PARAMS, signature })).toBe(true);
    expect(verifyTwilioSignature({ authToken: TOKEN, url: URL_UNDER_TEST, params: { ...PARAMS, Digits: "9999" }, signature })).toBe(false);
    expect(verifyTwilioSignature({ authToken: TOKEN, url: URL_UNDER_TEST + "&x=1", params: PARAMS, signature })).toBe(false);
    expect(verifyTwilioSignature({ authToken: "54321", url: URL_UNDER_TEST, params: PARAMS, signature })).toBe(false);
  });

  it("accepts the same signature hex-encoded, and nothing malformed", () => {
    const signature = twilioSignature(TOKEN, URL_UNDER_TEST, PARAMS);
    const hex = Buffer.from(signature, "base64").toString("hex");
    expect(verifyTwilioSignature({ authToken: TOKEN, url: URL_UNDER_TEST, params: PARAMS, signature: hex })).toBe(true);
    expect(verifyTwilioSignature({ authToken: TOKEN, url: URL_UNDER_TEST, params: PARAMS, signature: "" })).toBe(false);
    expect(verifyTwilioSignature({ authToken: TOKEN, url: URL_UNDER_TEST, params: PARAMS, signature: "zz" })).toBe(false);
    expect(verifyTwilioSignature({ authToken: TOKEN, url: URL_UNDER_TEST, params: PARAMS, signature: undefined })).toBe(false);
  });
});
