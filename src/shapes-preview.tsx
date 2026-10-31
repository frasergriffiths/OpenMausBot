import { createRoot } from "react-dom/client";
import { MausAvatar } from "@/components/Avatar";
import { MASCOT_BODIES, MASCOT_BODY_IDS } from "../shared/mascot-bodies";
import { MAUS_COLOR_NAMES } from "../shared/wire";
import "./styles.css";

const COLORS = MAUS_COLOR_NAMES;

function App() {
  return (
    <main className="min-h-screen bg-app p-8 text-ink">
      <h1 className="text-[22px] font-semibold tracking-tight">Maus shapes</h1>
      <p className="mt-1 text-[13px] text-ink-secondary">{MASCOT_BODY_IDS.length} bodies · {COLORS.length} colours</p>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
        {MASCOT_BODY_IDS.map((id) => (
          <div key={id} className="flex flex-col items-center gap-2 rounded-2xl border-[0.5px] border-hairline bg-panel p-4">
            <MausAvatar color="green" bodyId={id} size={72} animated={false} trackPointer={false} />
            <div className="text-[12px] font-medium text-ink">{MASCOT_BODIES[id].name}</div>
            <div className="flex gap-1.5">
              {COLORS.slice(0, 5).map((color) => (
                <MausAvatar key={color} color={color} bodyId={id} size={16} animated={false} trackPointer={false} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
