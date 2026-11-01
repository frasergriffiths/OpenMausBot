import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { Children, createElement, isValidElement, type EffectCallback, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CloudAccountState, CloudPlanSnapshot } from "../../electron/cloud-account.mjs";
import type { CloudOffer } from "../../electron/cloud-home.mjs";
import { withTourFinished } from "@/lib/guided-tour";
import { setLocale } from "@/lib/i18n";
import { EMPTY_ONBOARDING, LOCAL_VIEWER, markWelcomeFinished, type WelcomeViewer } from "@/lib/onboarding";
import { launchDialogShown, markLaunchDialog } from "@/lib/launch-dialogs";
import { } from "@/lib/cloud-intent";
import { createDesktopPrefs, registerDesktopPrefs } from "../../electron/desktop-prefs.mjs";
import { createUpdatesConsent, registerUpdatesConsent } from "../../electron/updates-consent.mjs";

const f = vi.hoisted(() => ({ values: [] as unknown[], index: 0, effects: [] as EffectCallback[], state: {} as any, updater: null as any, dispatch: null as any, brand: "default",
  viewerEmail: undefined as string | null | undefined }));
vi.mock("react", async original => ({ ...await original<typeof import("react")>(),
  useState: (initial: unknown) => { const index = f.index++; if (!(index in f.values)) f.values[index] = typeof initial === "function" ? initial() : initial;
    return [f.values[index], (next: unknown) => { f.values[index] = typeof next === "function" ? (next as (value: unknown) => unknown)(f.values[index]) : next; }]; },
  useEffect: (effect: EffectCallback) => { f.effects.push(effect); },
  // The cards are called as plain functions here, so React's dispatcher is absent: give the hooks they use real storage.
  useRef: (initial: unknown) => ({ current: initial }),
  useSyncExternalStore: (_subscribe: unknown, snapshot: () => unknown) => snapshot(),
}));
vi.mock("@/state/store", () => ({ useStore: () => ({ state: f.state, dispatch: f.dispatch }), api: vi.fn().mockResolvedValue({}),
  CLOUD_LINK_SETTINGS: { type: "toggleAppSettings", open: true, section: "cloudAccount", cloudLink: true } }));
vi.mock("@/lib/welcome-record", () => ({ emailGateDone: () => false }));
vi.mock("@/lib/updater", () => ({ useUpdaterState: () => f.updater }));
// Who MausBot belongs to: unknown (as before the session answers) unless a test says otherwise.
vi.mock("@/lib/default-bot", async original => ({ ...await original<typeof import("@/lib/default-bot")>(), useViewerEmail: () => f.viewerEmail }));
vi.mock("@/lib/brand", () => ({ brandStatus: () => ({ brand: { name: "OpenMausBot" }, source: f.brand, file: "" }) }));
vi.mock("@/components/EngineLibrary", () => ({ engineReady: (instance: { snapshot: { state: string; authenticated?: boolean } }) =>
  instance.snapshot.state === "available" && instance.snapshot.authenticated !== false }));
import { AppNotices } from "./AppNotices";
import { CLOUD_PRO_UPDATE_NOTICE, CLOUD_INTRO, STAR_NOTICE } from "@/lib/notices";
import { api } from "@/state/store";

const NOW = new Date(2026, 9, 9, 12).getTime();
const plans = [
  { tier: "starter", label: "Starter", amount: 1500, trialDays: 7 },
  { tier: "pro", label: "Pro", amount: 4900, trialDays: 7 },
  { tier: "max", label: "Max", amount: 9900, trialDays: 7 },
];
const TRIAL_OFFER: CloudOffer = { plans, recommended: "pro", creditUsd: 5, refundDays: 14 };
const PLAIN_OFFER: CloudOffer = { plans: plans.map(({ trialDays: _days, ...plan }) => plan), recommended: "pro", refundDays: 14 };
const STAR = "Enjoying OpenMausBot?";
const signedOut: CloudAccountState = { status: "signed-out" };
const free: CloudAccountState = { status: "connected", account: { id: "a", email: "person@example.test" }, entitlement: { plan: "free", status: "inactive", expiresAt: null, version: 1 } };

let storage: Map<string, string>;
let account: CloudAccountState;
let snapshot: CloudPlanSnapshot | Error;
let offer: CloudOffer | null;
let viewer: WelcomeViewer | null;
let bridges: { cloud: Record<string, ReturnType<typeof vi.fn>>; plan: Record<string, ReturnType<typeof vi.fn>> };
let accountListeners: Set<(next: CloudAccountState) => void>;
let now: number;

