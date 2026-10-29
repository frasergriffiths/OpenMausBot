// @vitest-environment happy-dom
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { describe, expect, it, vi } from "vitest";
import { RichTable } from "./RichTable";
import { ChatMarkdown } from "./ChatMarkdown";
import {
  CELL_PADDING_PX, CHAR_PX, COLUMN_MAX_CHARS, COLUMN_MIN_CHARS, INDEX_COLUMN_PX, PATH_COLUMN_MAX_PX,
  PATH_COLUMN_PX, cardCellText, cardColumnWidths, columnMinimums, fitsColumns, fittedColumnWidths, requiredColumnWidths,
} from "@/lib/table-fit";
import { formattedReplyWidth } from "@/lib/formatted-reply";

const header = ["App", "Stars", "License", "Target user", "Strength", "Weakness", "Verdict"];
const row = ["OpenHands (ex-OpenDevin)", "~85k", "MIT", "Developers who want an autonomous coder",
  "Runs real software tasks end to end", "Needs a strong model and a sandbox", "Best open coding agent today"];
const markdown = [`| ${header.join(" | ")} |`, `|${header.map(() => "---").join("|")}|`, ...Array.from({ length: 10 }, () => `| ${row.join(" | ")} |`)].join("\n");

const pathLabels = ["#", "Panel", "Rows", "Call site", "Owner", "Test"];
const dir = "/private/var/folders/dc/2b5q34bn35v8rm2fgrhswfvc0000gn/T/opencode/omb-141/src/components";
const paths = ["Sidebar.tsx:1682", "SidebarTeamMenu.tsx:117", "ApprovalModeSelector.tsx:132",
  "EngineAccounts.tsx:122", "FilesView.tsx:214", "ExportTranscriptMenu.tsx:117"].map((file) => `${dir}/${file}`);
const pathCells = (index: number) => [String(index + 1), ...Array.from({ length: 5 }, (_, column) => paths[(index + column) % paths.length]!)]
  .map((text) => ({ text }));

function parse(html: string): Document {
  return new DOMParser().parseFromString(`<!doctype html><body>${html}</body>`, "text/html");
}

function mount(element: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root: Root = createRoot(host);
  flushSync(() => root.render(element));
  return {
    host,
    cleanup: () => {
      flushSync(() => root.unmount());
      host.remove();
      document.body.innerHTML = "";
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    },
  };
}

/** Reports `width` as the scroll region's client width and its table as `scrollWidth`. */
function measure(host: HTMLElement, report: (() => void) | undefined, width: number, scrollWidth = width) {
  const viewport = host.querySelector<HTMLElement>("[role=region]")!;
  Object.defineProperty(viewport, "clientWidth", { configurable: true, value: width });
  Object.defineProperty(viewport, "scrollWidth", { configurable: true, value: scrollWidth });
  flushSync(() => report?.());
  return viewport;
}

function observer() {
  const callbacks: Array<() => void> = [];
  vi.stubGlobal("ResizeObserver", class {
    private callback: (entries: Array<{ target: Element }>) => void;
    private target: Element | null = null;
    constructor(callback: (entries: Array<{ target: Element }>) => void) {
      this.callback = callback;
      callbacks.push(() => this.callback([{ target: this.target ?? document.body }]));
    }
    observe(target: Element) { this.target = target; }
    disconnect() {}
  });
  return () => callbacks.forEach((callback) => callback());
}

