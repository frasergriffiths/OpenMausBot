import { useSyncExternalStore } from "react";

export type BusySendMode = "queue" | "steer";

export const BUSY_SEND_KEY = "omb-busy-send";

let sessionChoice: BusySendMode | undefined;
const listeners = new Set<() => void>();

function storage(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

export function parseBusySendMode(value: string | null | undefined): BusySendMode {
  return value === "steer" ? "steer" : "queue";
}

export function loadBusySendMode(storage?: Pick<Storage, "getItem"> | null): BusySendMode {
  try {
    const target = storage === undefined ? (globalThis.localStorage ?? null) : storage;
    return parseBusySendMode(target?.getItem(BUSY_SEND_KEY));
  } catch {
    return "queue";
  }
}

export function saveBusySendMode(mode: BusySendMode, storage?: Pick<Storage, "setItem"> | null): void {
  try {
    const target = storage === undefined ? (globalThis.localStorage ?? null) : storage;
    target?.setItem(BUSY_SEND_KEY, mode);
  } catch {
  }
}

function currentBusySendMode(): BusySendMode {
  return sessionChoice ?? loadBusySendMode();
}

function notify() {
  for (const listener of listeners) listener();
}

function onStorage(event: StorageEvent) {
  if (event.key !== BUSY_SEND_KEY && event.key !== null) return;
  if (event.storageArea && event.storageArea !== storage()) return;
  sessionChoice = undefined;
  notify();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1 && typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}

export function setBusySendMode(mode: BusySendMode): void {
  sessionChoice = mode;
  saveBusySendMode(mode);
  notify();
}

export function useBusySendMode(): BusySendMode {
  return useSyncExternalStore(subscribe, currentBusySendMode, () => "queue");
}
