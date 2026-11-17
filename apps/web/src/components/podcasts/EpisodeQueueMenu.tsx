import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ListEnd, ListPlus, ListStart } from "lucide-react";
import { toast } from "sonner";
import { addEpisodeToQueue } from "../../lib/api.js";

type QueuePosition = "next" | "end";

interface EpisodeQueueMenuProps {
  episodeId: number;
  /** Dirección del desplegable; en la ficha se abre hacia arriba. */
  direction?: "down" | "up";
}

export function EpisodeQueueMenu({ episodeId, direction = "down" }: EpisodeQueueMenuProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent): void {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const mutation = useMutation({
    mutationFn: (position: QueuePosition) => addEpisodeToQueue(episodeId, position),
    onSuccess: (_data, position) => {
      setOpen(false);
      triggerRef.current?.focus();
      toast.success(
        position === "next"
          ? "Se reproducirá a continuación"
          : "Añadido al final de la cola",
      );
      void queryClient.invalidateQueries({ queryKey: ["podcast-queue"] });
      void queryClient.invalidateQueries({ queryKey: ["podcast-queue-count"] });
      void queryClient.invalidateQueries({ queryKey: ["podcast-home"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "No se pudo añadir a la cola");
    },
  });

  const disabled = mutation.isPending;

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Opciones para añadir a la cola"
        title="Añadir a la cola"
        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted transition hover:bg-surface-soft hover:text-foreground disabled:opacity-50"
      >
        <ListPlus className="size-4" />
        <span className="hidden sm:inline">A la cola</span>
        <ChevronDown className="size-3.5" />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Añadir a la cola"
          className={`absolute right-0 z-20 w-52 rounded-xl border border-line bg-surface-raised p-1 shadow-xl shadow-black/30 ${
            direction === "up" ? "bottom-full mb-1" : "top-full mt-1"
          }`}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => mutation.mutate("next")}
            disabled={disabled}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-foreground transition hover:bg-surface-soft disabled:opacity-50"
          >
            <ListStart className="size-4 text-muted" />
            A continuación
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => mutation.mutate("end")}
            disabled={disabled}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-foreground transition hover:bg-surface-soft disabled:opacity-50"
          >
            <ListEnd className="size-4 text-muted" />
            Al final
          </button>
        </div>
      ) : null}
    </div>
  );
}
