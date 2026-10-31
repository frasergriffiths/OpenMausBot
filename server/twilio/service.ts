// The one Twilio integration: its credentials, its number, the phone it talks to
// and the bot that answers for it.
//
// Every rule the product promises lives here rather than in the screen: there is
// one record (see store.ts), inbound messages are accepted only from the linked
// phone with a valid Twilio signature, and only the designated bot's own thread
// is relayed back out. A second bot cannot send SMS because nothing asks it to.
import { normalisePhone, splitSms, TWILIO_SID, type SmsStatus } from "../../shared/twilio.ts";
import { createTwilioClient, describeTwilioError, type TwilioClient } from "./client.ts";
import { clearIntegration, hasSeen, publicIntegration, readIntegration, rememberSeen, writeIntegration, type StoredIntegration } from "./store.ts";
import { verifyTwilioSignature } from "./signature.ts";

export interface SmsBot {
  id: string;
  name: string;
}

export interface SmsServiceDeps {
  dataDir: string;
  now?: () => number;
  /** Built from stored credentials; injected so tests never reach the network. */
  client?: (credentials: { accountSid: string; authToken: string }) => TwilioClient;
  bots: () => ReadonlyArray<SmsBot>;
  /** The bot's own conversation: where its texts are read and answered. */
  threadFor: (botId: string) => string | null;
  /** The normal turn pipeline: the same one a typed message takes. */
  startTurn: (botId: string, text: string, options: { threadId: string }) => Promise<unknown>;
  /** The newest text the bot wrote on a thread, or null before it has. */
  lastBotText: (threadId: string) => { id: string; text: string } | null;
  /** Where Twilio should post inbound messages, and why it cannot be reached. */
  webhook: () => { url: string | null; error: string | null };
  log?: (line: string) => void;
}

export interface Inbound {
  /** Every URL Twilio could have signed: the advertised public one and the one that arrived. */
  urls: readonly string[];
  params: Readonly<Record<string, string>>;
  signature: unknown;
}

export type InboundResult =
  | { ok: true; duplicate?: boolean; answered: boolean }
  | { ok: false; status: 400 | 403 | 404 | 409; error: string };

export interface ConnectInput {
  accountSid: string;
  authToken: string;
  fromNumber: string;
  toNumber: string;
  botId?: string;
}

const MAX_SENT_IDS = 500;

export class SmsService {
  private readonly deps: SmsServiceDeps;
  /** Sends run one after another, so a split reply cannot arrive out of order. */
  private queue: Promise<unknown> = Promise.resolve();
  /** Message ids already relayed: a replayed turn completion must not send twice. */
  private readonly sent = new Set<string>();

  constructor(deps: SmsServiceDeps) {
    this.deps = deps;
  }

  private now(): number {
    return this.deps.now?.() ?? Date.now();
  }

  private read(): StoredIntegration | null {
    return readIntegration(this.deps.dataDir);
  }

  private save(value: StoredIntegration): StoredIntegration {
    writeIntegration(this.deps.dataDir, value);
    return value;
  }

  private build(credentials: { accountSid: string; authToken: string }): TwilioClient {
    const build = this.deps.client ?? ((given: { accountSid: string; authToken: string }) => createTwilioClient(given));
    return build(credentials);
  }

  private clientFor(value: StoredIntegration): TwilioClient {
    return this.build({ accountSid: value.accountSid, authToken: value.authToken });
  }

  private note(value: StoredIntegration, error: string | null): StoredIntegration {
    if (value.lastError === error) return value;
    return this.save({ ...value, lastError: error, updatedAt: this.now() });
  }

  status(): SmsStatus {
    const value = this.read();
    const reach = this.deps.webhook();
    const bot = value ? this.deps.bots().find((candidate) => candidate.id === value.botId) ?? null : null;
    return {
      connected: Boolean(value),
      accountSid: value?.accountSid ?? null,
      accountName: value?.accountName ?? null,
      fromNumber: value?.fromNumber ?? null,
      toNumber: value?.toNumber ?? null,
      botId: value?.botId ?? null,
      botName: bot?.name ?? null,
      webhookUrl: reach.url,
      webhookError: reach.error,
      linkedAt: value?.linkedAt ?? null,
      firstMessageAt: value?.firstMessageAt ?? null,
      lastError: value?.lastError ?? null,
      updatedAt: value?.updatedAt ?? null,
    };
  }

