import { LayoutGrid, List } from "lucide-react";
import { useViewModeStore, type ViewMode } from "../stores/viewMode.js";

const TARGET: Record<ViewMode, ViewMode> = { card: "list", list: "card" };

export function ViewModeToggle() {
  const viewMode = useViewModeStore((s) => s.viewMode);
  const setViewMode = useViewModeStore((s) => s.setViewMode);
  const next: ViewMode = TARGET[viewMode];
  const label = next === "list" ? "Cambiar a vista de lista" : "Cambiar a vista de tarjetas";
  const Icon = viewMode === "card" ? List : LayoutGrid;

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