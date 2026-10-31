// Providers such as Grok narrate before tools.
import { useEffect, useState } from "react";
import { Check, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui";

export function TurnNarrationRun({
  label,
  title,
  forceOpen = false,
  children,
}: {
  label: string;
  title?: string;
  forceOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(forceOpen);
  useEffect(() => {
    if (forceOpen) setOpen(true);
  }, [forceOpen]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-start">
        <Button size="xs" shape="pill"
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          title={title ?? (open ? "Hide progress messages" : "Show progress messages")}
        >
          <Check size={13} className="text-success" />
          <span>{label}</span>
          <ChevronRight size={13} className={open ? "rotate-90" : undefined} />
        </Button>
      </div>
      {open && children}
    </div>
  );
}
