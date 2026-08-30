import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Radio, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import type { Station } from "../lib/types.js";
import { createCustomStation, deleteCustomStation, fetchCustomStations } from "../lib/api.js";
import { EmptyState } from "../components/EmptyState.js";
import { StationCard } from "../components/StationCard.js";
import { StationListItem } from "../components/StationListItem.js";
import { useViewModeStore } from "../stores/viewMode.js";

export function CustomStations() {
  const queryClient = useQueryClient();
  const viewMode = useViewModeStore((s) => s.viewMode);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["custom-stations"],
    queryFn: fetchCustomStations,
  });

  const createMutation = useMutation({
    mutationFn: ({ name, url }: { name: string; url: string }) => createCustomStation(name, url),
    onSuccess: () => {
      setName("");
      setUrl("");
      setError(null);
      toast.success("Emisora personalizada añadida");
      void queryClient.invalidateQueries({ queryKey: ["custom-stations"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "No se pudo añadir la emisora");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCustomStation(id),
    onSuccess: () => {
      toast.success("Emisora eliminada");
      void queryClient.invalidateQueries({ queryKey: ["custom-stations"] });
      void queryClient.invalidateQueries({ queryKey: ["favorites"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar la emisora");
    },
  });

  const submit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedUrl = url.trim();
    if (!trimmedName) {
      setError("Escribe un nombre para la emisora.");
      return;
    }
    let parsed: URL;
    try {
      parsed = new URL(trimmedUrl);
    } catch {
      setError("La URL del stream no es válida.");
      return;
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      setError("La URL debe empezar por http:// o https://.");
      return;
    }
    setError(null);
    createMutation.mutate({ name: trimmedName, url: trimmedUrl });
  };

  const items: Station[] = data?.items ?? [];

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Mis emisoras</h1>
        <p className="text-sm text-muted">Añade emisoras que no están en el catálogo para escucharlas desde el reproductor.</p>
      </div>

      <form
        onSubmit={submit}
        className="flex flex-col gap-3 rounded-2xl border border-line bg-surface-raised p-4 lg:flex-row lg:items-start"
      >
        <label className="flex-1">
          <span className="mb-1 block text-xs font-medium text-soft">Nombre</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre de la emisora"
            className="w-full rounded-lg border border-line-strong bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-faint focus:border-pine-500 focus:outline-none"
          />
        </label>
        <label className="flex-[2]">
          <span className="mb-1 block text-xs font-medium text-soft">URL del stream</span>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://stream.ejemplo.org/live.mp3"
            className="w-full rounded-lg border border-line-strong bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-faint focus:border-pine-500 focus:outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="mt-6 flex items-center justify-center gap-2 rounded-lg bg-pine-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-pine-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {createMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Añadir
        </button>
        {error ? <p className="mt-1 text-xs text-ochre-400">{error}</p> : null}
      </form>

      {isLoading ? (
        <p className="py-16 text-center text-sm text-faint">Cargando tus emisoras…</p>
      ) : isError ? (
        <EmptyState
          icon={<Radio className="size-6" />}
          title="No se pudieron cargar tus emisoras"
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
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Radio className="size-6" />}
          title="Aún no tienes emisoras personalizadas"
          description="Añade arriba una emisora con su nombre y la URL de su stream. Se mostrará con el emblema de TolochaRadio."
        />
      ) : viewMode === "card" ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((station) => (
            <div key={station.id} className="relative">
              <StationCard station={station} />
              <button
                type="button"
                onClick={() => deleteMutation.mutate(station.id)}
                disabled={deleteMutation.isPending}
                title="Eliminar emisora"
                aria-label={`Eliminar ${station.name}`}
                className="absolute bottom-2 right-2 flex size-9 items-center justify-center rounded-full bg-black/50 text-pine-100 backdrop-blur transition hover:bg-red-600 hover:text-white"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((station) => (
            <li key={station.id} className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <StationListItem station={station} />
              </div>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(station.id)}
                disabled={deleteMutation.isPending}
                title="Eliminar emisora"
                aria-label={`Eliminar ${station.name}`}
                className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-line-strong text-soft transition hover:border-red-500 hover:text-red-400"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {!isLoading && !isError && items.length ? (
        <p className="text-center text-xs text-faint">
          Tus emisoras personalizadas usan el emblema de TolochaRadio al no disponer de imagen propia.
        </p>
      ) : null}
    </section>
  );
}