/** A plain document stand-in: cards that watch page visibility still need the listener pair. */
const fakeDocument = (extra: Record<string, unknown> = {}) => ({
  activeElement: null as unknown, body: null as unknown,
  getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
  addEventListener: () => {}, removeEventListener: () => {}, visibilityState: "visible",
  ...extra,
});

const PRELOAD = readFileSync(join(process.cwd(), "electron", "preload.cjs"), "utf8").replace(/\r\n/g, "\n");
const LOCAL_ORIGIN = "http://127.0.0.1:8799", MY_CLOUD = "https://omb-u-1.fly.dev", VPS = "https://bots.example.test";
type Page = "local" | "cloud" | "server";
type Handler = (event: { page: Page; returnValue?: unknown }, ...args: unknown[]) => unknown;
interface Desktop {
  handlers: Map<string, Handler>; listeners: Map<string, Handler>; saved: { seen?: string[] } | null; offered: boolean;
  /** This computer's own workspace config.json, as main reads it. */
  config: unknown;
}
let desk: Desktop;

// Main's own record for this one desktop, behind its real IPC.
function desktopMachine(): Desktop {
  const machine: Desktop = { handlers: new Map(), listeners: new Map(), saved: null, offered: true,
    config: { onboarding: { completedAt: "2026-09-01", version: 1, hintsSeen: [] } } };
  registerDesktopPrefs({
    ipcMain: { handle: (channel, handler) => void machine.handlers.set(channel, handler as Handler), on: (channel, listener) => void machine.listeners.set(channel, listener as Handler) },
    read: () => machine.saved, write: value => { machine.saved = JSON.parse(JSON.stringify(value)); }, page: event => (event as { page: Page }).page,
    cloudOffered: async () => machine.offered, localConfig: () => machine.config, now: () => now,
  });
  return machine;
}

// The real preload, as this desktop's window loads it for a page; the Cloud account and plan answer from this file's fakes.
function windowOn(origin: string, { click = true } = {}) {
  const page: Page = origin === LOCAL_ORIGIN ? "local" : origin === MY_CLOUD ? "cloud" : "server";
  let ogb: Record<string, unknown> = {};
  vm.runInNewContext(PRELOAD, {
    process: { platform: "darwin", argv: [`--omb-local-origin=${LOCAL_ORIGIN}`, "--omb-company-desktop=1"] },
    location: { origin }, navigator: { userActivation: { isActive: click } }, TextEncoder,
    require: () => ({ webUtils: {}, contextBridge: { exposeInMainWorld: (_name: string, value: Record<string, unknown>) => { ogb = value; } },
      ipcRenderer: { on() {}, removeListener() {}, send() {},
        sendSync: (channel: string) => { const event = { page, returnValue: undefined as unknown }; desk.listeners.get(channel)?.(event); return event.returnValue; },
        invoke: async (channel: string, ...args: unknown[]) => desk.handlers.get(channel)?.({ page }, ...args) } }),
  });
  const fakes: Record<string, unknown> = { cloudAccount: bridges.cloud, cloudPlan: bridges.plan, openExternal: vi.fn(async () => true), organization: undefined };
  return { ...ogb, ...Object.fromEntries(Object.entries(fakes).filter(([key]) => key in ogb)) };
}
const showWindow = (origin: string, options?: { click?: boolean }) => {
  vi.stubGlobal("window", { ogb: windowOn(origin, options), addEventListener: vi.fn(), removeEventListener: vi.fn() });
};

const flush = async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); };
const render = () => { f.index = 0; f.effects = []; return renderToStaticMarkup(createElement(AppNotices, { viewer, now: () => now })); };
async function settle(rounds = 4) { for (let i = 0; i < rounds; i++) { render(); f.effects.forEach(effect => effect()); await flush(); } return render(); }
const launch = () => { f.values = []; return settle(); };
type Node = ReactElement<Record<string, any>>;
const nodes = (value: ReactNode): Node[] => {
  if (!isValidElement(value)) return [];
  const node = value as Node;
  if (typeof node.type === "function") return nodes((node.type as (props: unknown) => ReactNode)(node.props));
  return [node, ...Children.toArray(node.props.children).flatMap(nodes)];
};
const tree = () => { f.index = 0; f.effects = []; return nodes(AppNotices({ viewer, now: () => now })); };
const press = (label: string) => {
  const button = tree().find(node => node.type === "button" && (renderToStaticMarkup(node).includes(`>${label}<`) || node.props["aria-label"] === label));
  expect(button, label).toBeTruthy(); button!.props.onClick();
};
/** A bot has answered once, in this launch: what a new install has after its first chat. */
const FIRST_REPLY = [{ tasks: [{ threadId: "first", usage: { turns: 1 } }] }];
let session: Map<string, string>;
const returning = () => { f.state.bots = [{ tasks: [{ threadId: "t", createdAt: 1, usage: { turns: 2 } }] }]; };
const launchCardsSeen = () => { desk.saved = { seen: [CLOUD_PRO_UPDATE_NOTICE] }; };

