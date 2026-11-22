import { Loader2 } from "lucide-react";
import { TOP_COUNTRIES, TOP_GENRES } from "../../lib/topCharts.js";
import type { PodcastSearchResult } from "../../lib/types.js";
import { PodcastSearchResultCard } from "./PodcastSearchResultCard.js";

const selectClass =
  "rounded-lg border border-line-strong bg-surface px-2.5 py-1.5 text-sm text-foreground focus:border-pine-500 focus:outline-none";

interface TopPodcastsSectionProps {
  country: string;
  genre: string | null;
  items: PodcastSearchResult[] | undefined;
  loading: boolean;
  /** Error del ranking general (sin ranking que mostrar). */
  error: string | null;
  /** El filtro por categoria fallo y se muestra el ranking general. */
  genreUnavailable: boolean;
  subscribePending: boolean;
  onCountryChange: (country: string) => void;
  onGenreChange: (genre: string | null) => void;
  onSubscribe: (feedUrl: string) => void;
  onRetry: () => void;
}

export function TopPodcastsSection({
  country,
  genre,
  items,
  loading,
  error,
  genreUnavailable,
  subscribePending,
  onCountryChange,
  onGenreChange,
  onSubscribe,
  onRetry,
}: TopPodcastsSectionProps): React.JSX.Element {
  return (
    <section className="flex flex-col gap-3" aria-label="Podcasts populares">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-auto text-lg font-semibold text-foreground">Populares</h2>
        <select
          value={country}
          onChange={(event) => onCountryChange(event.target.value)}
          className={selectClass}
          aria-label="País del ranking"
        >
          {TOP_COUNTRIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <select
          value={genre ?? ""}
          onChange={(event) => onGenreChange(event.target.value || null)}
          className={selectClass}
          aria-label="Categoría del ranking"
        >
          <option value="">Todas las categorías</option>
          {TOP_GENRES.map((g) => (
            <option key={g.id} value={g.id}>
              {g.label}
            </option>
          ))}
        </select>
      </div>

      {genreUnavailable ? (
        <p className="text-xs text-ochre-300" role="status">
          El ranking por categoría no está disponible ahora. Mostrando el ranking general.
        </p>
      ) : null}

      {loading ? (
        <p className="inline-flex items-center gap-2 text-sm text-faint">
          <Loader2 className="size-4 animate-spin" />
          Cargando ranking…
        </p>
      ) : error ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-rose-400">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-lg border border-line-strong px-3 py-1 text-xs text-foreground transition hover:border-pine-500"
          >
            Reintentar
          </button>
        </div>
      ) : items && items.length === 0 ? (
        <p className="text-sm text-muted">No hay ranking disponible para esta selección.</p>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {items?.map((result, index) => (
            <div key={result.feedUrl} className="flex items-start gap-2">
              <span className="w-6 shrink-0 pt-3 text-right text-sm font-semibold text-faint">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <PodcastSearchResultCard
                  result={result}
                  onSubscribe={onSubscribe}
                  pending={subscribePending}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
