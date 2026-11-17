import type { PlaybackStatus } from "./playbackEngine.js";
import type { PodcastEpisode } from "./types.js";

/// Indica si el reproductor está en un estado en el que el episodio debe ocultarse de la cola.
export function isQueueEpisodeActive(status: PlaybackStatus): boolean {
  return status === "connecting" || status === "playing" || status === "reconnecting";
}

/// Reconstruye el orden completo de la cola conservando el hueco del episodio oculto.
export function mergeQueueOrder(
  allItems: PodcastEpisode[],
  visibleOrder: number[],
  hiddenEpisodeId?: number | null,
): number[] {
  if (hiddenEpisodeId === undefined || hiddenEpisodeId === null) return visibleOrder;

  const hiddenIndex = allItems.findIndex((item) => item.id === hiddenEpisodeId);
  if (hiddenIndex === -1) return visibleOrder;

  const withoutHidden = visibleOrder.filter((id) => id !== hiddenEpisodeId);
  const merged = [...withoutHidden];
  merged.splice(Math.min(hiddenIndex, merged.length), 0, hiddenEpisodeId);
  return merged;
}

/// Aplica un orden local de IDs sobre los episodios vigentes del servidor.
export function applyQueueOrder(items: PodcastEpisode[], order: number[]): PodcastEpisode[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  return order
    .map((id) => byId.get(id))
    .filter((item): item is PodcastEpisode => item !== undefined);
}

/// Escoge el siguiente episodio de la cola tras terminar `endedEpisodeId`.
export function nextQueueEpisode(
  items: PodcastEpisode[],
  endedEpisodeId: number,
): PodcastEpisode | null {
  return items.find((item) => item.id !== endedEpisodeId) ?? null;
}

/// Extrae las URLs de feed referenciadas en un documento OPML 2.0.
export function parseOpmlFeedUrls(xml: string): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  const pattern = /<outline\b[^>]*\bxmlUrl\s*=\s*(["'])(.*?)\1/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(xml)) !== null) {
    const url = match[2]?.trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
  }
  return urls;
}
