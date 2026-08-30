import { useQuery } from "@tanstack/react-query";
import { Heart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { FavoriteEntry } from "../lib/types.js";
import { api } from "../lib/api.js";
import { StationCard } from "../components/StationCard.js";
import { EmptyState } from "../components/EmptyState.js";
import { useAuthStore } from "../stores/auth.js";
import { useQueryClient } from "@tanstack/react-query";

export function Favorites() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["favorites"],
    queryFn: () => api.get<{ items: FavoriteEntry[] }>("/favorites"),
    enabled: !!user,
  });

  const clearAll = async (): Promise<void> => {
    const ids = data?.items.map((f) => f.station.id) ?? [];
    try {
      await Promise.all(ids.map((id) => api.delete<{ ok: true }>(`/favorites/${encodeURIComponent(id)}`)));
      toast.success("Favoritos vaciados");
      void queryClient.invalidateQueries({ queryKey: ["favorites"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudieron eliminar los favoritos");
    }
  };

  return (
    <section className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Tus favoritos</h1>
          <p className="text-sm text-muted">Las emisoras que has marcado para escucharlas cuando quieras.</p>
        </div>
        {data?.items.length ? (
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
      ) : !data?.items.length ? (
        <EmptyState
          icon={<Heart className="size-6" />}
          title="Aún no tienes favoritos"
          description="Explora el catálogo y marca las emisoras que más te gusten para encontrarlas aquí."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {data.items.map((f) => (
              <StationCard key={f.station.id} station={f.station} />
            ))}
          </div>
          <p className="text-center text-xs text-faint">
            Pulsa el corazón en cualquier tarjeta para quitarla de favoritos.
          </p>
        </>
      )}
    </section>
  );
}