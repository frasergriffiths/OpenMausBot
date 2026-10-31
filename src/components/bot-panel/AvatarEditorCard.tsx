import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";
import type { LocaleKey } from "@/locales";
import { colorSwatch, MAUS_COLOR_LABEL, MAUS_COLOR_NAMES, PICKABLE_STATES, type MausState } from "@/lib/mascot";
import type { Bot } from "@/state/store";
import { MASCOT_BODIES, MASCOT_BODY_IDS } from "../../../shared/mascot-bodies";
import type { BotBodyId } from "../../../shared/bot-body";
import { MausAvatar } from "../Avatar";
import { RESET_MASCOT_PATCH, useAvatarImage, type AvatarPatch } from "../avatar-editing";

const FACE_KEY: Partial<Record<MausState, LocaleKey>> = {
  idle: "botPanel.face.idle",
  happy: "botPanel.face.happy",
  curious: "botPanel.face.curious",
  drowsy: "botPanel.face.drowsy",
  working: "botPanel.face.working",
  thinking: "botPanel.face.thinking",
  listening: "botPanel.face.listening",
  sleeping: "botPanel.face.sleeping",
  suspicious: "botPanel.face.suspicious",
  proud: "botPanel.face.proud",
};

const faceLabel = (state: MausState) => {
  const key = FACE_KEY[state];
  return key ? t(key) : state;
};

export function AvatarEditorCard({ bot, activeState, onPatch, onClose }: {
  bot: Bot;
  activeState: MausState;
  onPatch: (patch: AvatarPatch) => void;
  onClose: () => void;
}) {
  const image = useAvatarImage(bot, onPatch);
  const { crop, busy, error } = image;
  const showsImage = crop !== "mascot" && Boolean(bot.avatarUrl);
  const cardRef = useRef<HTMLDivElement>(null);
  // The card is a dialog: focus moves into it so Escape and Tab work from the start.
  useEffect(() => {
    cardRef.current?.querySelector<HTMLElement>("button:not([disabled])")?.focus();
  }, []);
  const pickMascot = (patch: AvatarPatch) => onPatch(crop === "mascot" ? patch : { ...patch, avatarCrop: "mascot" });
  const body = bot.mascotBody ?? "cursor";
  const [moreLooks, setMoreLooks] = useState(() => Boolean(bot.mascotExpression && bot.mascotExpression !== "idle"));
  const bodyButton = (id: BotBodyId, name: string) => (
    <button
      key={id}
      type="button"
      disabled={busy}
      aria-pressed={!showsImage && body === id}
      aria-label={`Use the ${name} body`}
      title={name}
      onClick={() => pickMascot({ mascotBody: id })}
      className={cn(
        "flex h-[58px] items-center justify-center rounded-xl disabled:opacity-50",
        !showsImage && body === id ? "bg-ink/[0.08] ring-[1.5px] ring-inset ring-ink/25" : "hover:bg-ink/[0.05]",
      )}
    >
      <MausAvatar color={bot.color} bodyId={id} size={40} animated={false} trackPointer={false} />
    </button>
  );

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    onClose();
  };

  return (
    <div
      ref={cardRef}
      role="dialog"
      aria-label={t("botPanel.avatar.edit")}
      data-panel-avatar-editor
      onKeyDown={onKeyDown}
      className="popover-surface absolute inset-x-[-5px] top-[80px] z-30 overflow-hidden rounded-2xl border border-ink/[0.08] bg-menu text-left shadow-2xl shadow-black/50"
    >
      <div className="flex items-center gap-2 border-b border-ink/[0.06] p-2">
        <span className="px-[11px] py-[5px] text-[13px] font-medium text-ink">{t("botPanel.avatar.tabBot")}</span>
        <button
          type="button"
          data-avatar-reset
          disabled={busy}
          onClick={() => onPatch(RESET_MASCOT_PATCH)}
          className="ml-auto rounded-lg px-[11px] py-[5px] text-[13px] text-ink-secondary hover:text-ink disabled:opacity-50"
        >
          {t("botPanel.avatar.reset")}
        </button>
      </div>

      <div className="p-3">
        <>
            <div className="grid grid-cols-5 gap-1.5">
              {MASCOT_BODY_IDS.map((id) => bodyButton(id, MASCOT_BODIES[id].name))}
            </div>
            <div className="flex flex-wrap justify-center gap-2 px-1 pb-1 pt-3.5">
              {MAUS_COLOR_NAMES.map((color) => (
                <button
                  key={color}
                  type="button"
                  disabled={busy}
                  aria-pressed={bot.color === color}
                  aria-label={`Use ${color} mascot color`}
                  title={t(MAUS_COLOR_LABEL[color])}
                  onClick={() => pickMascot({ color })}
                  className={cn(
                    "size-6 rounded-full disabled:opacity-50",
                    bot.color === color && "ring-2 ring-ink/80 ring-offset-2 ring-offset-menu",
                  )}
                  style={{ background: colorSwatch(color) }}
                />
              ))}
            </div>
            <button
              type="button"
              data-avatar-more
              aria-expanded={moreLooks}
              onClick={() => setMoreLooks((open) => !open)}
              className="mx-auto mt-2.5 flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] text-ink-secondary hover:bg-ink/[0.04] hover:text-ink"
            >
              {t("botPanel.avatar.more")}
              <ChevronDown size={13} aria-hidden="true" className={cn("transition-transform", moreLooks && "rotate-180")} />
            </button>
            {moreLooks && (
              <div data-avatar-more-looks>
                <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2.5" role="group" aria-label={t("botPanel.avatar.face")}>
                  <span className="mr-0.5 text-[12px] text-ink-tertiary">{t("botPanel.avatar.face")}</span>
                  {PICKABLE_STATES.map((expression) => (
                    <button
                      key={expression}
                      type="button"
                      disabled={busy}
                      data-avatar-face={expression}
                      aria-pressed={activeState === expression}
                      onClick={() => pickMascot({ mascotExpression: expression })}
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[12px] disabled:opacity-50",
                        activeState === expression ? "bg-ink/[0.15] text-ink" : "bg-ink/[0.04] text-ink-secondary hover:text-ink",
                      )}
                    >
                      {faceLabel(expression)}
                    </button>
                  ))}
                </div>
              </div>
            )}
        </>

        {error && <div role="alert" className="mt-3 text-[12px] text-danger">{error}</div>}
      </div>
    </div>
  );
}
