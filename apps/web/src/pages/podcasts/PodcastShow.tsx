import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, Loader2, Rss } from "lucide-react";
import { toast } from "sonner";
import {
  fetchPodcast,
  fetchPodcastEpisodes,
  subscribePodcast,
  unsubscribePodcast,
} from "../../lib/api.js";
import { ConfirmDialog } from "../../components/ConfirmDialog.js";
import { EpisodeRow } from "../../components/podcasts/EpisodeRow.js";
import { PodcastCover } from "../../components/podcasts/PodcastCover.js";
import { SearchInput } from "../../components/SearchInput.js";

const PAGE_SIZE = 20;

const FILTERS = [
  { value: "all", label: "Todos" },
  { value: "unplayed", label: "Sin empezar" },
  { value: "in_progress", label: "En progreso" },
  { value: "completed", label: "Completados" },
] as const;

const SORTS = [
  { value: "recent", label: "Más recientes" },
  { value: "title", label: "Título" },
  { value: "duration", label: "Duración" },
] as const;

export function PodcastShow() {
  const { podcastId: rawPodcastId } = useParams<{ podcastId: string }>();
  const podcastId = Number(rawPodcastId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["value"]>("all");
  const [sort, setSort] = useState<(typeof SORTS)[number]["value"]>("recent");
  const [searchTerm, setSearchTerm] = useState("");
  const [offset, setOffset] = useState(0);
  const [confirmUnsubscribeOpen, setConfirmUnsubscribeOpen] = useState(false);

  const podcastQuery = useQuery({
    queryKey: ["podcast", podcastId],
    queryFn: () => fetchPodcast(podcastId),
    enabled: Number.isSafeInteger(podcastId) && podcastId > 0,
    staleTime: 5 * 60_000,
  });

  const episodesQuery = useQuery({
    queryKey: ["podcast-episodes", podcastId, filter, sort, searchTerm, offset],
    queryFn: () =>
      fetchPodcastEpisodes(podcastId, {
        filter,
        sort,
        q: searchTerm.trim() || undefined,
        offset,
        limit: PAGE_SIZE,
      }),
    enabled: Number.isSafeInteger(podcastId) && podcastId > 0,
    placeholderData: keepPreviousData,
  });

  const subscribeMutation = useMutation({
    mutationFn: async (subscribed: boolean) => {
      if (subscribed) {
        await unsubscribePodcast(podcastId);
      } else {
        await subscribePodcast({ podcastId });
      }
    },
    onSuccess: (_data, subscribed) => {
      toast.success(subscribed ? "Suscripción cancelada" : "Suscripción añadida");
      void queryClient.invalidateQueries({ queryKey: ["podcast", podcastId] });
      void queryClient.invalidateQueries({ queryKey: ["podcast-subscriptions"] });
      void queryClient.invalidateQueries({ queryKey: ["podcast-home"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "No se pudo actualizar la suscripción");
    },
    onSettled: () => setConfirmUnsubscribeOpen(false),
  });

  if (!Number.isSafeInteger(podcastId) || podcastId <= 0) {
    return <p className="text-sm text-rose-400">El podcast indicado no es válido.</p>;
  }

  if (podcastQuery.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-faint">
        <Loader2 className="mr-2 size-5 animate-spin" /> Cargando podcast…
      </div>
    );
  }

  if (podcastQuery.isError || !podcastQuery.data) {
    return (
      <p className="text-sm text-rose-400">
        {podcastQuery.error instanceof Error
          ? podcastQuery.error.message
          : "No se pudo cargar el podcast"}
      </p>
    );
  }

  const podcast = podcastQuery.data.podcast;
  const page = episodesQuery.data;

  return (
    <section className="flex flex-col gap-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex w-fit items-center gap-1 text-sm text-muted transition hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Volver
      </button>

      <header className="flex flex-col gap-4 rounded-2xl border border-line bg-surface-raised p-4 sm:flex-row">
        <div className="aspect-square w-full max-w-44 shrink-0 overflow-hidden rounded-xl bg-pine-800">
          <PodcastCover src={podcast.imageUrl} alt={podcast.title} className="size-full" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{podcast.title}</h1>
          {podcast.author ? <p className="text-sm text-muted">{podcast.author}</p> : null}
          {podcast.description ? (
            <p className="line-clamp-4 text-sm text-soft">{podcast.description}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-1.5">
            {podcast.categories.slice(0, 4).map((category) => (
              <span
                key={category}
                className="rounded-full bg-pine-800 px-2 py-0.5 text-[10px] uppercase tracking-wide text-pine-300"
              >
                {category}
              </span>
            ))}
            <span className="text-xs text-faint">
              {podcast.episodeCount} {podcast.episodeCount === 1 ? "episodio" : "episodios"}
            </span>
          </div>
          <div className="mt-auto flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                if (podcast.isSubscribed) setConfirmUnsubscribeOpen(true);
                else subscribeMutation.mutate(false);
              }}
              disabled={subscribeMutation.isPending}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition disabled:opacity-50 ${
                podcast.isSubscribed
                  ? "border border-line-strong text-soft hover:border-rose-400 hover:text-rose-300"
                  : "bg-pine-600 text-white hover:bg-pine-500"
              }`}
            >
              {podcast.isSubscribed ? <Check className="size-4" /> : <Rss className="size-4" />}
              {podcast.isSubscribed ? "Suscrito" : "Suscribirse"}
            </button>
            {podcast.link ? (
              <a
                href={podcast.link}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-line-strong px-3 py-2 text-sm text-soft transition hover:border-pine-500 hover:text-foreground"
              >
                Sitio web
              </a>
            ) : null}
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1" role="group" aria-label="Filtrar episodios">
            {FILTERS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setFilter(option.value);
                  setOffset(0);
                }}
                aria-pressed={filter === option.value}
                className={`rounded-lg px-3 py-1.5 text-sm transition ${
                  filter === option.value
                    ? "bg-surface-soft text-foreground"
                    : "text-muted hover:bg-surface-soft hover:text-foreground"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput
              value={searchTerm}
              onChange={(value) => {
                setSearchTerm(value);
                setOffset(0);
              }}
              placeholder="Buscar episodios"
              ariaLabel="Buscar episodios por título"
              className="w-44 sm:w-56"
            />
            <select
              value={sort}
              onChange={(event) => {
                setSort(event.target.value as (typeof SORTS)[number]["value"]);
                setOffset(0);
              }}
              aria-label="Ordenar episodios"
              className="rounded-lg border border-line-strong bg-surface px-2 py-1.5 text-sm text-foreground"
            >
              {SORTS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {episodesQuery.isLoading ? (
          <p className="py-6 text-center text-faint">Cargando episodios…</p>
        ) : episodesQuery.isError ? (
          <p className="text-sm text-rose-400">
            {episodesQuery.error instanceof Error
              ? episodesQuery.error.message
              : "No se pudieron cargar los episodios"}
          </p>
        ) : !page || page.items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">
            {searchTerm.trim()
              ? "No hay episodios que coincidan con la búsqueda."
              : "No hay episodios con este filtro."}
          </p>
        ) : (
          <>
            <div className="grid gap-2 xl:grid-cols-2">
              {page.items.map((episode) => (
                <EpisodeRow key={episode.id} episode={episode} podcast={podcast} />
              ))}
            </div>
            {page.pagination.offset > 0 || page.pagination.hasMore ? (
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                  disabled={offset === 0}
                  className="rounded-lg border border-line-strong px-3 py-1.5 text-sm text-foreground transition hover:border-pine-500 disabled:opacity-40"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() => setOffset(offset + PAGE_SIZE)}
                  disabled={!page.pagination.hasMore}
                  className="rounded-lg border border-line-strong px-3 py-1.5 text-sm text-foreground transition hover:border-pine-500 disabled:opacity-40"
                >
                  Siguiente
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmUnsubscribeOpen}
        title="¿Cancelar la suscripción?"
        description={`Dejarás de seguir «${podcast.title}». Podrás volver a suscribirte cuando quieras.`}
        confirmLabel="Cancelar suscripción"
        cancelLabel="Mantener"
        pending={subscribeMutation.isPending}
        destructive
        onConfirm={() => subscribeMutation.mutate(true)}
        onCancel={() => setConfirmUnsubscribeOpen(false)}
      />
    </section>
  );
}
