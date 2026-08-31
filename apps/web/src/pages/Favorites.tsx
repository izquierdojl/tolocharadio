import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { FavoriteEntry } from "../lib/types.js";
import { api, reorderFavorites } from "../lib/api.js";
import { StationCard } from "../components/StationCard.js";
import { StationListItem } from "../components/StationListItem.js";
import { EmptyState } from "../components/EmptyState.js";
import { useAuthStore } from "../stores/auth.js";
import { useViewModeStore } from "../stores/viewMode.js";

const FAVORITES_KEY = ["favorites"] as const;

interface SortableCardProps {
  id: string;
  station: FavoriteEntry["station"];
}

function SortableCard({ id, station }: SortableCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <StationCard station={station} />
    </div>
  );
}

interface SortableListItemProps {
  id: string;
  station: FavoriteEntry["station"];
}

function SortableListItem({ id, station }: SortableListItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <li ref={setNodeRef} style={style} className="flex items-center gap-2" {...attributes} {...listeners}>
      <div className="min-w-0 flex-1">
        <StationListItem station={station} />
      </div>
    </li>
  );
}

export function Favorites() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const viewMode = useViewModeStore((s) => s.viewMode);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
  );

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["favorites"],
    queryFn: () => api.get<{ items: FavoriteEntry[] }>("/favorites"),
    enabled: !!user,
  });

  const items = data?.items ?? [];
  const total = items.length;

  const clearAll = async (): Promise<void> => {
    const ids = items.map((f) => f.station.id);
    try {
      await Promise.all(ids.map((id) => api.delete<{ ok: true }>(`/favorites/${encodeURIComponent(id)}`)));
      toast.success("Favoritos vaciados");
      void queryClient.invalidateQueries({ queryKey: ["favorites"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudieron eliminar los favoritos");
    }
  };

  const commitOrder = (next: FavoriteEntry[]): void => {
    const key = [...FAVORITES_KEY] as const;
    const prev = queryClient.getQueryData<{ items: FavoriteEntry[] }>(key);
    if (prev) {
      queryClient.setQueryData(key, { ...prev, items: next });
    }
    reorderFavorites(next.map((f) => f.station.id))
      .then(() => void queryClient.invalidateQueries({ queryKey: ["favorites"] }))
      .catch((err) => {
        if (prev) queryClient.setQueryData(key, prev);
        toast.error(err instanceof Error ? err.message : "No se pudo guardar el orden de los favoritos");
      });
  };

  const handleDragStart = (event: DragStartEvent): void => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent): void => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((f) => f.station.id === active.id);
    const newIndex = items.findIndex((f) => f.station.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const next = arrayMove(items, oldIndex, newIndex);
    commitOrder(next);
  };

  const activeItem = activeId ? items.find((f) => f.station.id === activeId) : null;
  const ids = items.map((f) => f.station.id);

  return (
    <section className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Tus favoritos</h1>
          <p className="text-sm text-muted">Las emisoras que has marcado para escucharlas cuando quieras.</p>
        </div>
        {total ? (
          <button
            type="button"
            onClick={() => void clearAll()}
            className="flex items-center gap-1.5 rounded-lg border border-line-strong px-3 py-1.5 text-sm text-soft transition hover:border-pine-500 hover:text-foreground"
          >
            <Trash2 className="size-4" />
            Vaciar
          </button>
        ) : null}
      </div>

      {isLoading ? (
        <p className="py-16 text-center text-sm text-faint">Cargando favoritos…</p>
      ) : isError ? (
        <EmptyState
          icon={<Heart className="size-6" />}
          title="No se pudieron cargar tus favoritos"
          description="Hubo un problema al recuperar tu lista. Inténtalo de nuevo."
          action={
            <button
              type="button"
              onClick={() => void refetch()}
              className="rounded-lg bg-ochre-500 px-4 py-2 text-sm font-medium text-pine-950 hover:bg-ochre-400"
            >
              Reintentar
            </button>
          }
        />
      ) : !total ? (
        <EmptyState
          icon={<Heart className="size-6" />}
          title="Aún no tienes favoritos"
          description="Explora el catálogo y marca las emisoras que más te gusten para encontrarlas aquí."
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={ids} strategy={viewMode === "card" ? rectSortingStrategy : verticalListSortingStrategy}>
            {viewMode === "card" ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {items.map((favorite) => (
                  <SortableCard
                    key={favorite.station.id}
                    id={favorite.station.id}
                    station={favorite.station}
                  />
                ))}
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {items.map((favorite) => (
                  <SortableListItem
                    key={favorite.station.id}
                    id={favorite.station.id}
                    station={favorite.station}
                  />
                ))}
              </ul>
            )}
          </SortableContext>
          <DragOverlay>
            {activeItem ? (
              viewMode === "card" ? (
                <div className="opacity-90">
                  <StationCard station={activeItem.station} />
                </div>
              ) : (
                <div className="opacity-90">
                  <StationListItem station={activeItem.station} />
                </div>
              )
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {!isLoading && !isError && total ? (
        <p className="text-center text-xs text-faint">
          Arrastra una emisora para reordenar tus favoritos. Pulsa el corazón en cualquier emisora para
          quitarla de favoritos.
        </p>
      ) : null}
    </section>
  );
}
