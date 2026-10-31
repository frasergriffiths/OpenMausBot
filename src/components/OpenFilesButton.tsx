import { useStore } from "@/state/store";
import { Button } from "@/components/ui";

/** Opens Files, offering `suggest` (folders on this computer) for sharing. Render it only where cloudFilesBridge() is. */
export function OpenFilesButton({ label, suggest, className }: { label: string; suggest?: string[]; className?: string }) {
  const { dispatch } = useStore();
  return <Button size="sm" variant="ghost" type="button" className={className} onClick={() => dispatch({ type: "showFiles", ...(suggest ? { suggest } : {}) })}>{label}</Button>;
}
