import { useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, GripVertical, Heart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { FavoriteEntry } from "../lib/types.js";
import { api, reorderFavorites } from "../lib/api.js";
import { StationCard } from "../components/StationCard.js";
import { StationListItem } from "../components/StationListItem.js";
import { EmptyState } from "../components/EmptyState.js";
import { useAuthStore } from "../stores/auth.js";
import { useViewModeStore } from "../stores/viewMode.js";

const FAVORITES_KEY = ["favorites"] as const;

interface ReorderControlsProps {
  index: number;
  total: number;
  name: string;
  onMove: (from: number, to: number) => void;
  onDragStart: (index: number) => void;
}

function ReorderControls({ index, total, name, onMove, onDragStart }: ReorderControlsProps) {
  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        title="Subir"
        aria-label={`Subir ${name}`}
        disabled={index === 0}
        onClick={() => onMove(index, index - 1)}
        className="rounded p-0.5 text-soft transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
      >
        <ChevronUp className="size-4" />
      </button>
      <button
        type="button"
        title="Bajar"
        aria-label={`Bajar ${name}`}
        disabled={index === total - 1}
        onClick={() => onMove(index, index + 1)}
        className="rounded p-0.5 text-soft transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
      >
        <ChevronDown className="size-4" />
      </button>
      <button
        type="button"
        draggable
        title="Arrastrar para reordenar"
        aria-label={`Arrastrar ${name} para reordenar`}
        onDragStart={(e) => {
          onDragStart(index);
          e.dataTransfer.effectAllowed = "move";
        }}
        className="cursor-grab p-0.5 text-faint transition hover:text-foreground active:cursor-grabbing"
      >
        <GripVertical className="size-4" />
      </button>
    </div>
  );
}

export function Favorites() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const viewMode = useViewModeStore((s) => s.viewMode);
  const dragIndex = useRef<number | null>(null);

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

  const move = (from: number, to: number): void => {
    if (to < 0 || to >= total || from === to) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved!);
    commitOrder(next);
  };

  const handleDrop = (to: number): void => {
    const from = dragIndex.current;
    dragIndex.current = null;
    if (from == null || from === to) return;
    move(from, to);
  };

  const dragProps = (index: number) => ({
    onDragOver: (e: React.DragEvent) => e.preventDefault(),
    onDrop: () => handleDrop(index),
  });

  const controls = (index: number) => (
    <ReorderControls
      index={index}
      total={total}
      name={items[index]?.station.name ?? ""}
      onMove={move}
      onDragStart={(i) => {
        dragIndex.current = i;
      }}
    />
  );

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
      ) : viewMode === "card" ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((favorite, index) => (
            <div key={favorite.station.id} {...dragProps(index)}>
                <div className="relative">
                  <div className="absolute left-2 top-2 z-10">
                    <div className="rounded-lg bg-black/50 p-0.5 backdrop-blur">{controls(index)}</div>
                  </div>
                  <StationCard station={favorite.station} />
                </div>
            </div>
          ))}
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((favorite, index) => (
            <li key={favorite.station.id} {...dragProps(index)} className="flex items-center gap-2">
              {controls(index)}
              <div className="min-w-0 flex-1">
                <StationListItem station={favorite.station} />
              </div>
            </li>
          ))}
        </ul>
      )}

      {!isLoading && !isError && total ? (
        <p className="text-center text-xs text-faint">
          Arrastra o usa las flechas para reordenar tus favoritos. Pulsa el corazón en cualquier emisora para
          quitarla de favoritos.
        </p>
      ) : null}
    </section>
  );
}
