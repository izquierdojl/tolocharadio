import { LayoutGrid, List } from "lucide-react";
import { useViewModeStore, type ViewMode } from "../stores/viewMode.js";

const TARGET: Record<ViewMode, ViewMode> = { card: "list", list: "card" };

interface ViewModeToggleProps {
  menuItem?: boolean;
  onClose?: () => void;
}

export function ViewModeToggle({ menuItem = false, onClose }: ViewModeToggleProps) {
  const viewMode = useViewModeStore((s) => s.viewMode);
  const setViewMode = useViewModeStore((s) => s.setViewMode);
  const next: ViewMode = TARGET[viewMode];
  const label = next === "list" ? "Cambiar a vista de lista" : "Cambiar a vista de tarjetas";
  const Icon = viewMode === "card" ? List : LayoutGrid;

  if (menuItem) {
    return (
      <button
        type="button"
        onClick={() => {
          setViewMode(next);
          onClose?.();
        }}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted transition hover:bg-surface-soft hover:text-foreground"
      >
        <Icon className="size-4" />
        {viewMode === "card" ? "Vista de lista" : "Vista de tarjetas"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setViewMode(next)}
      title={label}
      aria-label={label}
      className="flex size-8 items-center justify-center rounded-lg text-muted transition hover:bg-surface-soft hover:text-foreground"
    >
      <Icon className="size-4" />
    </button>
  );
}