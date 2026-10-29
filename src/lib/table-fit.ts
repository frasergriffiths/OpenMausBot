/** Bounds for a column's narrowest width, in characters of the table's 14px text, and the width of one. */
export const COLUMN_MIN_CHARS = 4;
export const COLUMN_MAX_CHARS = 12;
/** The widest a column needs to be to hold its longest unbroken run (a path, a class list item), in characters. */
export const REQUIRED_MAX_CHARS = 32;
export const CHAR_PX = 7.5;
const SAMPLE_ROWS = 100;

/** Card columns follow Nova's widths: the index stays narrow, paths get room for a filename and line number, and
 * prose gets a readable column. */
export const INDEX_COLUMN_PX = 60;
export const PATH_COLUMN_PX = 216;
export const PATH_COLUMN_MAX_PX = 240;
export const TEXT_COLUMN_MIN_PX = 140;
export const TEXT_COLUMN_MAX_PX = 200;

/** How narrow each column may get before its words break: its longest word, kept within bounds, in px. The browser
 * gives every column at least this and shares the rest of the row by how much each column has to say. */
export function columnMinimums(header: readonly string[], rows: readonly (readonly string[])[]): number[] {
  return header.map((title, index) => {
    let longest = 0;
    for (const text of [title, ...rows.slice(0, SAMPLE_ROWS).map((row) => row[index] ?? "")]) {
      for (const word of text.split(/\s+/)) longest = Math.max(longest, [...word].length);
    }
    return Math.round(Math.min(COLUMN_MAX_CHARS, Math.max(COLUMN_MIN_CHARS, longest)) * CHAR_PX);
  });
}

/** The width a column needs so its longest unbroken run sits on one line, capped at a readable 240px. */
export function requiredColumnWidths(header: readonly string[], rows: readonly (readonly string[])[]): number[] {
  return header.map((title, index) => {
    let longest = 0;
    for (const text of [title, ...rows.slice(0, SAMPLE_ROWS).map((row) => row[index] ?? "")]) {
      for (const word of text.split(/[\s,;]+/)) longest = Math.max(longest, [...word].length);
    }
    return Math.round(Math.min(REQUIRED_MAX_CHARS, Math.max(COLUMN_MIN_CHARS, longest)) * CHAR_PX);
  });
}

const PATH_TOKEN = /(?:[A-Za-z]:)?[\\/](?:[^\\/\s,;]+[\\/])*[^\\/\s,;]+:\d+(?::\d+)?/g;

/** Every file path with a line number in a cell, full path included. */
export function pathTokens(text: string): string[] {
  return text.match(PATH_TOKEN) ?? [];
}

function lastSegment(token: string): string {
  return token.slice(Math.max(token.lastIndexOf("/"), token.lastIndexOf("\\")) + 1);
}

/** Card mode shows the filename and line number, not the directory. Several paths show the first and how many more
 * there are. The full string stays in the cell's title, the copied CSV and the expanded table. Prose that merely
 * mentions a path is left whole. */
export function cardCellText(text: string): string {
  const tokens = pathTokens(text);
  if (tokens.length === 0) return text;
  const rest = text.replace(PATH_TOKEN, "").replace(/\b(?:also|and)\b/gi, "").replace(/[\s,;]+/g, "");
  if (rest.length > 0) return text;
  const first = lastSegment(tokens[0]!);
  return tokens.length > 1 ? `${first} +${tokens.length - 1}` : first;
}

/** Fixed-layout widths for a scrolled card: 60px for a numeric index, 216 to 240px for paths, 140 to 200px for prose. */
export function cardColumnWidths(header: readonly string[], rows: readonly (readonly string[])[]): number[] {
  const required = requiredColumnWidths(header, rows);
  return header.map((_title, index) => {
    const cells = rows.slice(0, SAMPLE_ROWS).map((row) => row[index] ?? "");
    if (index === 0 && cells.length > 0 && cells.every((text) => /^[-+]?\d+(?:[.,]\d+)?$/.test(text.trim()))) {
      return INDEX_COLUMN_PX;
    }
    const paths = cells.flatMap((text) => pathTokens(text));
    if (paths.length > 0) {
      const longest = Math.max(...paths.map((token) => lastSegment(token).length));
      return Math.min(PATH_COLUMN_MAX_PX, Math.max(PATH_COLUMN_PX, Math.round(longest * CHAR_PX + CELL_PADDING_PX)));
    }
    return Math.min(TEXT_COLUMN_MAX_PX, Math.max(TEXT_COLUMN_MIN_PX, Math.round(required[index]! + CELL_PADDING_PX)));
  });
}

/** A fit table divides the measured room in proportion to each column's real width, so its columns always add up to
 * the room it has and the fixed layout cannot exceed it. */
export function fittedColumnWidths(widths: readonly number[], available: number): number[] {
  const total = widths.reduce((sum, width) => sum + width, 0);
  if (total <= 0 || total >= available) return [...widths];
  const extra = available - total;
  const fitted = widths.map((width) => Math.floor(width + extra * (width / total)));
  let remainder = available - fitted.reduce((sum, width) => sum + width, 0);
  for (let index = 0; remainder > 0 && fitted.length > 0; index = (index + 1) % fitted.length) {
    fitted[index]! += 1;
    remainder -= 1;
  }
  return fitted;
}

/** Cards draw px-4 cells, so a column's padding is 32px, not the 24px of the quiet table. */
export const CELL_PADDING_PX = 32;

/** A table that wraps and is short enough to draw whole fits its columns to the message only when the room their
 * real widths need fits the room it has. An unmeasured table is not a fit: it draws fixed columns until the observer
 * reports, so every card paints one layout and there is no auto-to-fixed jump. Otherwise the table keeps its
 * measured fixed columns and scrolls sideways, which on a phone beats rows squeezed tall; a very long one keeps
 * fixed columns so rows keep their widths as they scroll in and out. */
export function fitsColumns({ wrap, virtual, widths = [], available = null }: {
  wrap: boolean; virtual: boolean; widths?: readonly number[]; available?: number | null;
}): boolean {
  if (!wrap || virtual || available === null) return false;
  return widths.reduce((sum, width) => sum + width, 0) <= available;
}
