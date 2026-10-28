/** Citations are gone from the app. Messages sent before that still carry an inline marker followed by the readable
 *  quote, so reading them only needs the marker stripped: the quote stays as plain Markdown text. */
const CITATION_MARKER = /<!--omb-citation-v1:[A-Za-z0-9_-]{1,100000}-->\n?/g;

export function hasLegacyCitation(text: string): boolean {
  CITATION_MARKER.lastIndex = 0;
  const found = CITATION_MARKER.test(text);
  CITATION_MARKER.lastIndex = 0;
  return found;
}

export function withoutCitationMarkers(text: string): string {
  return text.replace(CITATION_MARKER, "");
}
