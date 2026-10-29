import type { LocaleKey } from "@/locales";
import type { Message } from "@/state/store";
import { SimpleHelperIntro } from "./SimpleHelperIntro";

export const HELPER_ASK_KEYS: readonly LocaleKey[] = [
  "helperIntro.ask.overview", "helperIntro.ask.inbox", "helperIntro.ask.routine", "helperIntro.ask.howto",
];

interface IntroProps {
  botId: string;
  threadId: string;
  message: Message;
  /** The person wrote after it, or dismissed it: its asks and setup go. */
  answered: boolean;
  /** Its follow-up after the look around (helperFollowup), drawn under it in Simple mode. */
  followup?: Message;
}

/** MausBot's first message: its few short bubbles and follow-up. */
export function HelperIntro(props: IntroProps) {
  return <SimpleHelperIntro {...props} />;
}
