import type { SessionModelControls } from "./session-model-controls.ts";

export interface VariantResult {
  variant: string | undefined;
  notice?: string;
}

/** A variant acknowledgement can arrive before its config update; wait briefly for the agent to say what it applied. */
export const VARIANT_CONFIRM_TIMEOUT = 1_500;

const ADVICE = " Pick a different variant, or clear it, in this bot's model settings.";

function label(controls: SessionModelControls, id: string): string {
  try {
    return controls.variant(id).options.find((entry) => entry.id === id)?.label ?? id;
  } catch {
    return id;
  }
}

/** Applies a turn's variant and turns every failure into a notice, so a reply is never blocked by one. */
export async function applySessionVariant(input: {
  displayName: string;
  controls: SessionModelControls;
  wanted: string;
  set: (configId: string, value: string) => Promise<unknown>;
  confirmTimeoutMs: number;
}): Promise<VariantResult> {
  const { displayName, controls, wanted } = input;
  const name = label(controls, wanted);
  let option: ReturnType<SessionModelControls["variant"]> | undefined;
  try {
    option = controls.variant(wanted);
  } catch {
    option = undefined;
  }
  if (!option) {
    return { variant: undefined, notice: displayName + " does not offer the " + name + " reasoning variant for this model,"
      + " so this reply uses the session's current setting." + ADVICE };
  }
  // Register before the request: a response or notification can arrive before it resolves.
  const confirmation = controls.confirmVariant(wanted);
  try {
    await input.set(option.configId, wanted);
    confirmation.arm(input.confirmTimeoutMs);
    const outcome = await confirmation.outcome;
    if (outcome === "mismatch") {
      return { variant: undefined, notice: displayName + " could not apply the " + name + " reasoning variant,"
        + " so this reply uses the session's current setting." + ADVICE };
    }
    // The setter succeeded but the agent sent no config state: trust the acknowledgement, not a stale read.
    if (outcome === "unconfirmed") return { variant: undefined };
    return { variant: wanted };
  } catch {
    confirmation.cancel();
    return { variant: undefined, notice: displayName + " could not set the " + name + " reasoning variant,"
      + " so this reply uses the session's current setting." + ADVICE };
  }
}

/** A late variant change before the prompt is a notice too, never a thrown error. */
export function variantBeforePrompt(input: { displayName: string; controls: SessionModelControls; wanted: string }): VariantResult {
  const { displayName, controls, wanted } = input;
  let current: string | undefined;
  try {
    current = controls.variant(wanted).currentValue;
  } catch {
    current = undefined;
  }
  if (current === wanted) return { variant: wanted };
  const name = label(controls, wanted);
  return { variant: undefined, notice: displayName + " changed the " + name + " reasoning variant before the prompt,"
    + " so this reply uses the session's current setting. Pick a different variant, or clear it,"
    + " in this bot's model settings." };
}
