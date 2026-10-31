/** Threads are gone: one conversation per bot. The stored key is left alone so
 * an older install that still has one does not throw while it is read. */
export const SHOW_THREADS_KEY = "omb-show-threads";

export function setShowThreads(_enabled: boolean): void {}

/** Threads are gone: one conversation per bot, so nothing may turn them back on.
 * The stored preference is read only so an older install does not throw. */
export function useShowThreadsChoice(): boolean {
  return false;
}

export function useShowThreads(): boolean {
  return useShowThreadsChoice();
}
