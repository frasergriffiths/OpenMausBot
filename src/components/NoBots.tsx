import { Plus } from "lucide-react";

import { Button } from "@/components/ui";
import { t } from "@/lib/i18n";
import { MausAvatar } from "./Avatar";
import { MASCOT_BODY_IDS } from "../../shared/mascot-bodies";
import { MAUS_COLOR_NAMES } from "../../shared/wire";

/** Where each shape sits, in percent of the pane, and how long it takes to drift. */
const SPOTS = [
  { left: 12, top: 22, delay: 0, duration: 9, size: 64 },
  { left: 30, top: 62, delay: 1.4, duration: 11, size: 48 },
  { left: 47, top: 18, delay: 0.6, duration: 10, size: 82 },
  { left: 66, top: 58, delay: 2.1, duration: 12, size: 52 },
  { left: 84, top: 26, delay: 1.1, duration: 9.5, size: 66 },
  { left: 8, top: 74, delay: 2.6, duration: 10.5, size: 40 },
  { left: 39, top: 40, delay: 1.8, duration: 13, size: 36 },
  { left: 74, top: 76, delay: 0.3, duration: 11.5, size: 44 },
  { left: 58, top: 34, delay: 2.9, duration: 10, size: 30 },
];

/** The app with no bots at all: the shapes a bot can wear, drifting about, and one way forward. */
export function NoBots({ onNew }: { onNew: () => void }) {
  return (
    <main data-no-bots className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-app text-ink">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {MASCOT_BODY_IDS.map((id, index) => {
          const spot = SPOTS[index % SPOTS.length]!;
          return (
            <span
              key={id}
              data-mascot={id}
              className="mascot-drift absolute"
              style={{
                left: `${spot.left}%`,
                top: `${spot.top}%`,
                animation: `mascot-drift ${spot.duration}s ease-in-out -${spot.delay}s infinite`,
              }}
            >
              <MausAvatar
                color={MAUS_COLOR_NAMES[index % MAUS_COLOR_NAMES.length] ?? "green"}
                bodyId={id}
                size={spot.size}
                animated
                trackPointer
              />
            </span>
          );
        })}
      </div>
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
        <h1 className="text-[22px] font-semibold tracking-[-0.01em]">{t("noBots.title")}</h1>
        <Button variant="primary" size="md" type="button" onClick={onNew}>
          <Plus size={15} aria-hidden="true" />
          {t("noBots.new")}
        </Button>
      </div>
    </main>
  );
}