beforeEach(() => {
  vi.clearAllMocks(); vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
  storage = new Map(); f.values = []; f.index = 0; f.effects = []; f.updater = null; f.brand = "default"; f.dispatch = vi.fn(); now = NOW; desk = desktopMachine();
  setLocale("en"); viewer = LOCAL_VIEWER; account = signedOut; snapshot = { status: "none" }; offer = TRIAL_OFFER;
  session = new Map(); f.viewerEmail = undefined;
  vi.stubGlobal("sessionStorage", { getItem: (key: string) => session.get(key) ?? null, setItem: (key: string, value: string) => session.set(key, value) });
  f.state = { connected: true, hydrated: true, bots: structuredClone(FIRST_REPLY), groups: [], routines: [], instances: [{ instanceId: "claude", snapshot: { state: "available", authenticated: true } }],
    config: { onboarding: { ...EMPTY_ONBOARDING, completedAt: "2026-09-01", version: 1, hintsSeen: withTourFinished(undefined) } } };
  vi.mocked(api).mockImplementation(async (_path, init) => {
    const patch = JSON.parse(String((init as RequestInit).body));
    f.state.config.onboarding.hintsSeen = patch.onboarding.hintsSeen;
    return f.state.config;
  });
  vi.stubGlobal("localStorage", { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) });
  // The Cloud Pro popup comes first; the tests before its own are about the cards after it.
  launchCardsSeen();
  accountListeners = new Set();
  bridges = {
    cloud: { state: vi.fn(async () => account), onState: vi.fn((listener: (next: CloudAccountState) => void) => { accountListeners.add(listener); return () => accountListeners.delete(listener); }),
      offer: vi.fn(async () => offer), begin: vi.fn(async () => account),
      signInAgain: vi.fn(async () => account), connectHome: vi.fn(async () => account), openDashboard: vi.fn(async () => account) },
    plan: { state: vi.fn(async () => { if (snapshot instanceof Error) throw snapshot; return snapshot; }), manage: vi.fn(async () => {}), noticeSeen: vi.fn(async () => {}) },
  };
  showWindow(LOCAL_ORIGIN);
  vi.stubGlobal("document", fakeDocument());
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); setLocale("en"); });

describe("the star card", () => {
  it("comes last and is for good", async () => {
    account = { ...free }; offer = { ...PLAIN_OFFER }; returning();
    expect(await launch()).toContain(STAR);
    press("Not now");
    expect(storage.get(STAR_NOTICE)).toBe("1"); expect(await launch()).toBe("");
  });
});


