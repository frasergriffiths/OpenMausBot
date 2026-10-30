import { spawn, type ChildProcess } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import { resolveAgentBrowserBinary } from "../../server/browser-engine.ts";
import { waitForExit } from "../../server/testing/cleanup.ts";
import { runControlOmb } from "../control-omb.ts";
import { UI_TOOLS_DIR } from "./control-omb-ui.ts";
import { fixtureApi } from "./preview-fixture.ts";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const binary = resolveAgentBrowserBinary({ dataDir: UI_TOOLS_DIR, env: process.env });
const enabled = process.env.OMB_UI_E2E === "1" || Boolean(binary);
if (!enabled) console.info("skipping team canvas UI e2e: set OMB_UI_E2E=1 to install the pinned browser");

type BotRecord = {
  id: string; name: string; title?: string; section?: string; threadId: string; chiefOfStaff?: boolean;
  modelSelection: { instanceId: string; model: string; effort?: string };
  tasks: Array<{ threadId: string; title: string; modelSelection?: unknown }>;
};

(enabled ? it : it.skip)("lays the team map out as readable department panels", async () => {
  let child: ChildProcess | undefined;
  let info: { ui: string; url: string; botId: string; logPath: string } | undefined;
  const receipts: Record<string, unknown> = {};
  try {
    let stdout = "", stderr = "";
    child = spawn(process.execPath, ["--experimental-strip-types", join(ROOT, "scripts/control-omb.ts"), "ui", "launch"], {
      cwd: ROOT, env: process.env, stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout!.on("data", (chunk: Buffer) => { stdout += String(chunk); });
    child.stderr!.on("data", (chunk: Buffer) => { stderr += String(chunk); });
    child.on("error", error => { stderr += error.message; });
    await expect.poll(() => {
      if (child!.exitCode !== null || child!.signalCode !== null) throw new Error("UI launcher exited: " + stderr);
      try { info = JSON.parse(stdout); return Boolean(info?.ui); } catch { return false; }
    }, { timeout: binary ? 180_000 : 600_000, interval: 250 }).toBe(true);
    const fixture = info!;
    const api = fixtureApi(fixture.url);
    const ui = (verb: string, ...args: string[]) => runControlOmb(["ui", verb, "--ui", fixture.ui, ...args]) as Promise<Record<string, any>>;
    const evaluate = async (js: string) => (await ui("eval", "--js", js)).result;
    const snapshot = async () => (await ui("snapshot")).snapshot as string;
    const focused = () => evaluate("document.activeElement?.getAttribute('aria-label') || document.activeElement?.textContent?.trim()");
    const click = async (name: string, role?: string) => {
      let matches: Array<[string, { name: string; role: string }]> = [];
      await expect.poll(async () => {
        const refs = (await ui("snapshot")).refs as Record<string, { name: string; role: string }>;
        matches = Object.entries(refs).filter(([, entry]) => (role ? entry.role === role : ["button", "menuitem"].includes(entry.role)) && entry.name === name);
        return matches.length;
      }, { timeout: 10_000, message: "one " + (role ?? "button/menuitem") + " named " + name }).toBe(1);
      await ui("click", "--ref", "@" + matches[0][0]);
    };
    const control = (...args: string[]) => runControlOmb([...args, "--url", fixture.url]) as Promise<any>;
    const bots = async (): Promise<BotRecord[]> => (await api("GET", "/api/bots?messages=0")).bots;
    const savedBot = async (id: string) => (await bots()).find(bot => bot.id === id)!;
    const identity = (bot: BotRecord) => ({ id: bot.id, name: bot.name, title: bot.title, threadId: bot.threadId,
      modelSelection: bot.modelSelection, tasks: bot.tasks.map(task => ({ threadId: task.threadId, title: task.title, modelSelection: task.modelSelection })) });
    const teamSelector = (name: string) => "[data-team-key=" + JSON.stringify(name) + "]";
    const cardOrder = (name: string) => evaluate("[...document.querySelectorAll(" + JSON.stringify(teamSelector(name) + " [data-bot-id]") + ")].map(card => card.dataset.botId)");
    const openMenu = (name: string) => evaluate("(() => {" +
      "const summary = document.querySelector(" + JSON.stringify(teamSelector(name) + " summary") + ");" +
      "if (!summary) throw new Error('Missing department menu');" +
      "summary.click(); return summary.parentElement.open; })()");
    const openMap = async () => {
      if (!(await evaluate("Boolean(document.querySelector('[data-team-board]'))"))) await click("Team map");
      await expect.poll(() => evaluate("Boolean(document.querySelector('[data-team-board]'))"), { timeout: 10_000 }).toBe(true);
    };
    const dragBot = (botId: string, section: string) => evaluate("(async () => {" +
      "const source = document.querySelector(" + JSON.stringify("[data-bot-id=" + JSON.stringify(botId) + "]") + ");" +
      "const target = document.querySelector(" + JSON.stringify(teamSelector(section)) + ");" +
      "if (!source || !target) throw new Error('Missing drag target');" +
      "const rect = target.getBoundingClientRect();" +
      "const dt = new DataTransfer();" +
      "const point = { clientX: rect.left + rect.width / 2, clientY: rect.top + 80 };" +
      "source.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: dt }));" +
      "target.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt, ...point }));" +
      "target.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt, ...point }));" +
      "source.dispatchEvent(new DragEvent('dragend', { bubbles: true, cancelable: true, dataTransfer: dt }));" +
      "await new Promise(resolve => setTimeout(resolve, 200)); return true; })()");

    await api("PATCH", "/api/bots/" + fixture.botId, { name: "Ada", section: "Engineering", chiefOfStaff: true });
    const ben: BotRecord = (await api("POST", "/api/bots", { name: "Ben", title: "Build and review", section: "Engineering",
      modelSelection: { instanceId: "claude", model: "claude-sonnet-5" } })).bot;
    const cleo: BotRecord = (await api("POST", "/api/bots", { name: "Cleo", title: "Research coordinator", section: "Research",
      modelSelection: { instanceId: "codex", model: "gpt-5.4" } })).bot;
    await api("PATCH", "/api/bots/" + cleo.id, { chiefOfStaff: true });
    const dana: BotRecord = (await api("POST", "/api/bots", { name: "Dana", title: "Find supporting evidence", section: "Research",
      modelSelection: { instanceId: "qwen", model: "qwen3-coder-plus" } })).bot;
    await api("POST", "/api/sidebar-sections", { name: "Delivery" });
    await control("send", "--bot", ben.id, "--text", "Remember this conversation when the team changes.");
    expect(await control("wait", "--bot", ben.id, "--timeout", "30")).toMatchObject({ status: "settled" });
    const transcript = (await control("messages", "--bot", ben.id, "--limit", "10")).messages;
    const beforeBots = await bots();
    await evaluate("location.reload(); true");
    await expect.poll(snapshot, { timeout: 15_000 }).toContain("Actions for Ada");
    await openMap();

    await expect.poll(() => evaluate("[...document.querySelectorAll('[data-team-key]')].map(team => team.dataset.teamKey)"))
      .toEqual(expect.arrayContaining(["Engineering", "Research", "Delivery"]));
    expect(await snapshot()).toContain('region "Team canvas"');
    expect(await evaluate("Boolean(document.querySelector('[aria-label=\"Fit departments to view\"]'))")).toBe(false);
    expect(await evaluate("Boolean(document.querySelector('[aria-label=\"Zoom in\"]'))")).toBe(false);
    const controls = await evaluate("JSON.stringify([...document.querySelectorAll('main > header button:not([role=switch]), main > header label, main > header summary')].filter(control => { const details = control.closest('details'); return !details || details.querySelector(':scope > summary') === control; }).map(control => Math.round(control.getBoundingClientRect().height)))");
    expect(JSON.parse(controls).every((height: number) => height === 32), controls).toBe(true);
    const cardWidth = await evaluate("Math.min(...[...document.querySelectorAll('[data-team-key] [data-bot-id]')].map(card => card.getBoundingClientRect().width))");
    expect(cardWidth).toBeGreaterThanOrEqual(208);
    receipts.layout = { controls: JSON.parse(controls), cardWidth };

    await evaluate("document.querySelector('main > header summary[aria-haspopup=menu]').click(); true");
    await expect.poll(() => evaluate("document.querySelectorAll('[role=menuitem]').length")).toBeGreaterThan(1);
    await click("Engineering", "menuitem");
    await expect.poll(snapshot).toContain('dialog "Engineering department memory"');
    expect(await evaluate("document.querySelector('[role=dialog]').getAttribute('aria-describedby')")).toBe("team-memory-description");
    expect(await evaluate("Math.round(document.querySelector('[role=dialog] header button').getBoundingClientRect().width)")).toBe(32);
    await ui("press", "--keys", "Escape");
    await expect.poll(snapshot).not.toContain('dialog "Engineering department memory"');
    expect(await focused()).toBe("Department memory");
    receipts.memoryHeader = "menu, same dialog, described, 32px close, focus returned";

    expect(await openMenu("Engineering")).toBe(true);
    const menu = await evaluate("JSON.stringify([...document.querySelectorAll('[data-team-key=Engineering] [role=menuitem]')].map(item => item.textContent.trim()))");
    await click("Manage bots…", "menuitem");
    await expect.poll(snapshot).toContain('dialog "Manage bots"');
    expect(await snapshot()).toContain("Checked bots belong to this department");
    await click("Close department dialog");
    await expect.poll(focused).toBe("Manage Engineering department");
    receipts.menu = JSON.parse(menu);

    await evaluate("document.querySelector(" + JSON.stringify(teamSelector("Engineering") + " summary") + ").closest('details').removeAttribute('open'); true");
    expect(JSON.parse(menu)).toEqual(["Department memory", "Shared instructions", "Manage bots…", "Rename department", "Delete"]);

    receipts.move = await dragBot(ben.id, "Research");
    await expect.poll(snapshot).toContain('alertdialog "Move Ben to Research?"');
    expect((await savedBot(ben.id)).section).toBe("Engineering");
    await click("Move bot");
    await expect.poll(async () => (await savedBot(ben.id)).section).toBe("Research");
    await expect.poll(() => evaluate("Boolean(document.querySelector(" + JSON.stringify(teamSelector("Research") + " [data-bot-id=" + JSON.stringify(ben.id) + "]") + "))")).toBe(true);
    expect(identity(await savedBot(ben.id))).toEqual(identity(beforeBots.find(bot => bot.id === ben.id)!));
    expect((await control("messages", "--bot", ben.id, "--limit", "10")).messages).toEqual(transcript);
    const afterMove = await bots();

    const beforeReorder = await cardOrder("Research") as string[];
    expect(beforeReorder).toEqual([cleo.id, ben.id, dana.id]);
    await evaluate("(() => { const card = document.querySelector(" + JSON.stringify(teamSelector("Research") + " [data-bot-id=" + JSON.stringify(ben.id) + "]") + ");" +
      "const button = card.querySelector('button[aria-label^=\"Edit\"]'); button.focus();" +
      "button.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true, bubbles: true, cancelable: true })); return true; })()");
    await expect.poll(() => cardOrder("Research")).toEqual([cleo.id, dana.id, ben.id]);
    expect(await bots()).toEqual(afterMove);
    receipts.order = await cardOrder("Research");

    await evaluate("location.reload(); true");
    await expect.poll(snapshot, { timeout: 15_000 }).toContain("Actions for Ada");
    await openMap();
    await expect.poll(() => cardOrder("Research"), { timeout: 10_000 }).toEqual([cleo.id, dana.id, ben.id]);
    expect((await savedBot(ben.id)).section).toBe("Research");
    expect((await control("messages", "--bot", ben.id, "--limit", "10")).messages).toEqual(transcript);

    const screenshots: string[] = [];
    for (const skin of ["midnight", "daylight"]) {
      await evaluate("import('/src/lib/skins.ts').then(({ applySkin }) => { applySkin(" + JSON.stringify(skin) + "); return document.documentElement.dataset.skin; })");
      await evaluate("document.fonts.ready.then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true)))))");
      const screenshot = fixture.logPath + ".team-board-" + skin + ".png";
      await ui("screenshot", "--out", screenshot);
      screenshots.push(screenshot);
    }
    const consoleResult = await ui("console");
    expect((consoleResult.messages ?? []).filter((message: { type: string }) => message.type === "error")).toEqual([]);
    Object.assign(receipts, { screenshots, finalBots: (await bots()).map(identity), console: consoleResult });
  } finally {
    if (info) {
      if (!receipts.screenshots) {
        try {
          receipts.failureSnapshot = await runControlOmb(["ui", "snapshot", "--ui", info.ui]);
          receipts.failureScreenshot = await runControlOmb(["ui", "screenshot", "--ui", info.ui, "--out", info.logPath + ".team-board-failure.png"]);
        } catch { /* Preserve the original failure when the browser has stopped. */ }
      }
      const evidence = info.logPath + ".team-board.json";
      writeFileSync(evidence, JSON.stringify({ fixture: info, ...receipts }, null, 2));
      console.info(JSON.stringify({ evidence }));
    }
    await waitForExit(child, { signal: "SIGINT", graceMs: 30_000 });
  }
}, binary ? 240_000 : 720_000);
