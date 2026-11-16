import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Compass, ListMusic, Podcast as PodcastIcon, Rss } from "lucide-react";
import { toast } from "sonner";
import { dismissPodcastEpisode, fetchPodcastHome } from "../../lib/api.js";
import { EpisodeRow } from "../../components/podcasts/EpisodeRow.js";
import { PodcastList } from "../../components/podcasts/PodcastList.js";
import { usePodcastSummaries } from "../../components/podcasts/usePodcastSummaries.js";
import { EmptyState } from "../../components/EmptyState.js";
import { useViewModeStore } from "../../stores/viewMode.js";

export function PodcastHome() {
  const queryClient = useQueryClient();
  const viewMode = useViewModeStore((s) => s.viewMode);
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["podcast-home"],
    queryFn: fetchPodcastHome,
  });
  const podcastMap = usePodcastSummaries(
    data?.continueListening.map((episode) => episode.podcastId) ?? [],
    data?.subscriptions ?? [],
  );

  const dismissMutation = useMutation({
    mutationFn: (episodeId: number) => dismissPodcastEpisode(episodeId),
    onSuccess: () => {
      toast.success("Episodio descartado");
      void queryClient.invalidateQueries({ queryKey: ["podcast-home"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "No se pudo descartar el episodio");
    },
  });

  const episodesContainerClass =
    viewMode === "list" ? "flex flex-col gap-2" : "grid gap-2 xl:grid-cols-2";

  const linkButton =
    "inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-3 py-1.5 text-sm text-foreground transition hover:border-pine-500 hover:bg-surface-soft";

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Podcasts</h1>
          <p className="text-sm text-muted">Tus suscripciones, novedades y lo que dejaste a medias.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/podcasts/descubrir" className={linkButton}>
            <Compass className="size-4" />
            Descubrir
          </Link>
          <Link to="/podcasts/cola" className={linkButton}>
            <ListMusic className="size-4" />
            Cola
          </Link>
        </div>
      </div>

      {isLoading ? (
        <p className="py-10 text-center text-faint">Cargando podcasts…</p>
      ) : isError ? (
        <EmptyState
          icon={<PodcastIcon className="size-7" />}
          title="No se pudo cargar la portada de podcasts"
          description={error instanceof Error ? error.message : "Inténtalo de nuevo en unos segundos."}
        />
      ) : !data ? null : data.subscriptions.length === 0 &&
        data.latestEpisodes.length === 0 &&
        data.continueListening.length === 0 ? (
        <EmptyState
          icon={<Rss className="size-7" />}
          title="Aún no sigues ningún podcast"
          description="Busca podcasts por nombre o añade una URL RSS para empezar tu biblioteca."
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
        <>
          {data.continueListening.length > 0 ? (
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold text-foreground">Continuar escuchando</h2>
              <div className={episodesContainerClass}>
                {data.continueListening.map((episode) => {
                  const podcast = podcastMap.get(episode.podcastId);
                  return podcast ? (
                    <EpisodeRow
                      key={episode.id}
                      episode={episode}
                      podcast={podcast}
                      showPodcast
                      onDismiss={() => dismissMutation.mutate(episode.id)}
                    />
                  ) : null;
                })}
              </div>
            </section>
          ) : null}

          {data.latestEpisodes.length > 0 ? (
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold text-foreground">Novedades de tus suscripciones</h2>
              <div className={episodesContainerClass}>
                {data.latestEpisodes.map((episode) => {
                  const podcast = data.subscriptions.find((p) => p.id === episode.podcastId);
                  return podcast ? (
                    <EpisodeRow key={episode.id} episode={episode} podcast={podcast} showPodcast />
                  ) : null;
                })}
              </div>
            </section>
          ) : null}

          {data.subscriptions.length > 0 ? (
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Tus podcasts</h2>
                <Link to="/podcasts/suscripciones" className="text-sm text-ochre-300 hover:underline">
                  Ver todos
                </Link>
              </div>
              <PodcastList podcasts={data.subscriptions.slice(0, 8)} />
            </section>
          ) : null}
        </>
      )}
    </section>
  );
}
