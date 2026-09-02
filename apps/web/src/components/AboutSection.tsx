import { useState } from "react";
import { Info } from "lucide-react";
import { AboutModal } from "./AboutModal.js";

export function AboutSection() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted transition hover:bg-surface-soft hover:text-foreground"
      >
        <Info className="size-4" />
        <span>Acerca de...</span>
      </button>
      <AboutModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
