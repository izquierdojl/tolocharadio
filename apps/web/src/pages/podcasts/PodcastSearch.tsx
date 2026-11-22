import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Download, Loader2, Rss, Search, Upload, X } from "lucide-react";
import { toast } from "sonner";
import {
  bulkSubscribePodcasts,
  fetchPodcastOpml,
  fetchTopPodcasts,
  fetchPublicConfig,
  resolvePodcastFeed,
  searchPodcasts,
  subscribePodcast,
} from "../../lib/api.js";
import { parseOpmlFeedUrls } from "../../lib/podcastQueue.js";
import { runOpmlImport } from "../../lib/opmlImport.js";
import { PodcastSearchResultCard } from "../../components/podcasts/PodcastSearchResultCard.js";
import { TopPodcastsSection } from "../../components/podcasts/TopPodcastsSection.js";
import { useTopChartsStore } from "../../stores/topCharts.js";

const inputClass =
  "w-full rounded-lg border border-line-strong bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-faint focus:border-pine-500 focus:outline-none";

interface OpmlImportState {
  status: "importing" | "done";
  processed: number;
  total: number;
  imported: number;
  skipped: number;
  failed: number;
  result?: "done" | "cancelled" | "failed";
  error?: string;
}

function importOutcomeLabel(result: OpmlImportState["result"]): string {
  if (result === "cancelled") return "Importación cancelada";
  if (result === "failed") return "Importación interrumpida";
  return "Importación completada";
}

function importErrorMessage(error: unknown): string | undefined {
  if (typeof error === "string" && error) return error;
  if (error instanceof Error) return error.message;
  if (error === undefined || error === null) return undefined;
  return "No se pudo importar el OPML";
}

function ImportCounters({
  imported,
  skipped,
  failed,
}: {
  imported: number;
  skipped: number;
  failed: number;
}) {
  return (
    <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      <div className="flex gap-1">
        <dt>Importados:</dt>
        <dd className="font-medium text-foreground">{imported}</dd>
      </div>
      <div className="flex gap-1">
        <dt>Ya suscritos:</dt>
        <dd className="font-medium text-foreground">{skipped}</dd>
      </div>
      <div className="flex gap-1">
        <dt>Fallidos:</dt>
        <dd className="font-medium text-foreground">{failed}</dd>
      </div>
    </dl>
  );
}

