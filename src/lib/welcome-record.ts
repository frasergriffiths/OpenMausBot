/** The first-run screen records that its email question was answered, so the welcome does not return. */
const GATE_KEY = "omb-email-gate";

export function emailGateDone(): boolean {
  try {
    return Boolean(localStorage.getItem(GATE_KEY));
  } catch {
    return false;
  }
}

export function setEmailGateDone(status: "submitted" | "skipped") {
  try {
    localStorage.setItem(GATE_KEY, status);
  } catch {}
}