describe("the product-updates question after the update", () => {
  const QUESTION = "Get MausBot updates?", POPUP = "MausBot Cloud Pro";
  const RECEIPT = "R".repeat(43);
  let saved: unknown;
  let accountAnswer: { status: string; textVersion: string } | null;
  let client: Record<string, ReturnType<typeof vi.fn>>;
  /** Main's own consent for this desktop, behind its real IPC: the real record and logic, a fake Cloud client. */
  const wireConsent = () => {
    const prefs = createDesktopPrefs({ read: () => saved, write: value => { saved = JSON.parse(JSON.stringify(value)); } });
    const consent = createUpdatesConsent({ prefs, account: () => client as never, available: async () => true, now: () => now });
    registerUpdatesConsent({ ipcMain: { handle: (channel, handler) => void desk.handlers.set(channel, handler as Handler) }, page: event => (event as { page: Page }).page, consent });
  };
  const answer = () => (saved as { updatesConsent?: { status: string } } | null)?.updatesConsent ?? null;
  const type = (value: string) => { const input = tree().find(node => node.type === "input" && node.props.type === "email")!; expect(input).toBeTruthy(); input.props.onChange({ target: { value } }); };

  beforeEach(() => {
    saved = null; accountAnswer = null;
    client = { state: vi.fn(() => account), updatesConsent: vi.fn(async () => ({ cloudContractVersion: 1, consent: accountAnswer })),
      recordUpdatesConsent: vi.fn(async (status: string, textVersion: string) => { accountAnswer = { status, textVersion }; }),
      updatesConsentByEmail: vi.fn(async () => RECEIPT), withdrawUpdatesConsent: vi.fn(async () => {}) };
    wireConsent();
  });

  it("comes after the Cloud Pro popup, never with it, and right after it closes; No thanks is kept and it is never asked again", async () => {
    desk.saved = null; storage.delete(CLOUD_PRO_UPDATE_NOTICE);
    const first = await launch();
    expect(first).toContain(QUESTION); expect(first).not.toContain(POPUP);
    const next = render();
    expect(next).toContain(QUESTION);
    for (const text of ["about new features and tips, about twice a month. You can unsubscribe any time.", "Your email", "Yes, send me updates", "No thanks"])
      expect(next).toContain(text);
    for (const part of ['role="dialog"', 'aria-modal="true"', 'aria-labelledby="updates-consent-title"', 'type="email"', 'value=""']) expect(next).toContain(part);
    expect(next).not.toContain('type="checkbox"');
    press("No thanks"); await flush();
    expect(render()).toBe("");
    expect(answer()).toMatchObject({ status: "declined" });
    expect(client.updatesConsentByEmail).not.toHaveBeenCalled();
    expect(await launch()).not.toContain(QUESTION);
    wireConsent();
    expect(await launch(), "a restart reads it from the desktop's file").not.toContain(QUESTION);
  });

  it("waits for a new install's first reply and for a launch after the one whose welcome finished, then keeps its place after the Cloud Pro popup", async () => {
    desk.saved = null; storage.delete(CLOUD_PRO_UPDATE_NOTICE);
    f.state.bots = [];
    markWelcomeFinished();
    const first = await launch();
    expect(first, "the welcome just closed and no bot has answered").not.toContain(QUESTION); expect(first).not.toContain(POPUP);
    f.state.bots = structuredClone(FIRST_REPLY);
    const answered = await launch();
    expect(answered, "a bot has answered, but in the launch the welcome finished").not.toContain(QUESTION); expect(answered).not.toContain(POPUP);
    session.clear();
    expect(await launch()).toContain(QUESTION);
  });

  it("waits while MausBot's first-launch card is due, then follows it in the same launch once it closes", async () => {
    f.viewerEmail = null;
    f.state.bots = [{ ...structuredClone(FIRST_REPLY[0]), id: "maus", defaultBot: {} }];
    expect(await launch(), "the card is due: the question waits for it").not.toContain(QUESTION);
    markLaunchDialog("mausbot"); f.state.bots[0].welcomed = true;
    const after = await launch();
    expect(after, "the card closed in this launch: the question follows it, as it follows the popup").toContain(QUESTION);
    expect(after, "the popup still waits for a later launch").not.toContain(POPUP);
  });

  it("never during onboarding, the tour or Settings; it shows once they are done, before the other cards", async () => {
    returning();
    f.state.welcomeOpen = true; expect(await launch()).toBe("");
    f.state.welcomeOpen = false; f.state.appSettingsOpen = true; expect(await launch()).toBe("");
    f.state.appSettingsOpen = false;
    const html = await launch();
    expect(html).toContain(QUESTION); expect(html).not.toContain(STAR);
  });

  it("signed out: an optional email; Yes sends it with no account and keeps the receipt. Signed in: one tap, on the account", async () => {
    await launch(); expect(await settle()).toContain(QUESTION);
    type("not-an-email"); press("Yes, send me updates"); await flush();
    expect(render()).toContain("Enter a valid email address.");
    expect(client.updatesConsentByEmail).not.toHaveBeenCalled();
    type("person@example.test"); press("Yes, send me updates");
    for (let i = 0; i < 5; i++) await flush();
    expect(client.updatesConsentByEmail).toHaveBeenCalledWith(expect.objectContaining({ email: "person@example.test", textVersion: "2026-10-23" }));
    expect(answer()).toMatchObject({ status: "opted_in", email: "person@example.test", receipt: RECEIPT });
    expect(render()).toBe("");

    saved = null; account = free; wireConsent();
    await launch(); const signedIn = await settle();
    expect(signedIn).toContain(QUESTION); expect(signedIn).not.toContain('type="email"');
    press("Yes, send me updates");
    for (let i = 0; i < 5; i++) await flush();
    expect(client.recordUpdatesConsent).toHaveBeenCalledWith("opted_in", "2026-10-23");
    expect(answer()).toMatchObject({ status: "opted_in", account: "a" });
    expect(await launch()).not.toContain(QUESTION);
  });

  it("not on a branded build, a saved server's page, or in a remote client's window; My Cloud's own page asks too", async () => {
    f.brand = "file"; expect(await launch()).not.toContain(QUESTION);
    f.brand = "default";
    viewer = { hosted: true, canSave: true }; showWindow(VPS); expect(await launch()).not.toContain(QUESTION);
    showWindow(LOCAL_ORIGIN); viewer = LOCAL_VIEWER; (window.ogb as Record<string, any>).remoteClient.active = true;
    expect(await launch()).not.toContain(QUESTION);
    snapshot = { status: "none" }; viewer = { hosted: false, canSave: true, cloudHome: true }; f.state.config.cloudHome = true;
    f.state.config.onboarding.hintsSeen = [...withTourFinished(undefined), "cloud-setup-hidden"]; showWindow(MY_CLOUD);
    expect(await launch()).toContain(QUESTION);
    expect(answer()).toBeNull();
  });
});

