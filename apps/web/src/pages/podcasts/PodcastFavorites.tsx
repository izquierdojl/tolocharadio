import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowLeft, Heart } from "lucide-react";
import { fetchPodcastFavorites } from "../../lib/api.js";
import { EpisodeRow } from "../../components/podcasts/EpisodeRow.js";
import { usePodcastSummaries } from "../../components/podcasts/usePodcastSummaries.js";
import { EmptyState } from "../../components/EmptyState.js";

export function PodcastFavorites() {
  const favoritesQuery = useQuery({
    queryKey: ["podcast-favorites"],
    queryFn: fetchPodcastFavorites,
  });
  const items = favoritesQuery.data?.items ?? [];
  const podcasts = usePodcastSummaries(items.map((episode) => episode.podcastId));

  return (
    <section className="flex flex-col gap-6">
      <div>
        <Link
          to="/podcasts"
          className="mb-1 inline-flex items-center gap-1 text-sm text-muted transition hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Podcasts
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Episodios favoritos</h1>
        <p className="text-sm text-muted">Los episodios de podcast que has guardado.</p>
      </div>

      {favoritesQuery.isLoading ? (
        <p className="py-10 text-center text-faint">Cargando favoritos…</p>
      ) : favoritesQuery.isError ? (
        <p className="text-sm text-rose-400">
          {favoritesQuery.error instanceof Error
            ? favoritesQuery.error.message
            : "No se pudieron cargar los favoritos"}
        </p>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Heart className="size-7" />}
          title="Sin episodios favoritos"
          description="Marca episodios con el corazón desde cualquier podcast para encontrarlos aquí."
          action={
            <Link
              to="/podcasts/descubrir"
              className="inline-flex items-center gap-2 rounded-lg bg-pine-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-pine-500"
            >
              Descubrir podcasts
            </Link>
          }
        />
      ) : (
        <div className="grid gap-2 xl:grid-cols-2">
          {items.map((episode) => {
            const podcast = podcasts.get(episode.podcastId);
            return podcast ? (
              <EpisodeRow key={episode.id} episode={episode} podcast={podcast} showPodcast />
            ) : null;
          })}
        </div>
      )}
    </section>
  );
}