export function PodcastSearch() {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const opmlCancelledRef = useRef(false);
  const [term, setTerm] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [rssUrl, setRssUrl] = useState("");
  const [opmlImport, setOpmlImport] = useState<OpmlImportState | null>(null);
  const [opmlCancelling, setOpmlCancelling] = useState(false);

  const configQuery = useQuery({
    queryKey: ["config"],
    queryFn: fetchPublicConfig,
    staleTime: Infinity,
  });
  const provider = configQuery.data?.features?.podcastDiscovery ?? "itunes";

  const searchQuery = useQuery({
    queryKey: ["podcast-search", submitted],
    queryFn: () => searchPodcasts(submitted),
    enabled: submitted.length > 0 && provider !== "none",
  });

  const topCountry = useTopChartsStore((s) => s.country);
  const topGenre = useTopChartsStore((s) => s.genre);
  const setTopCountry = useTopChartsStore((s) => s.setCountry);
  const setTopGenre = useTopChartsStore((s) => s.setGenre);
  const showTop = provider === "itunes" && !submitted;

  const topQuery = useQuery({
    queryKey: ["podcast-top", topCountry, topGenre],
    queryFn: () => fetchTopPodcasts(topCountry, topGenre),
    enabled: showTop,
    staleTime: 10 * 60 * 1000,
    retry: false,
  });
  // Si falla el filtro por categoria, se mantiene el ranking general.
  const topFallbackQuery = useQuery({
    queryKey: ["podcast-top", topCountry, null],
    queryFn: () => fetchTopPodcasts(topCountry, null),
    enabled: showTop && topGenre !== null && topQuery.isError,
    staleTime: 10 * 60 * 1000,
    retry: false,
  });
  const genreUnavailable = topGenre !== null && topQuery.isError && !topFallbackQuery.isError;
  const topActive = topGenre !== null && topQuery.isError ? topFallbackQuery : topQuery;

  const subscribeMutation = useMutation({
    mutationFn: (input: { podcastId?: number; feedUrl?: string }) => subscribePodcast(input),
    onSuccess: ({ podcast }) => {
      toast.success(`Te has suscrito a ${podcast.title}`);
      void queryClient.invalidateQueries({ queryKey: ["podcast-subscriptions"] });
      void queryClient.invalidateQueries({ queryKey: ["podcast-home"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "No se pudo completar la suscripción");
    },
  });

  const resolveMutation = useMutation({
    mutationFn: (feedUrl: string) => resolvePodcastFeed(feedUrl),
    onSuccess: async ({ podcast }) => {
      await subscribeMutation.mutateAsync({ feedUrl: podcast.feedUrl });
      setRssUrl("");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "No se pudo leer el feed RSS");
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

  const onSubmitSearch = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const value = term.trim();
    if (!value) return;
    setSubmitted(value);
  };

  const onSubmitRss = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const value = rssUrl.trim();
    if (!value) return;
    resolveMutation.mutate(value);
  };

  const importing = opmlImport?.status === "importing";

  const onCancelImport = (): void => {
    opmlCancelledRef.current = true;
    setOpmlCancelling(true);
  };

  const onImportOpml = async (file: File | null): Promise<void> => {
    if (!file || importing) return;
    const xml = await file.text();
    const feedUrls = parseOpmlFeedUrls(xml);
    if (feedUrls.length === 0) {
      toast.error("El archivo OPML no contiene feeds válidos");
      return;
    }
    const maxFeeds = configQuery.data?.limits?.podcastOpmlMaxFeeds ?? 200;
    if (feedUrls.length > maxFeeds) {
      toast.error(`No se pueden importar más de ${maxFeeds} feeds a la vez`);
      return;
    }

    opmlCancelledRef.current = false;
    setOpmlCancelling(false);
    setOpmlImport({
      status: "importing",
      processed: 0,
      total: feedUrls.length,
      imported: 0,
      skipped: 0,
      failed: 0,
    });

    const outcome = await runOpmlImport({
      feedUrls,
      importBatch: bulkSubscribePodcasts,
      isCancelled: () => opmlCancelledRef.current,
      onProgress: (progress) => {
        setOpmlImport({
          status: "importing",
          processed: progress.processed,
          total: progress.total,
          imported: progress.imported,
          skipped: progress.skipped,
          failed: progress.failed,
        });
      },
    });

    setOpmlImport({
      status: "done",
      processed: outcome.processed,
      total: feedUrls.length,
      imported: outcome.summary.imported,
      skipped: outcome.summary.skipped,
      failed: outcome.summary.failed,
      result: outcome.status,
      error: importErrorMessage(outcome.error),
    });
    setOpmlCancelling(false);

    if (outcome.summary.imported > 0) {
      void queryClient.invalidateQueries({ queryKey: ["podcast-subscriptions"] });
      void queryClient.invalidateQueries({ queryKey: ["podcast-home"] });
    }
  };

  const busy = subscribeMutation.isPending || resolveMutation.isPending;
  const opmlPercentage =
    opmlImport && opmlImport.total > 0
      ? Math.round((opmlImport.processed / opmlImport.total) * 100)
      : 0;

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Descubrir podcasts</h1>
        <p className="text-sm text-muted">Busca en el directorio o añade un feed RSS manualmente.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <form
          onSubmit={onSubmitSearch}
          className="flex flex-col gap-3 rounded-2xl border border-line bg-surface-raised p-4"
        >
          <h2 className="font-semibold text-foreground">Buscar en el directorio</h2>
          <div className="flex gap-2">
            <input
              value={term}
              onChange={(event) => {
                setTerm(event.target.value);
                if (!event.target.value.trim()) setSubmitted("");
              }}
              className={inputClass}
              placeholder="Nombre del podcast"
              aria-label="Buscar podcasts"
            />
            <button
              type="submit"
              disabled={provider === "none" || !term.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-pine-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-pine-500 disabled:opacity-50"
            >
              <Search className="size-4" />
              Buscar
            </button>
          </div>
          {provider === "none" ? (
            <p className="text-xs text-ochre-300">
              El directorio está desactivado en este servidor. Usa una URL RSS.
            </p>
          ) : null}
        </form>

        <form
          onSubmit={onSubmitRss}
          className="flex flex-col gap-3 rounded-2xl border border-line bg-surface-raised p-4"
        >
          <h2 className="font-semibold text-foreground">Añadir por URL RSS</h2>
          <div className="flex gap-2">
            <input
              value={rssUrl}
              onChange={(event) => setRssUrl(event.target.value)}
              className={inputClass}
              placeholder="https://ejemplo.org/feed.xml"
              aria-label="URL del feed RSS"
              type="url"
            />
            <button
              type="submit"
              disabled={busy || !rssUrl.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-pine-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-pine-500 disabled:opacity-50"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Rss className="size-4" />}
              Añadir
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={importing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-3 py-1.5 text-xs text-foreground transition hover:border-pine-500 disabled:opacity-50"
            >
              {importing ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Upload className="size-3.5" />
              )}
              Importar OPML
            </button>
            <button
              type="button"
              onClick={() => exportMutation.mutate()}
              disabled={exportMutation.isPending || importing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-3 py-1.5 text-xs text-foreground transition hover:border-pine-500 disabled:opacity-50"
            >
              <Download className="size-3.5" />
              Exportar OPML
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".opml,.xml,text/xml,application/xml"
              className="hidden"
              disabled={importing}
              onChange={(event) => {
                void onImportOpml(event.target.files?.[0] ?? null);
                event.target.value = "";
              }}
            />
          </div>

          {opmlImport ? (
            <div className="rounded-xl border border-line bg-surface p-3">
              {opmlImport.status === "importing" ? (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-foreground" aria-live="polite">
                      {opmlImport.processed} de {opmlImport.total} feeds
                    </p>
                    <button
                      type="button"
                      onClick={onCancelImport}
                      disabled={opmlCancelling}
                      className="inline-flex items-center gap-1 rounded-lg border border-line-strong px-2 py-1 text-xs text-foreground transition hover:border-pine-500 disabled:opacity-50"
                    >
                      <X className="size-3" />
                      {opmlCancelling ? "Cancelando…" : "Cancelar"}
                    </button>
                  </div>
                  <div
                    className="mt-2 h-2 overflow-hidden rounded-full bg-pine-800"
                    role="progressbar"
                    aria-label="Progreso de la importación OPML"
                    aria-valuemin={0}
                    aria-valuemax={opmlImport.total}
                    aria-valuenow={opmlImport.processed}
                  >
                    <div
                      className="h-full rounded-full bg-pine-600 transition-[width] duration-300"
                      style={{ width: `${opmlPercentage}%` }}
                    />
                  </div>
                  <ImportCounters
                    imported={opmlImport.imported}
                    skipped={opmlImport.skipped}
                    failed={opmlImport.failed}
                  />
                </>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {importOutcomeLabel(opmlImport.result)}
                    </p>
                    <button
                      type="button"
                      onClick={() => setOpmlImport(null)}
                      aria-label="Cerrar resumen de la importación"
                      className="rounded-lg p-1 text-muted transition hover:text-foreground"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {opmlImport.processed} de {opmlImport.total} feeds procesados
                    {opmlImport.result === "cancelled"
                      ? ` · ${opmlImport.total - opmlImport.processed} sin procesar`
                      : ""}
                  </p>
                  {opmlImport.error ? (
                    <p className="mt-1 text-xs text-rose-400">{opmlImport.error}</p>
                  ) : null}
                  <ImportCounters
                    imported={opmlImport.imported}
                    skipped={opmlImport.skipped}
                    failed={opmlImport.failed}
                  />
                </>
              )}
            </div>
          ) : null}
        </form>
      </div>

      {submitted && provider !== "none" ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-foreground">Resultados para “{submitted}”</h2>
          {searchQuery.isLoading ? (
            <p className="text-sm text-faint">Buscando…</p>
          ) : searchQuery.isError ? (
            <p className="text-sm text-rose-400">
              {searchQuery.error instanceof Error
                ? searchQuery.error.message
                : "No se pudo buscar podcasts"}
            </p>
          ) : searchQuery.data?.items.length === 0 ? (
            <p className="text-sm text-muted">Sin resultados. Prueba con otro nombre o una URL RSS.</p>
          ) : (
            <div className="grid gap-3 xl:grid-cols-2">
              {searchQuery.data?.items.map((result) => (
                <PodcastSearchResultCard
                  key={result.feedUrl}
                  result={result}
                  onSubscribe={(feedUrl) => subscribeMutation.mutate({ feedUrl })}
                  pending={subscribeMutation.isPending}
                />
              ))}
            </div>
          )}
        </section>
      ) : null}

      {showTop ? (
        <TopPodcastsSection
          country={topCountry}
          genre={topGenre}
          items={topActive.data?.items}
          loading={topActive.isLoading || (topGenre !== null && topQuery.isError && topFallbackQuery.isPending)}
          error={
            topActive.isError
              ? topActive.error instanceof Error
                ? topActive.error.message
                : "No se pudo cargar el ranking"
              : null
          }
          genreUnavailable={genreUnavailable}
          subscribePending={subscribeMutation.isPending}
          onCountryChange={setTopCountry}
          onGenreChange={setTopGenre}
          onSubscribe={(feedUrl) => subscribeMutation.mutate({ feedUrl })}
          onRetry={() => {
            void topQuery.refetch();
          }}
        />
      ) : null}

      <p className="text-sm text-muted">
        ¿Ya tienes tus podcasts? Revisa tus{" "}
        <Link to="/podcasts/suscripciones" className="text-ochre-300 hover:underline">
          suscripciones
        </Link>{" "}
        o tu{" "}
        <Link to="/podcasts/cola" className="text-ochre-300 hover:underline">
          cola
        </Link>
        .
      </p>
    </section>
  );
}
