import type { PodcastSummary } from "./types.js";

export type SubscriptionSortOrder = "recent" | "name-asc" | "name-desc" | "recent-episodes";

export const DEFAULT_SUBSCRIPTION_SORT: SubscriptionSortOrder = "recent-episodes";

export const SUBSCRIPTION_SORT_OPTIONS: ReadonlyArray<{
  value: SubscriptionSortOrder;
  label: string;
}> = [
  { value: "recent-episodes", label: "Episodios recientes" },
  { value: "name-asc", label: "Nombre (A → Z)" },
  { value: "name-desc", label: "Nombre (Z → A)" },
  { value: "recent", label: "Últimas suscritas" },
];

export function isSubscriptionSortOrder(value: unknown): value is SubscriptionSortOrder {
  return SUBSCRIPTION_SORT_OPTIONS.some((option) => option.value === value);
}

const collator = new Intl.Collator("es", { sensitivity: "base" });

function byName(a: PodcastSummary, b: PodcastSummary): number {
  return collator.compare(a.title, b.title);
}

/**
 * Devuelve una copia ordenada. `recent` conserva el orden recibido (el del servidor,
 * por fecha de suscripción). En `recent-episodes` los podcasts sin episodios pendientes
 * (`latestPendingEpisodeAt` nulo) van al final y se desempatan por nombre.
 */
export function sortSubscriptions(
  items: readonly PodcastSummary[],
  order: SubscriptionSortOrder,
): PodcastSummary[] {
  const copy = [...items];
  switch (order) {
    case "name-asc":
      return copy.sort(byName);
    case "name-desc":
      return copy.sort((a, b) => byName(b, a));
    case "recent-episodes":
      return copy.sort((a, b) => {
        const left = a.latestPendingEpisodeAt ?? null;
        const right = b.latestPendingEpisodeAt ?? null;
        if (left !== null && right !== null && left !== right) return right - left;
        if (left !== null && right === null) return -1;
        if (left === null && right !== null) return 1;
        return byName(a, b);
      });
    default:
      return copy;
  }
}
