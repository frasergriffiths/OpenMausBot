import { useEffect, useRef } from "react";

import { usePageVisible } from "@/lib/page-visible";

/** An interval that only runs while the window is visible; it resumes when the person comes back. */
export function useVisibleInterval(callback: () => void, delay: number, enabled = true) {
  const latest = useRef(callback);
  latest.current = callback;
  const visible = usePageVisible();
  useEffect(() => {
    if (!enabled || !visible) return;
    latest.current();
    const timer = setInterval(() => latest.current(), delay);
    return () => clearInterval(timer);
  }, [delay, enabled, visible]);
}