  /**
   * Validates the account with Twilio before anything is stored, then replaces
   * whatever was there: connecting a second account is a reconnect, never a
   * second integration.
   */
  async connect(input: ConnectInput): Promise<{ status: SmsStatus; warning?: string }> {
    const accountSid = input.accountSid.trim();
    const authToken = input.authToken.trim();
    const fromNumber = normalisePhone(input.fromNumber);
    const toNumber = normalisePhone(input.toNumber);
    if (!TWILIO_SID.test(accountSid)) throw Object.assign(new Error("A Twilio Account SID starts with AC and has 32 characters"), { status: 400 });
    if (!authToken) throw Object.assign(new Error("Paste the account's auth token"), { status: 400 });
    if (!fromNumber) throw Object.assign(new Error("The sending number must be in international form, such as +14155550123"), { status: 400 });
    if (!toNumber) throw Object.assign(new Error("Your phone number must be in international form, such as +14155550123"), { status: 400 });
    if (fromNumber === toNumber) throw Object.assign(new Error("The sending number and your phone must be different"), { status: 400 });
    const bots = this.deps.bots();
    const botId = input.botId?.trim() || bots.find((bot) => bot.name === "MausBot")?.id || bots[0]?.id;
    if (!botId) throw Object.assign(new Error("Create a bot first: SMS needs one bot to answer for the installation"), { status: 409 });
    if (!bots.some((bot) => bot.id === botId)) throw Object.assign(new Error("No bot with that id"), { status: 404 });

    const account = await this.build({ accountSid, authToken }).validate();
    if (account.status && account.status !== "active" && account.status !== "suspended") {
      throw Object.assign(new Error(`Twilio says this account is ${account.status}`), { status: 409 });
    }
    const previous = this.read();
    const at = this.now();
    this.save({
      version: 1,
      accountSid,
      accountName: account.name,
      authToken,
      fromNumber,
      toNumber,
      botId,
      linkedAt: previous?.toNumber === toNumber ? previous.linkedAt : at,
      updatedAt: at,
      // A reconnect keeps the fact that the first message was sent only while the
      // same phone is still linked; a different phone starts its own first message.
      firstMessageAt: previous?.toNumber === toNumber ? previous.firstMessageAt : null,
      lastError: null,
      seen: previous?.seen ?? [],
    });
    this.deps.log?.(`sms: connected ${accountSid} (${account.name}), ${fromNumber} → ${toNumber}`);
    const reach = this.deps.webhook();
    return {
      status: this.status(),
      ...(reach.url ? {} : { warning: `Inbound messages need Twilio's webhook pointed at this server; it is not reachable yet (${reach.error ?? "no public address"}).` }),
    };
  }

  /**
   * The one linked phone: replacing it is allowed, adding a second one is not,
   * because the record holds a number rather than a list.
   */
  linkNumber(toNumber: string, options: { replace?: boolean } = {}): SmsStatus {
    const value = this.read();
    if (!value) throw Object.assign(new Error("Connect Twilio first"), { status: 409 });
    const next = normalisePhone(toNumber);
    if (!next) throw Object.assign(new Error("Your phone number must be in international form, such as +14155550123"), { status: 400 });
    if (next === value.toNumber) return this.status();
    // One linked phone, always: a different one has to replace the current one.
    if (!options.replace) {
      throw Object.assign(new Error("A phone is already linked. Replace it to move this installation's SMS to a new number."), { status: 409 });
    }
    const at = this.now();
    this.save({ ...value, toNumber: next, linkedAt: at, updatedAt: at, firstMessageAt: null, lastError: null });
    return this.status();
  }

  /** Changing who answers keeps the credentials, the numbers and the history. */
  designateBot(botId: string): SmsStatus {
    const value = this.read();
    if (!value) throw Object.assign(new Error("Connect Twilio first"), { status: 409 });
    if (!this.deps.bots().some((bot) => bot.id === botId)) throw Object.assign(new Error("No bot with that id"), { status: 404 });
    const at = this.now();
    this.save({ ...value, botId, updatedAt: at });
    return this.status();
  }

  disconnect(): SmsStatus {
    clearIntegration(this.deps.dataDir);
    this.sent.clear();
    return this.status();
  }

