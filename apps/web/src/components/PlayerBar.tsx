import { useRef, useState } from "react";
import {
  Check,
  Copy,
  Loader2,
  Mic,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useNowPlaying } from "../hooks/useNowPlaying.js";
import { useEpisodeDetailStore } from "../stores/episodeDetail.js";
import { usePlayerStore } from "../stores/player.js";
import { EpisodePlayerControls } from "./podcasts/EpisodePlayerControls.js";

export function PlayerBar() {
  const {
    kind,
    station,
    episode,
    podcast,
    isPlaying,
    isBuffering,
    status,
    error,
    toggle,
    stop,
    retry,
    seek,
    skip,
    currentTime,
    duration,
    playbackRate,
    setPlaybackRate,
    volume,
    muted,
    setVolume,
    toggleMute,
    nowPlaying,
  } = usePlayerStore();
  useNowPlaying();
  const openEpisodeDetail = useEpisodeDetailStore((s) => s.open);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isPodcast = kind === "podcast" && episode !== null && podcast !== null;

  const technicalBits = [
    station?.bitrate != null ? `${station.bitrate} kbps` : null,
    station?.codec ?? null,
  ].filter(Boolean) as string[];

  const statusText =
    status === "failed"
      ? (error ?? (isPodcast ? "No se pudo reproducir el episodio" : "No se pudo reproducir la emisora"))
      : status === "reconnecting"
        ? "Reconectando…"
        : null;

  const canRetry = status === "failed";

  async function copyLink() {
    if (!station) return;
    try {
      await navigator.clipboard.writeText(station.url);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  if (!station && !isPodcast) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-pine-800 bg-pine-900/90 px-4 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between text-sm text-pine-400">
          <span className="hidden sm:inline">Elige una emisora o episodio para empezar a escuchar</span>
          <span className="sm:hidden">Elige una emisora para escuchar</span>
        </div>
      </div>
    );
  }

  const coverUrl = isPodcast
    ? (episode.imageUrl ?? podcast.imageUrl ?? null)
    : (station?.favicon ?? null);

  return (
    <div className="slide-up-enter fixed inset-x-0 bottom-0 z-40 border-t border-pine-800 bg-gradient-to-r from-pine-900 via-pine-850 to-pine-900/95 px-4 py-2 md:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-2">
        <div className="flex items-center gap-3 md:gap-4">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt=""
              referrerPolicy="no-referrer"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
              className="size-12 shrink-0 rounded-xl bg-pine-800 object-cover"
            />
          ) : isPodcast ? (
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-pine-800 text-ochre-400">
              <Mic className="size-5" />
            </div>
          ) : null}

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center gap-2">
              <span
                className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  isPodcast
                    ? "bg-ochre-500/20 text-ochre-300"
                    : "bg-pine-700/80 text-pine-200"
                }`}
              >
                {isPodcast ? "PODCAST" : "EN DIRECTO"}
              </span>
              <span
                aria-hidden="true"
                className={`flex h-3.5 shrink-0 items-end gap-0.5 ${isPlaying ? "" : "eq-paused"}`}
              >
                <span className="eq-bar h-full bg-ochre-400" style={{ animationDelay: "0ms" }} />
                <span className="eq-bar h-full bg-ochre-400" style={{ animationDelay: "200ms" }} />
                <span className="eq-bar h-full bg-ochre-400" style={{ animationDelay: "400ms" }} />
              </span>
              {isPodcast ? (
                <button
                  type="button"
                  onClick={(event) =>
                    openEpisodeDetail(episode, podcast, event.currentTarget)
                  }
                  title={episode.title}
                  className="min-w-0 truncate text-left font-medium text-pine-100 hover:underline"
                >
                  {episode.title}
                </button>
              ) : (
                <span className="truncate font-medium text-pine-100">{station?.name}</span>
              )}
            </div>

            {statusText ? (
              <span key={statusText} className="fade-enter truncate text-xs text-ochre-300">{statusText}</span>
            ) : isPodcast ? (
              <span key={episode?.id} className="fade-enter truncate text-xs text-pine-300">{podcast.title}</span>
            ) : nowPlaying ? (
              <span key={nowPlaying} className="fade-enter truncate text-xs text-pine-300" title={nowPlaying} aria-live="polite">
                <span className="font-medium text-ochre-400">Ahora suena</span> · {nowPlaying}
              </span>
            ) : (
              <span key={station?.id} className="fade-enter truncate text-xs text-pine-400">
                {[station?.country, station?.language].filter(Boolean).join(" · ") || "Emisora de radio"}
              </span>
            )}
            {!isPodcast && !statusText && technicalBits.length > 0 && (
              <span className="hidden truncate text-xs text-pine-500 sm:block">
                {technicalBits.join(" · ")}
              </span>
            )}
          </div>

          {!isPodcast && station && (
            <button
              type="button"
              onClick={copyLink}
              title={copied ? "Enlace copiado" : "Copiar enlace de emisión"}
              className={`hidden shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-150 active:scale-95 sm:flex ${
                copied
                  ? "bg-pine-700 text-pine-200"
                  : "bg-pine-800 text-pine-300 hover:bg-pine-700 hover:text-pine-100"
              }`}
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? "Enlace copiado" : "Copiar enlace"}
            </button>
          )}

          {canRetry && (
            <button
              type="button"
              onClick={retry}
              className="hidden shrink-0 items-center gap-1.5 rounded-full bg-ochre-600 px-3 py-1.5 text-xs font-semibold text-pine-950 transition-all duration-150 active:scale-95 hover:bg-ochre-500 sm:flex"
            >
              <RotateCcw className="size-3.5" />
              Reintentar
            </button>
          )}

          {!isPodcast && (
            <button
              type="button"
              onClick={canRetry ? retry : toggle}
              title={canRetry ? "Reintentar" : isPlaying ? "Pausar" : "Reproducir"}
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ochre-500 text-pine-950 shadow-lg shadow-ochre-900/30 transition-all duration-150 active:scale-95 hover:scale-105 hover:bg-ochre-400"
            >
              {isBuffering && !canRetry ? (
                <Loader2 className="size-5 animate-spin" />
              ) : canRetry ? (
                <RotateCcw className="size-5" />
              ) : isPlaying ? (
                <Pause className="size-5" />
              ) : (
                <Play className="ml-0.5 size-5" />
              )}
            </button>
          )}

          <div className="hidden items-center gap-2 sm:flex">
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? "Reactivar sonido" : "Silenciar"}
              className="cursor-pointer transition-transform duration-150 active:scale-95"
            >
              {muted || volume === 0 ? (
                <VolumeX className="size-4 text-pine-400" />
              ) : (
                <Volume2 className="size-4 text-pine-400" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              aria-label="Volumen"
              className="h-1.5 w-24 cursor-pointer accent-ochre-500"
            />
          </div>

          <button
            type="button"
            onClick={stop}
            title={isPodcast ? "Detener episodio" : "Quitar emisora"}
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-pine-400 transition-all duration-150 active:scale-95 hover:bg-pine-800 hover:text-pine-100"
          >
            <X className="size-4" />
          </button>
        </div>

        {isPodcast && (
          <EpisodePlayerControls
            episode={episode}
            podcast={podcast}
            isPlaying={isPlaying}
            isBuffering={isBuffering}
            canRetry={canRetry}
            currentTime={currentTime}
            duration={duration}
            playbackRate={playbackRate}
            onToggle={toggle}
            onRetry={retry}
            onSeek={seek}
            onSkip={skip}
            onChangeRate={setPlaybackRate}
          />
        )}
      </div>
    </div>
  );
}
