import { useRef } from "react";

/** Menus open and close in the same frame now. Kept for callers that imported the old timing constant. */
export const MENU_MOTION_MS = 0;

export interface MenuMotion {
  shown: boolean;
  closing: boolean;
  className: string;
  exitProps: { inert?: boolean; "aria-hidden"?: boolean };
}

const MENU_OPEN: MenuMotion = { shown: true, closing: false, className: "", exitProps: {} };
const MENU_CLOSED: MenuMotion = { shown: false, closing: false, className: "", exitProps: {} };

export function useMenuMotion(open: boolean): MenuMotion {
  return open ? MENU_OPEN : MENU_CLOSED;
}

export function useHeldMenuMotion<T>(value: T | null): MenuMotion & { value: T | null } {
  const motion = useMenuMotion(value != null);
  const held = useRef<T | null>(value);
  if (value != null) held.current = value;
  return { ...motion, value: value ?? held.current };
}
