import type { PodcastEpisode } from "./types.js";

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
