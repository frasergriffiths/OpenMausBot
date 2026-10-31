import { Plus } from "lucide-react";

import { Button } from "@/components/ui";
import { t } from "@/lib/i18n";
import { MausAvatar } from "./Avatar";
import { MASCOT_BODIES, MASCOT_BODY_IDS } from "../../shared/mascot-bodies";
import { MAUS_COLOR_NAMES } from "../../shared/wire";

/** The app with no bots at all: a gallery of the shapes a bot can wear, and the one way forward. */
export function NoBots({ onNew }: { onNew: () => void }) {
  return (
    <main data-no-bots className="relative flex h-full min-w-0 flex-1 flex-col overflow-y-auto bg-app px-6 py-10 text-ink">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 text-center">
        <div className="flex flex-col gap-2">
          <h1 className="text-[22px] font-semibold tracking-[-0.01em]">{t("noBots.title")}</h1>
          <p className="max-w-md text-[13px] leading-relaxed text-ink-secondary">{t("noBots.body")}</p>
        </div>
        <div className="grid w-full grid-cols-3 gap-3 sm:grid-cols-5">
          {MASCOT_BODY_IDS.map((id, index) => (
            <div
              key={id}
              data-mascot={id}
              className="flex flex-col items-center gap-2 rounded-2xl border-[0.5px] border-hairline/60 bg-panel px-2 py-3"
            >
              <MausAvatar
                color={MAUS_COLOR_NAMES[index % MAUS_COLOR_NAMES.length] ?? "green"}
                bodyId={id}
                size={56}
                animated={false}
                trackPointer={false}
              />
              <span className="text-[11px] font-medium text-ink-secondary">{MASCOT_BODIES[id].name}</span>
            </div>
          ))}
        </div>
        <Button variant="primary" size="md" type="button" onClick={onNew}>
          <Plus size={15} aria-hidden="true" />
          {t("noBots.new")}
        </Button>
      </div>
    </main>
  );
}

