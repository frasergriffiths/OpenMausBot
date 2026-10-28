import { t } from "@/lib/i18n";
import type { LocaleKey } from "@/locales";
import { BOT_CHATS_SECTION_ID, BOTS_SECTION_ID, CHANNELS_SECTION_ID, PINNED_SECTION_ID, sidebarSectionLabel } from "@/lib/sidebar-layout";

const SECTION_LABEL_KEYS: Record<string, LocaleKey> = {
  [PINNED_SECTION_ID]: "sidebar.section.pinned",
  [CHANNELS_SECTION_ID]: "sidebar.section.channels",
  [BOT_CHATS_SECTION_ID]: "sidebar.section.botChats",
  [BOTS_SECTION_ID]: "sidebar.section.bots",
};

export function sectionLabel(id: string): string {
  const key = SECTION_LABEL_KEYS[id];
  return key ? t(key) : sidebarSectionLabel(id);
}
