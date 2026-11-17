import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchPublicConfig, requestPodcastDownload } from "../../lib/api.js";
import { isPodcastDownloadsEnabled } from "../../lib/podcastDownloads.js";

export function usePodcastDownloadsEnabled(): boolean {
  const { data } = useQuery({
    queryKey: ["config"],
    queryFn: fetchPublicConfig,
    staleTime: Infinity,
  });
  return isPodcastDownloadsEnabled(data);
}

/** Entrega la URL firmada al gestor de descargas del navegador o del escritorio. */
export function triggerBrowserDownload(url: string): void {
  const anchor = document.createElement("a");
  anchor.href = new URL(url, window.location.origin).toString();
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export interface EpisodeDownloadState {
  pending: boolean;
  download: () => Promise<void>;
}

export function useEpisodeDownload(episodeId: number): EpisodeDownloadState {
  const [pending, setPending] = useState(false);

  const download = async (): Promise<void> => {
    if (pending) return;
    setPending(true);
    try {
      const { url } = await requestPodcastDownload(episodeId);
      triggerBrowserDownload(url);
      toast.success("Descarga iniciada");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "No se pudo descargar el episodio",
      );
    } finally {
      setPending(false);
    }
  };

  return { pending, download };
}
