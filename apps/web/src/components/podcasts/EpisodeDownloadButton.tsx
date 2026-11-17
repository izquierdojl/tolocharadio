import { Download, Loader2 } from "lucide-react";
import { useEpisodeDownload, usePodcastDownloadsEnabled } from "./useEpisodeDownload.js";

export interface EpisodeDownloadButtonViewProps {
  episodeTitle: string;
  pending: boolean;
  onDownload: () => void;
  variant?: "icon" | "label";
  className?: string;
}

export function EpisodeDownloadButtonView({
  episodeTitle,
  pending,
  onDownload,
  variant = "icon",
  className = "",
}: EpisodeDownloadButtonViewProps) {
  const label = pending
    ? `Preparando descarga de ${episodeTitle}`
    : `Descargar ${episodeTitle}`;
  const base =
    variant === "label"
      ? "inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-3 py-2 text-sm text-soft transition hover:border-pine-500 hover:text-foreground disabled:opacity-50"
      : "inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-surface-soft hover:text-foreground disabled:opacity-50";

  return (
    <button
      type="button"
      onClick={onDownload}
      disabled={pending}
      aria-busy={pending}
      aria-label={label}
      title={pending ? "Preparando descarga" : "Descargar episodio"}
      className={`${base} ${className}`}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Download className="size-4" />
      )}
      {variant === "label" ? (pending ? "Preparando…" : "Descargar") : null}
    </button>
  );
}

interface EpisodeDownloadButtonProps {
  episodeId: number;
  episodeTitle: string;
  variant?: "icon" | "label";
  className?: string;
}

export function EpisodeDownloadButton({
  episodeId,
  episodeTitle,
  variant = "icon",
  className = "",
}: EpisodeDownloadButtonProps) {
  const enabled = usePodcastDownloadsEnabled();
  const { pending, download } = useEpisodeDownload(episodeId);

  if (!enabled) return null;

  return (
    <EpisodeDownloadButtonView
      episodeTitle={episodeTitle}
      pending={pending}
      variant={variant}
      className={className}
      onDownload={() => void download()}
    />
  );
}
