import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Compass, Download, Rss } from "lucide-react";
import { toast } from "sonner";
import {
  fetchPodcastOpml,
  fetchPodcastSubscriptions,
  searchPodcastEpisodes,
  unsubscribePodcast,
} from "../../lib/api.js";
import { PodcastList } from "../../components/podcasts/PodcastList.js";
import { EpisodeRow } from "../../components/podcasts/EpisodeRow.js";
import {
  SubscriptionSearchBar,
  type SubscriptionSearchScope,
} from "../../components/podcasts/SubscriptionSearchBar.js";
import { ConfirmDialog } from "../../components/ConfirmDialog.js";
import { EmptyState } from "../../components/EmptyState.js";
import { filterByTitle } from "../../lib/textMatch.js";
import type { PodcastSummary } from "../../lib/types.js";
import {
  SUBSCRIPTION_SORT_OPTIONS,
  isSubscriptionSortOrder,
  sortSubscriptions,
} from "../../lib/subscriptionSort.js";
import { useSubscriptionSortStore } from "../../stores/subscriptionSort.js";

export function PodcastSubscriptions() {
  const queryClient = useQueryClient();
  const sortOrder = useSubscriptionSortStore((s) => s.order);
  const setSortOrder = useSubscriptionSortStore((s) => s.setOrder);
  const [pendingUnsubscribe, setPendingUnsubscribe] = useState<PodcastSummary | null>(null);
  const [term, setTerm] = useState("");
  const [scope, setScope] = useState<SubscriptionSearchScope>("podcasts");
  const [submittedEpisodeTerm, setSubmittedEpisodeTerm] = useState("");

  const subscriptionsQuery = useQuery({
    queryKey: ["podcast-subscriptions"],
    queryFn: fetchPodcastSubscriptions,
  });

  const showEpisodeResults = scope === "episodios" && submittedEpisodeTerm.length > 0;

  const episodeSearchQuery = useQuery({
    queryKey: ["podcast-episode-search", submittedEpisodeTerm],
    queryFn: () => searchPodcastEpisodes(submittedEpisodeTerm),
    enabled: showEpisodeResults,
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
    onSettled: () => setPendingUnsubscribe(null),
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

  const rawItems = subscriptionsQuery.data?.items;
  const items = useMemo(
    () =>
      scope === "podcasts"
        ? filterByTitle(sortSubscriptions(rawItems ?? [], sortOrder), term)
        : sortSubscriptions(rawItems ?? [], sortOrder),
    [rawItems, sortOrder, term, scope],
  );

  const onTermChange = (value: string): void => {
    setTerm(value);
    if (!value.trim()) setSubmittedEpisodeTerm("");
  };

  const onScopeChange = (nextScope: SubscriptionSearchScope): void => {
    setScope(nextScope);
    setSubmittedEpisodeTerm("");
  };

  const onSubmitSearch = (): void => {
    if (scope === "episodios" && term.trim()) setSubmittedEpisodeTerm(term.trim());
  };

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Tus podcasts</h1>
          <p className="text-sm text-muted">
            {items.length} {items.length === 1 ? "suscripción" : "suscripciones"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-sm text-muted">
            <span className="sr-only sm:not-sr-only">Ordenar por</span>
            <select
              value={sortOrder}
              onChange={(event) => {
                if (isSubscriptionSortOrder(event.target.value)) setSortOrder(event.target.value);
              }}
              aria-label="Ordenar por"
              className="rounded-lg border border-line-strong bg-surface-raised px-2 py-1.5 text-sm text-foreground transition hover:border-pine-500"
            >
              {SUBSCRIPTION_SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
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

      <SubscriptionSearchBar
        term={term}
        scope={scope}
        onTermChange={onTermChange}
        onScopeChange={onScopeChange}
        onSubmit={onSubmitSearch}
      />

      {showEpisodeResults ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-foreground">
            Episodios para “{submittedEpisodeTerm}”
          </h2>
          {episodeSearchQuery.isLoading ? (
            <p className="text-sm text-faint">Buscando episodios…</p>
          ) : episodeSearchQuery.isError ? (
            <p className="text-sm text-rose-400">
              {episodeSearchQuery.error instanceof Error
                ? episodeSearchQuery.error.message
                : "No se pudo buscar episodios"}
            </p>
          ) : episodeSearchQuery.data?.items.length === 0 ? (
            <p className="text-sm text-muted">
              Sin resultados. Prueba con otro título o busca en el directorio.
            </p>
          ) : (
            <div className="grid gap-2 xl:grid-cols-2">
              {episodeSearchQuery.data?.items.map((item) => (
                <EpisodeRow
                  key={item.id}
                  episode={item}
                  podcast={item.podcast}
                  showPodcast
                />
              ))}
            </div>
          )}
        </section>
      ) : subscriptionsQuery.isLoading ? (
        <p className="py-10 text-center text-faint">Cargando suscripciones…</p>
      ) : subscriptionsQuery.isError ? (
        <p className="text-sm text-rose-400">
          {subscriptionsQuery.error instanceof Error
            ? subscriptionsQuery.error.message
            : "No se pudieron cargar las suscripciones"}
        </p>
      ) : (rawItems ?? []).length === 0 ? (
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
      ) : items.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">
          No hay suscripciones que coincidan con «{term.trim()}».
        </p>
      ) : (
        <PodcastList
          podcasts={items}
          renderAction={(podcast) => (
            <button
              type="button"
              onClick={() => setPendingUnsubscribe(podcast)}
              disabled={unsubscribeMutation.isPending}
              className="rounded-lg px-2 py-1 text-[10px] uppercase tracking-wide text-muted transition hover:bg-surface-soft hover:text-rose-400 disabled:opacity-50"
            >
              Cancelar
            </button>
          )}
        />
      )}

      <ConfirmDialog
        open={pendingUnsubscribe !== null}
        title="¿Cancelar la suscripción?"
        description={`Dejarás de seguir «${pendingUnsubscribe?.title ?? ""}». Podrás volver a suscribirte cuando quieras.`}
        confirmLabel="Cancelar suscripción"
        cancelLabel="Mantener"
        pending={unsubscribeMutation.isPending}
        destructive
        onConfirm={() => {
          if (pendingUnsubscribe) unsubscribeMutation.mutate(pendingUnsubscribe.id);
        }}
        onCancel={() => setPendingUnsubscribe(null)}
      />
    </section>
  );
}
