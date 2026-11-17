import type { PublicConfig } from "./types.js";

/** Las descargas solo están disponibles si el servidor las publica en `/config`. */
export function isPodcastDownloadsEnabled(
  config: PublicConfig | null | undefined,
): boolean {
  return Boolean(config?.features?.podcastDownloads);
}
