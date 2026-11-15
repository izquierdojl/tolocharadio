import { useEffect } from "react";
import { RotateCcw, RotateCw } from "lucide-react";
import type { PlaybackRate, PodcastEpisode, PodcastSummary } from "../../lib/types.js";

const PLAYBACK_RATES: PlaybackRate[] = [1, 1.25, 1.5, 2];

function formatAudioSeconds(rawSec: number | null | undefined): string {
  if (rawSec === null || rawSec === undefined || !Number.isFinite(rawSec) || rawSec < 0) {
    return "00:00";
  }
  const total = Math.floor(rawSec);
  const hh = Math.floor(total / 3600);
  const mm = Math.floor((total % 3600) / 60);
  const ss = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (hh > 0) {
    return `${hh}:${pad(mm)}:${pad(ss)}`;
  }
  return `${pad(mm)}:${pad(ss)}`;
}

export interface EpisodePlayerControlsProps {
  episode: PodcastEpisode;
  podcast: PodcastSummary;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: PlaybackRate;
  onToggle: () => void;
  onSeek: (sec: number) => void;
  onSkip: (deltaSec: number) => void;
  onChangeRate: (rate: PlaybackRate) => void;
}

export function EpisodePlayerControls({
  episode,
  podcast,
  isPlaying,
  currentTime,
  duration,
  playbackRate,
  onToggle,
  onSeek,
  onSkip,
  onChangeRate,
}: EpisodePlayerControlsProps) {
  const effectiveDuration = duration > 0 ? duration : episode.durationSec ?? 0;

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    try {
      const artworkUrl = episode.imageUrl ?? podcast.imageUrl;
      ms.metadata = new MediaMetadata({
        title: episode.title,
        artist: podcast.title,
        album: podcast.author ?? "TolochaRadio Podcasts",
        artwork: artworkUrl ? [{ src: artworkUrl }] : [],
      });
      ms.playbackState = isPlaying ? "playing" : "paused";
      ms.setActionHandler("play", () => {
        if (!isPlaying) onToggle();
      });
      ms.setActionHandler("pause", () => {
        if (isPlaying) onToggle();
      });
      ms.setActionHandler("seekbackward", (details) => {
        onSkip(-(details.seekOffset ?? 15));
      });
      ms.setActionHandler("seekforward", (details) => {
        onSkip(details.seekOffset ?? 30);
      });
      ms.setActionHandler("seekto", (details) => {
        if (typeof details.seekTime === "number") {
          onSeek(details.seekTime);
        }
      });
      if (effectiveDuration > 0 && typeof ms.setPositionState === "function") {
        ms.setPositionState({
          duration: Math.max(effectiveDuration, currentTime),
          playbackRate,
          position: Math.min(Math.max(0, currentTime), Math.max(effectiveDuration, currentTime)),
        });
      }
    } catch {
      // Ignorar navegadores con soporte parcial de MediaSession
    }
  }, [
    episode.title,
    episode.imageUrl,
    podcast.title,
    podcast.author,
    podcast.imageUrl,
    isPlaying,
    currentTime,
    effectiveDuration,
    playbackRate,
    onToggle,
    onSeek,
    onSkip,
  ]);

  function cycleRate() {
    const idx = PLAYBACK_RATES.indexOf(playbackRate);
    const next = PLAYBACK_RATES[(idx + 1) % PLAYBACK_RATES.length] ?? 1;
    onChangeRate(next);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      <button
        type="button"
        onClick={() => onSkip(-15)}
        title="Retroceder 15 segundos"
        aria-label="Retroceder 15 segundos"
        className="flex items-center gap-0.5 rounded-full bg-pine-800 px-2.5 py-1 text-xs font-medium text-pine-200 transition hover:bg-pine-700 hover:text-pine-100"
      >
        <RotateCcw className="size-3.5" />
        <span>15s</span>
      </button>

      <button
        type="button"
        onClick={() => onSkip(30)}
        title="Avanzar 30 segundos"
        aria-label="Avanzar 30 segundos"
        className="flex items-center gap-0.5 rounded-full bg-pine-800 px-2.5 py-1 text-xs font-medium text-pine-200 transition hover:bg-pine-700 hover:text-pine-100"
      >
        <RotateCw className="size-3.5" />
        <span>30s</span>
      </button>

      <div className="flex min-w-36 flex-1 items-center gap-2">
        <span className="w-11 text-right font-mono text-[11px] text-pine-300">
          {formatAudioSeconds(currentTime)}
        </span>
        <input
          type="range"
          min={0}
          max={effectiveDuration > 0 ? effectiveDuration : 100}
          step={1}
          value={Math.min(currentTime, effectiveDuration > 0 ? effectiveDuration : 100)}
          disabled={effectiveDuration <= 0}
          onChange={(e) => onSeek(Number(e.target.value))}
          aria-label="Posición del episodio"
          className="h-1.5 flex-1 cursor-pointer accent-ochre-500 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <span className="w-11 font-mono text-[11px] text-pine-400">
          {formatAudioSeconds(effectiveDuration)}
        </span>
      </div>

      <button
        type="button"
        onClick={cycleRate}
        title="Cambiar velocidad de reproducción"
        aria-label={`Velocidad ${playbackRate}x`}
        className="rounded-full bg-pine-800 px-2.5 py-1 text-xs font-semibold text-ochre-300 transition hover:bg-pine-700"
      >
        {playbackRate}×
      </button>
    </div>
  );
}
