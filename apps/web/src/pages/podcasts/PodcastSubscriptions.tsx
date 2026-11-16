import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Compass, Download, Rss } from "lucide-react";
import { toast } from "sonner";
import {
  fetchPodcastOpml,
  fetchPodcastSubscriptions,
  unsubscribePodcast,
} from "../../lib/api.js";
import { PodcastList } from "../../components/podcasts/PodcastList.js";
import { EmptyState } from "../../components/EmptyState.js";

export function PodcastSubscriptions() {
  const queryClient = useQueryClient();
  const subscriptionsQuery = useQuery({
    queryKey: ["podcast-subscriptions"],
    queryFn: fetchPodcastSubscriptions,
  });

  const unsubscribeMutation = useMutation({
    mutationFn: (podcastId: number) => unsubscribePodcast(podcastId),
    onSuccess: () => {
      toast.success("Suscripción cancelada");
      void queryClient.invalidateQueries({ queryKey: ["podcast-subscriptions"] });
      void queryClient.invalidateQueries({ queryKey: ["podcast-home"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "No se pudo cancelar la suscripción");
    },
  });

  const exportMutation = useMutation({
    mutationFn: fetchPodcastOpml,
    onSuccess: (xml) => {
      const blob = new Blob([xml], { type: "text/x-opml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "tolocharadio-podcasts.opml";
      anchor.click();
      URL.revokeObjectURL(url);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "No se pudo exportar el OPML");
    },
  });

  const items = subscriptionsQuery.data?.items ?? [];

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Tus podcasts</h1>
          <p className="text-sm text-muted">
            {items.length} {items.length === 1 ? "suscripción" : "suscripciones"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/podcasts/descubrir"
            className="inline-flex items-center gap-1.5 rounded-lg bg-pine-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-pine-500"
          >
            <Compass className="size-4" />
            Descubrir
          </Link>
          <button
            type="button"
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending || items.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-3 py-1.5 text-sm text-foreground transition hover:border-pine-500 disabled:opacity-50"
          >
            <Download className="size-4" />
            Exportar OPML
          </button>
        </div>
      </div>

      {subscriptionsQuery.isLoading ? (
        <p className="py-10 text-center text-faint">Cargando suscripciones…</p>
      ) : subscriptionsQuery.isError ? (
        <p className="text-sm text-rose-400">
          {subscriptionsQuery.error instanceof Error
            ? subscriptionsQuery.error.message
            : "No se pudieron cargar las suscripciones"}
        </p>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Rss className="size-7" />}
          title="Sin suscripciones"
          description="Busca podcasts en el directorio o añade un feed RSS para seguirlos aquí."
          action={
            <Link
              to="/podcasts/descubrir"
              className="inline-flex items-center gap-2 rounded-lg bg-pine-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-pine-500"
            >
              <Compass className="size-4" />
              Descubrir podcasts
            </Link>
          }
        />
      ) : (
        <PodcastList
          podcasts={items}
          renderAction={(podcast) => (
            <button
              type="button"
              onClick={() => unsubscribeMutation.mutate(podcast.id)}
              disabled={unsubscribeMutation.isPending}
              className="rounded-lg px-2 py-1 text-[10px] uppercase tracking-wide text-muted transition hover:bg-surface-soft hover:text-rose-400 disabled:opacity-50"
            >
              Cancelar
            </button>
          )}
        />
      )}
    </section>
  );
}