describe("main's Use my Mac popup, once the moment is right", () => {
  let due: boolean, modal: boolean, answer: (() => void) | null;
  const asked: unknown[] = [];
  const wireLending = () => {
    desk.handlers.set("cloud-lending:due", async () => due);
    desk.handlers.set("cloud-lending:ask", (_event: unknown, language: unknown) => { asked.push(language); return new Promise<void>(resolve => { answer = () => { due = false; resolve(); }; }); });
  };
  beforeEach(() => {
    due = true; modal = false; answer = null; asked.length = 0; wireLending(); returning(); storage.set(CLOUD_INTRO, "1");
    vi.stubGlobal("document", fakeDocument({
      querySelectorAll: () => modal ? [{ closest: () => null, checkVisibility: () => true }] : [] }));
  });

  it("asks main first, in the page's language, draws nothing itself, and nothing else shows until it is answered; then only the next launch's cards", async () => {
    setLocale("de");
    expect(await launch()).toBe("");
    expect(asked).toEqual(["de"]);
    expect(await settle(), "the star waits while main's popup is open").not.toContain("OpenMausBot");
    expect(asked, "asked once").toHaveLength(1);
    setLocale("en");
    answer!(); await flush();
    expect(await settle(), "nothing else in this launch after it").not.toContain(STAR);
    expect(await launch(), "no longer due: the cards go on as before").toContain(STAR);
    expect(asked).toHaveLength(1);
  });

  it("waits during the welcome, the tour, Settings, a dialog, a call, a busy bot or an update, and never asks when main says it is not due", async () => {
    const waits: Array<() => void> = [
      () => { f.state.welcomeOpen = true; }, () => { f.state.tourOpen = true; }, () => { f.state.appSettingsOpen = true; }, () => { modal = true; },
      () => { f.state.liveCall = { status: "live" }; }, () => { f.state.cloudAdd = { source: "app_menu" }; }, () => { f.updater = { status: "downloaded" }; },
      () => { f.state.bots = [{ busy: true, tasks: [{ threadId: "t", createdAt: 1, usage: { turns: 2 } }] }]; },
      () => { f.state.config.onboarding.completedAt = undefined; },
    ];
    for (const wait of waits) {
      const saved = structuredClone(f.state); wait();
      await launch();
      expect(asked, wait.toString()).toEqual([]);
      f.state = saved; f.updater = null; modal = false;
    }
    due = false;
    expect(await launch()).toContain(STAR);
    expect(asked).toEqual([]);
    due = true;
    expect(await launch()).toBe("");
    expect(asked).toEqual(["en"]);
  });

  it("on a new install it waits for the first reply and MausBot's card, skips the launches they or the welcome used, and claims the next", async () => {
    f.state.bots = [{ tasks: [{ threadId: "first" }] }];
    await launch();
    expect(asked, "the first chat, before its first reply").toEqual([]);
    f.viewerEmail = null;
    f.state.bots = [{ ...structuredClone(FIRST_REPLY[0]), id: "maus", defaultBot: {} }];
    await launch();
    expect(asked, "MausBot's card is due").toEqual([]);
    markLaunchDialog("mausbot"); f.state.bots[0].welcomed = true;
    await launch();
    expect(asked, "the launch MausBot's card opened").toEqual([]);
    session.clear(); markWelcomeFinished();
    await launch();
    expect(asked, "the launch the welcome finished in").toEqual([]);
    session.clear();
    await launch();
    expect(asked).toEqual(["en"]);
    expect(launchDialogShown()).toBe("notices");
  });

  it("My Cloud's own page in this app asks too", async () => {
    snapshot = { status: "none" }; viewer = { hosted: false, canSave: true, cloudHome: true }; f.state.config.cloudHome = true;
    f.state.config.onboarding.hintsSeen = [...withTourFinished(undefined), "cloud-setup-hidden"]; showWindow(MY_CLOUD); wireLending();
    await launch();
    expect(asked).toEqual(["en"]);
  });
});