describe("a table in a reply", () => {
  it("draws a card fixed with measured columns and one-line cells before the observer reports", () => {
    const doc = parse(renderToStaticMarkup(createElement(RichTable, { columns: pathLabels.map((text) => ({ text })), rows: Array.from({ length: 10 }, (_, index) => pathCells(index)) })));
    const table = doc.querySelector("table")!;
    expect(table.className).toContain("table-fixed");
    expect(table.className).not.toContain("table-auto");
    expect(table.getAttribute("style")).toContain("min-width");
    expect(doc.querySelectorAll("col")).toHaveLength(6);
    const viewport = doc.querySelector<HTMLElement>("[role=region]")!;
    expect(viewport.dataset.fit).toBeUndefined();
    expect(fitsColumns({ wrap: true, virtual: false, widths: [140, 140], available: null })).toBe(false);
    for (const cell of doc.querySelectorAll("tbody td > div")) {
      expect(cell.className).toContain("truncate");
      expect(cell.className).not.toContain("whitespace-pre-wrap");
      expect(cell.className).not.toContain("line-clamp");
    }
  });

  it("fits a small table at 669 and 585 only when its real minimum fits, and never exceeds the room", () => {
    for (const width of [669, 585]) {
      const report = observer();
      const { host, cleanup } = mount(createElement(RichTable, {
        columns: [{ text: "Name" }, { text: "Owner" }],
        rows: [["Alpha", "Lin"], ["Beta", "Nova"]].map((line) => line.map((text) => ({ text }))),
      }));
      try {
        const viewport = measure(host, report, width, width);
        const table = host.querySelector("table")!;
        expect(fitsColumns({ wrap: true, virtual: false, widths: cardColumnWidths(["Name", "Owner"], [["Alpha", "Lin"]]), available: width })).toBe(true);
        expect(table.className).toContain("table-fixed");
        expect(viewport.dataset.fit).toBe("true");
        const minimum = Number.parseFloat(table.style.minWidth);
        expect(minimum).toBeLessThanOrEqual(width);
        const widths = [...host.querySelectorAll<HTMLElement>("col")].map((col) => Number.parseFloat(col.style.width));
        expect(widths.reduce((sum, column) => sum + column, 0)).toBe(minimum);
        expect(fittedColumnWidths([140, 140], width).reduce((sum, column) => sum + column, 0)).toBe(width);
      } finally {
        cleanup();
      }
    }
  });

  it("keeps Fraser's six path columns fixed and scrollable at 669 and 585, with 60px index and 216-240px paths", () => {
    const values = Array.from({ length: 10 }, (_, index) => pathCells(index).map((cell) => cell.text));
    const widths = cardColumnWidths(pathLabels, values);
    expect(fitsColumns({ wrap: true, virtual: false, widths, available: 669 })).toBe(false);
    expect(fitsColumns({ wrap: true, virtual: false, widths, available: 585 })).toBe(false);
    for (const width of [669, 585]) {
      const report = observer();
      const { host, cleanup } = mount(createElement(RichTable, { columns: pathLabels.map((text) => ({ text })), rows: values.map((line) => line.map((text) => ({ text }))) }));
      try {
        const viewport = measure(host, report, width, 1340);
        const table = host.querySelector("table")!;
        expect(table.className).toContain("table-fixed");
        expect(viewport.dataset.fit).toBeUndefined();
        const widths = [...host.querySelectorAll<HTMLElement>("col")].map((col) => Number.parseFloat(col.style.width));
        expect(widths[0]).toBe(INDEX_COLUMN_PX);
        for (const column of widths.slice(1)) {
          expect(column).toBeGreaterThanOrEqual(PATH_COLUMN_PX);
          expect(column).toBeLessThanOrEqual(PATH_COLUMN_MAX_PX);
        }
        expect(widths.reduce((sum, column) => sum + column, 0)).toBeGreaterThan(width);
        expect(Number.parseFloat(table.style.minWidth)).toBeGreaterThan(width);
        const first = host.querySelector<HTMLElement>("tbody td:nth-child(2) > div")!;
        expect(first.className).toBe("truncate");
        expect(first.textContent).toBe("Sidebar.tsx:1682");
        expect(first.getAttribute("title")).toBe(paths[0]);
      } finally {
        cleanup();
      }
    }
  });

  it("counts 32px of card padding, caps a path column at 240px and keeps the index at 60px", () => {
    expect(CELL_PADDING_PX).toBe(32);
    const long = `/${"a".repeat(100)}.tsx:12`;
    expect(requiredColumnWidths(["Panel"], [[long]])).toEqual([PATH_COLUMN_MAX_PX]);
    expect(cardColumnWidths(["Panel"], [[long]])).toEqual([PATH_COLUMN_MAX_PX]);
    expect(cardColumnWidths(["Panel"], [[`${dir}/Short.tsx:1`]])).toEqual([PATH_COLUMN_PX]);
    expect(cardColumnWidths(["#"], [["1"], ["2"]])).toEqual([INDEX_COLUMN_PX]);
    expect(cardColumnWidths(["#"], [["1"], ["2"]])[0]).not.toBe(140);
  });

  it("shows the first filename and a count for several paths, keeping the full string in the title and expanded table", () => {
    const full = `${dir}/EngineAccounts.tsx:122, also ${dir}/EngineAccounts.tsx:108, ${dir}/FilesView.tsx:214`;
    expect(cardCellText(full)).toBe("EngineAccounts.tsx:122 +2");
    expect(cardCellText(`See ${dir}/Sidebar.tsx:1682 for the details`)).toBe(`See ${dir}/Sidebar.tsx:1682 for the details`);
    const report = observer();
    const { host, cleanup } = mount(createElement(RichTable, { columns: [{ text: "Call site" }], rows: [[{ text: full }]] }));
    try {
      measure(host, report, 669, 1200);
      const cell = host.querySelector<HTMLElement>("tbody td > div")!;
      expect(cell.textContent).toBe("EngineAccounts.tsx:122 +2");
      expect(cell.getAttribute("title")).toBe(full);
    } finally {
      cleanup();
    }
    const expanded = parse(renderToStaticMarkup(createElement(RichTable, { expanded: true, columns: [{ text: "Call site" }], rows: [[{ text: full }]] })));
    expect(expanded.querySelector("tbody td")!.textContent).toContain("EngineAccounts.tsx:122, also");
    expect(expanded.querySelector("tbody td > div")!.className).toContain("whitespace-pre-wrap");
  });

  it("fades only the edges that still have content behind them, 56px wide, and flips for RTL", () => {
    const report = observer();
    const { host, cleanup } = mount(createElement(RichTable, { columns: pathLabels.map((text) => ({ text })), rows: Array.from({ length: 10 }, (_, index) => pathCells(index)) }));
    try {
      const viewport = measure(host, report, 669, 1340);
      const left = host.querySelector<HTMLElement>('[data-table-fade="left"]')!;
      const right = host.querySelector<HTMLElement>('[data-table-fade="right"]')!;
      expect(left.className).toContain("opacity-0");
      expect(right.className).toContain("opacity-100");
      for (const fade of [left, right]) {
        expect(fade.className).toContain("pointer-events-none");
        expect(fade.className).toContain("w-14");
        expect(fade.className).toContain("from-composer");
      }
      expect(viewport.className).not.toContain("mask-image");
      expect(viewport.className).toContain("table-card-scroll");

      viewport.scrollLeft = 671;
      flushSync(() => report?.());
      expect(left.className).toContain("opacity-100");
      expect(right.className).toContain("opacity-0");
    } finally {
      cleanup();
    }

    const rtlReport = observer();
    const rtl = mount(createElement(RichTable, { direction: "rtl", columns: pathLabels.map((text) => ({ text })), rows: Array.from({ length: 10 }, (_, index) => pathCells(index)) }));
    try {
      measure(rtl.host, rtlReport, 669, 1340);
      expect(rtl.host.querySelector<HTMLElement>('[data-table-fade="left"]')!.className).toContain("opacity-100");
      expect(rtl.host.querySelector<HTMLElement>('[data-table-fade="right"]')!.className).toContain("opacity-0");
    } finally {
      rtl.cleanup();
    }

    const css = readFileSync(join(process.cwd(), "src/styles.css"), "utf8");
    expect(css).toMatch(/\.table-card-scroll::-webkit-scrollbar \{\s*width: 8px;\s*height: 4px;/);
  });

  it("keeps quiet and expanded cells unclamped and scroll-free", () => {
    const report = observer();
    const quiet = mount(createElement(RichTable, { card: false, columns: pathLabels.map((text) => ({ text })), rows: Array.from({ length: 10 }, (_, index) => pathCells(index)) }));
    try {
      const viewport = measure(quiet.host, report, 669, 1340);
      expect(viewport.className).not.toContain("table-card-scroll");
      for (const cell of quiet.host.querySelectorAll("tbody td > div")) {
        expect(cell.className).not.toContain("truncate");
        expect(cell.className).toContain("whitespace-pre-wrap");
      }
    } finally {
      quiet.cleanup();
    }

    const expanded = parse(renderToStaticMarkup(createElement(RichTable, { expanded: true, columns: pathLabels.map((text) => ({ text })), rows: Array.from({ length: 10 }, (_, index) => pathCells(index)) })));
    expect(expanded.querySelector("[data-table-card]")).toBeNull();
    expect(expanded.querySelector("[data-table-fade]")).toBeNull();
    expect(Number.parseFloat(expanded.querySelector("table")!.style.minWidth)).toBeLessThan(1400);
    for (const cell of expanded.querySelectorAll("tbody td > div")) expect(cell.className).not.toContain("truncate");
  });

  it("keeps fixed columns and a scroll box for a very long table, whose rows are drawn as they scroll", () => {
    const doc = parse(renderToStaticMarkup(createElement(RichTable, {
      columns: header.map((text) => ({ text })), rows: Array.from({ length: 500 }, () => row.map((text) => ({ text }))),
    })));
    expect(doc.querySelector("table")!.className).toContain("table-fixed");
    expect(doc.querySelectorAll("col")).toHaveLength(7);
    expect(doc.querySelector<HTMLElement>("[role=region]")!.style.maxHeight).toBe("min(444px, calc(100dvh - 168px))");
    expect(fitsColumns({ wrap: true, virtual: false })).toBe(false);
    expect(fitsColumns({ wrap: true, virtual: false, widths: Array.from({ length: 7 }, () => 240), available: 800 })).toBe(false);
    expect(fitsColumns({ wrap: false, virtual: false, available: 800 })).toBe(false);
    expect(fitsColumns({ wrap: true, virtual: true, available: 800 })).toBe(false);
  });

  it("floors a column at its longest word, within bounds", () => {
    expect(columnMinimums(["ID", "Notes"], [["7", "a"], ["12", "Extremely-long-identifier here"]])).toEqual([
      COLUMN_MIN_CHARS * CHAR_PX, COLUMN_MAX_CHARS * CHAR_PX,
    ]);
    expect(columnMinimums(["Verdict"], [["Best open coding agent"]])).toEqual([Math.round(7 * CHAR_PX)]);
  });

  it("gives a reply with a table the message's full width and keeps its prose at reading width", () => {
    expect(formattedReplyWidth(markdown)).toContain("max-w-[var(--chat-card-pct)]");
    expect(formattedReplyWidth(markdown)).toContain("chat-wide");
    expect(formattedReplyWidth("- one\n- two")).toBe("w-full max-w-[min(var(--chat-prose-max),var(--chat-card-pct))]");
    const css = readFileSync(join(process.cwd(), "src/styles.css"), "utf8");
    expect(css).toMatch(/\.chat-wide \.chat-md > :not\(\.chat-table\) \{\s*max-width: var\(--chat-prose-max\);/);
  });

  it("renders a markdown card with no auto branch and no five-line band", () => {
    const doc = parse(renderToStaticMarkup(createElement(ChatMarkdown, { text: markdown })));
    expect(doc.querySelector("table")!.className).toContain("table-fixed");
    expect(doc.querySelectorAll("col")).toHaveLength(7);
    for (const cell of doc.querySelectorAll("tbody td > div")) {
      expect(cell.className).toBe("truncate");
      expect(cell.textContent).not.toContain("\n");
    }
  });
});