  /**
   * The first text to the linked phone, once, after the person says so. Twilio
   * bills a real message and the recipient reads it as from a stranger's number,
   * so a second press is refused rather than merely ignored.
   */
  async sendFirstMessage(): Promise<{ status: SmsStatus; sid: string }> {
    const value = this.read();
    if (!value) throw Object.assign(new Error("Connect Twilio first"), { status: 409 });
    if (value.firstMessageAt) throw Object.assign(new Error("The first message has already been sent to this phone"), { status: 409 });
    const bot = this.deps.bots().find((candidate) => candidate.id === value.botId);
    const body = `Hi! This is ${bot?.name ?? "your bot"} on OpenMausBot. Reply here any time and I'll answer. To stop, disconnect SMS in Settings.`;
    try {
      const sent = await this.clientFor(value).send({ from: value.fromNumber, to: value.toNumber, body });
      const at = this.now();
      const saved = this.save({ ...value, firstMessageAt: at, updatedAt: at, lastError: null });
      this.deps.log?.(`sms: first message ${sent.sid} to ${saved.toNumber}`);
      return { status: this.status(), sid: sent.sid };
    } catch (error) {
      this.note(value, describeTwilioError(error));
      throw Object.assign(new Error(describeTwilioError(error)), { status: 502 });
    }
  }

  /**
   * Twilio posts an inbound message here. Accepted only from the linked phone,
   * and only with a signature made with this integration's auth token; a replayed
   * MessageSid is acknowledged without answering it twice.
   */
  async inbound(input: Inbound): Promise<InboundResult> {
    const value = this.read();
    if (!value) return { ok: false, status: 404, error: "SMS is not connected" };
    const signed = input.urls.some((url) => verifyTwilioSignature({ authToken: value.authToken, url, params: input.params, signature: input.signature }));
    if (!signed) {
      this.deps.log?.("sms: refused an inbound message with a bad signature");
      return { ok: false, status: 403, error: "Invalid Twilio signature" };
    }
    const from = normalisePhone(input.params.From);
    if (!from || from !== value.toNumber) {
      this.deps.log?.(`sms: refused a message from ${String(input.params.From ?? "an unknown number")}`);
      return { ok: false, status: 403, error: "This number is not the one linked to this installation" };
    }
    const sid = String(input.params.MessageSid ?? input.params.SmsSid ?? "").trim();
    if (!sid) return { ok: false, status: 400, error: "No message id" };
    if (hasSeen(value, sid)) return { ok: true, duplicate: true, answered: false };
    const body = String(input.params.Body ?? "").trim();
    this.save(rememberSeen(value, sid));
    if (!body) return { ok: true, answered: false };
    const bot = this.deps.bots().find((candidate) => candidate.id === value.botId);
    const threadId = bot ? this.deps.threadFor(bot.id) : null;
    if (!bot || !threadId) return { ok: false, status: 409, error: "The bot that answers SMS no longer exists" };
    try {
      await this.deps.startTurn(bot.id, body, { threadId });
      return { ok: true, answered: true };
    } catch (error) {
      this.note(value, describeTwilioError(error));
      return { ok: false, status: 409, error: "The bot could not start a turn" };
    }
  }

  /** Sends a body to the linked phone, one concatenated message at a time. */
  private send(value: StoredIntegration, body: string): Promise<void> {
    const run = async () => {
      for (const part of splitSms(body)) {
        try {
          await this.clientFor(value).send({ from: value.fromNumber, to: value.toNumber, body: part });
        } catch (error) {
          this.note(value, describeTwilioError(error));
          throw error;
        }
      }
      if (value.lastError) this.note(value, null);
    };
    const next = this.queue.then(run, run);
    this.queue = next.catch(() => undefined);
    return next;
  }

  /**
   * A turn on the designated bot's thread finished: text the answer to the
   * linked phone. Any other bot's turn is not this bot's to send.
   */
  async turnCompleted(threadId: string): Promise<void> {
    const value = this.read();
    if (!value) return;
    if (this.deps.threadFor(value.botId) !== threadId) return;
    const last = this.deps.lastBotText(threadId);
    if (!last || this.sent.has(last.id)) return;
    this.sent.add(last.id);
    if (this.sent.size > MAX_SENT_IDS) this.sent.delete(this.sent.values().next().value as string);
    await this.send(value, last.text);
  }

  /** The public face of the record, for a route that wants it without the status. */
  record() {
    return publicIntegration(this.read());
  }
}
