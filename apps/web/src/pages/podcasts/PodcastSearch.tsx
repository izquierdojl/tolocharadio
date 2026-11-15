import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Download, Loader2, Rss, Search, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  bulkSubscribePodcasts,
  fetchPodcastOpml,
  fetchPublicConfig,
  resolvePodcastFeed,
  searchPodcasts,
  subscribePodcast,
} from "../../lib/api.js";
import { parseOpmlFeedUrls } from "../../lib/podcastQueue.js";
import { PodcastCover } from "../../components/podcasts/PodcastCover.js";
import type { PodcastSearchResult } from "../../lib/types.js";

const inputClass =
  "w-full rounded-lg border border-line-strong bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-faint focus:border-pine-500 focus:outline-none";

function SearchResultCard({
  result,
  onSubscribe,
  pending,
}: {
  result: PodcastSearchResult;
  onSubscribe: (feedUrl: string) => void;
  pending: boolean;
}) {
  return (
    <article className="flex gap-3 rounded-2xl border border-line bg-surface-raised p-3">
      <div className="size-20 shrink-0 overflow-hidden rounded-xl bg-pine-800">
        <PodcastCover src={result.imageUrl} alt={result.title} className="size-full" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3 className="truncate font-semibold text-foreground">{result.title}</h3>
        <p className="truncate text-xs text-muted">{result.author ?? "Podcast"}</p>
        {result.description ? (
          <p className="line-clamp-2 text-sm text-muted">{result.description}</p>
        ) : null}
        <div className="mt-auto flex items-center gap-2">
          {result.categories.slice(0, 2).map((category) => (
            <span
              key={category}
              className="rounded-full bg-pine-800 px-2 py-0.5 text-[10px] uppercase tracking-wide text-pine-300"
            >
              {category}
            </span>
          ))}
          <button
            type="button"
            onClick={() => onSubscribe(result.feedUrl)}
            disabled={pending}
            className="ml-auto inline-flex items-center gap-1 rounded-lg bg-pine-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-pine-500 disabled:opacity-50"
          >
            <Rss className="size-3.5" />
            Suscribirse
          </button>
        </div>
      </div>
    </article>
  );
}

export function PodcastSearch() {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [term, setTerm] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [rssUrl, setRssUrl] = useState("");

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

  const bulkMutation = useMutation({
    mutationFn: (feedUrls: string[]) => bulkSubscribePodcasts(feedUrls),
    onSuccess: (result) => {
      toast.success(
        `Importados ${result.imported} podcasts${result.skipped ? `, ${result.skipped} ya suscritos` : ""}${
          result.failed ? `, ${result.failed} con error` : ""
        }`,
      );
      void queryClient.invalidateQueries({ queryKey: ["podcast-subscriptions"] });
      void queryClient.invalidateQueries({ queryKey: ["podcast-home"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "No se pudo importar el OPML");
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

  const onImportOpml = async (file: File | null): Promise<void> => {
    if (!file) return;
    const xml = await file.text();
    const feedUrls = parseOpmlFeedUrls(xml);
    if (feedUrls.length === 0) {
      toast.error("El archivo OPML no contiene feeds válidos");
      return;
    }
    bulkMutation.mutate(feedUrls);
  };

  const busy = subscribeMutation.isPending || resolveMutation.isPending;

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
              onChange={(event) => setTerm(event.target.value)}
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
              disabled={bulkMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-3 py-1.5 text-xs text-foreground transition hover:border-pine-500 disabled:opacity-50"
            >
              <Upload className="size-3.5" />
              Importar OPML
            </button>
            <button
              type="button"
              onClick={() => exportMutation.mutate()}
              disabled={exportMutation.isPending}
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
              onChange={(event) => {
                void onImportOpml(event.target.files?.[0] ?? null);
                event.target.value = "";
              }}
            />
          </div>
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
                <SearchResultCard
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
