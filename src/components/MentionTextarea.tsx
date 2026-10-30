import { cn } from "@/lib/cn";
import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject, type TextareaHTMLAttributes } from "react";
import { type MentionPeer } from "@/lib/mentions";
import { MentionText } from "./MentionText";

/** Every metric that decides where a glyph lands. The mirror paints the text; if it misses one, the painted words
 *  drift from the native caret. */
export const GLYPH_METRICS = [
  "font-family", "font-size", "font-weight", "font-style", "font-stretch",
  "letter-spacing", "word-spacing", "line-height", "text-indent", "text-transform", "tab-size",
  "padding-top", "padding-right", "padding-bottom", "padding-left",
  "border-top-width", "border-right-width", "border-bottom-width", "border-left-width",
] as const;

export function MentionTextarea({ inputRef, peers, everyone = false, wrapperClassName, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  wrapperClassName?: string;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  peers: readonly MentionPeer[];
  everyone?: boolean;
}) {
  const mirrorRef = useRef<HTMLDivElement>(null);
  const sync = useCallback(() => {
    const input = inputRef.current;
    const mirror = mirrorRef.current;
    if (!input || !mirror) return;
    mirror.style.width = `${input.clientWidth}px`;
    mirror.scrollTop = input.scrollTop;
    mirror.scrollLeft = input.scrollLeft;
  }, [inputRef]);
  const matchStyle = useCallback(() => {
    const input = inputRef.current;
    const mirror = mirrorRef.current;
    if (!input || !mirror) return;
    const style = getComputedStyle(input);
    for (const metric of GLYPH_METRICS) mirror.style.setProperty(metric, style.getPropertyValue(metric));
  }, [inputRef]);
  const resize = useCallback(() => {
    const input = inputRef.current;
    if (!input) return;
    matchStyle();
    const scrollTop = input.scrollTop;
    const line = parseFloat(getComputedStyle(input).lineHeight) || 24;
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, line * 6)}px`;
    input.scrollTop = scrollTop;
    sync();
  }, [inputRef, matchStyle, sync]);
  useLayoutEffect(resize, [props.value, resize]);
  // A webfont that arrives after the first paint changes every glyph width; re-copy and re-measure once it settles.
  useEffect(() => {
    let live = true;
    void document.fonts?.ready.then(() => { if (live) resize(); });
    return () => { live = false; };
  }, [resize]);
  useLayoutEffect(() => {
    let width = inputRef.current?.clientWidth;
    const observer = new ResizeObserver(() => {
      // Observe width only, so setting the measured height cannot create a resize loop.
      const nextWidth = inputRef.current?.clientWidth;
      if (nextWidth !== width) { width = nextWidth; resize(); }
      else sync();
    });
    if (inputRef.current) observer.observe(inputRef.current);
    return () => observer.disconnect();
  }, [inputRef, resize, sync]);
  return <div className={cn("mention-editor relative min-w-0 flex-1 self-center", wrapperClassName)}>
    <div ref={mirrorRef} dir={props.dir} aria-hidden="true" className="mention-editor-mirror pointer-events-none absolute inset-0 overflow-hidden">
      <MentionText text={String(props.value ?? "")} peers={peers} everyone={everyone} />{"\n"}
    </div>
    <textarea {...props} ref={inputRef} onScroll={(event) => { sync(); props.onScroll?.(event); }} />
  </div>;
}
