import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { History as HistoryIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { HistoryEntry, Station } from "../lib/types.js";
import { api } from "../lib/api.js";
import { EmptyState } from "../components/EmptyState.js";
import { useAuthStore } from "../stores/auth.js";
import { useViewModeStore } from "../stores/viewMode.js";
import { StationCard } from "../components/StationCard.js";
import { StationListItem } from "../components/StationListItem.js";

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dedupeStations(entries: HistoryEntry[]): Station[] {
  const seen = new Set<string>();
  const out: Station[] = [];
  for (const e of entries) {
    if (seen.has(e.station.id)) continue;
    seen.add(e.station.id);
    out.push(e.station);
  }
  return out;
}

export function History() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const viewMode = useViewModeStore((s) => s.viewMode);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["history"],
    queryFn: () => api.get<{ items: HistoryEntry[] }>("/history"),
    enabled: !!user,
  });

  const clearAll = async (): Promise<void> => {
    try {
      await api.delete<{ ok: true }>("/history");
      toast.success("Historial limpiado");
      void queryClient.invalidateQueries({ queryKey: ["history"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo limpiar el historial");
    }
  };

  const removeStationMutation = useMutation({
    mutationFn: (stationId: string) => api.delete<{ ok: true }>(`/history/${stationId}`),
    onSuccess: () => {
      toast.success("Emisora eliminada del historial");
      void queryClient.invalidateQueries({ queryKey: ["history"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "No se pudo eliminar la emisora");
    },
  });

  const stations = dedupeStations(data?.items ?? []);
  const latest = data?.items[0];

  return (
    <section className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Tu historial</h1>
          <p className="text-sm text-muted">Lo último que has escuchado en la sierra.</p>
        </div>
        {stations.length ? (
          <button
            type="button"
            onClick={() => void clearAll()}
            className="flex items-center gap-1.5 rounded-lg border border-line-strong px-3 py-1.5 text-sm text-soft transition hover:border-pine-500 hover:text-foreground"
          >
            <Trash2 className="size-4" />
            Limpiar
          </button>
        ) : null}
      </div>

      {isLoading ? (
        <p className="py-16 text-center text-sm text-faint">Cargando historial…</p>
      ) : isError ? (
        <EmptyState
          icon={<HistoryIcon className="size-6" />}
          title="No se pudo cargar tu historial"
          description="Hubo un problema al recuperar lo que escuchaste. Inténtalo de nuevo."
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
      ) : data && !data.items.length ? (
        <EmptyState
          icon={<HistoryIcon className="size-6" />}
          title="Todavía no has escuchado nada"
          description="Cuando reproduzcas una emisora, la registraremos aquí."
        />
      ) : latest ? (
        <>
          <div className="flex flex-col gap-2 rounded-2xl border border-line bg-surface-raised p-4">
            <span className="text-xs uppercase tracking-wide text-faint">Última escucha</span>
            <div className="flex items-center gap-3">
              <span className="text-lg font-semibold text-foreground">{latest.station.name}</span>
              <span className="text-sm text-muted">{formatDate(latest.playedAt)}</span>
            </div>
          </div>
          {viewMode === "card" ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {stations.map((station) => (
                <div key={station.id} className="relative">
                  <StationCard station={station} />
                  <button
                    type="button"
                    onClick={() => removeStationMutation.mutate(station.id)}
                    disabled={removeStationMutation.isPending}
                    className="absolute right-14 top-2 z-10 flex size-9 items-center justify-center rounded-full bg-black/40 p-1 text-pine-100 backdrop-blur transition hover:bg-red-500/80 hover:text-white disabled:opacity-50"
                    title="Eliminar del historial"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {stations.map((station) => (
                <li key={station.id} className="flex items-center gap-2 rounded-lg border border-line bg-surface-raised p-2.5">
                  <div className="min-w-0 flex-1">
                    <StationListItem station={station} />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeStationMutation.mutate(station.id)}
                    disabled={removeStationMutation.isPending}
                    className="flex-shrink-0 rounded-lg p-2 text-soft transition hover:bg-red-500/10 hover:text-red-500 disabled:opacity-50"
                    title="Eliminar del historial"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
    </section>
  );
}
