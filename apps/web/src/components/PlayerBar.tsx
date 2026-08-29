import { Loader2, Pause, Play, SkipForward, Volume2, VolumeX, X } from "lucide-react";
import { usePlayerStore } from "../stores/player.js";
import type { Station } from "../lib/types.js";

interface PlayerBarProps {
  fallbackStations?: Station[];
}

export function PlayerBar({ fallbackStations = [] }: PlayerBarProps) {
  const { station, isPlaying, isBuffering, volume, toggle, stop, next, setVolume } =
    usePlayerStore();

  if (!station) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-pine-800 bg-pine-900/90 px-4 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between text-sm text-pine-400">
          <span>Elige una emisora para empezar a escuchar la sierra en directo</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-pine-800 bg-gradient-to-r from-pine-900 via-pine-850 to-pine-900/95 px-4 py-2 md:px-6">
      <div className="mx-auto flex max-w-6xl items-center gap-3 md:gap-4">
        <img
          src={station.favicon ?? undefined}
          alt=""
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
          className={`size-12 rounded-xl bg-pine-800 object-cover ${station.favicon ? "" : "hidden"}`}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-medium text-pine-100">{station.name}</span>
          <span className="truncate text-xs text-pine-400">
            {[station.country, station.language].filter(Boolean).join(" · ") || "Emisora de radio"}
          </span>
        </div>

        <button
          type="button"
          onClick={toggle}
          title={isPlaying ? "Pausar" : "Reproducir"}
          className="flex size-11 items-center justify-center rounded-full bg-ochre-500 text-pine-950 shadow-lg shadow-ochre-900/30 transition hover:bg-ochre-400"
        >
          {isBuffering ? (
            <Loader2 className="size-5 animate-spin" />
          ) : isPlaying ? (
            <Pause className="size-5" />
          ) : (
            <Play className="ml-0.5 size-5" />
          )}
        </button>
        <button
          type="button"
          onClick={() => next(fallbackStations)}
          title="Siguiente emisora"
          className="flex size-9 items-center justify-center rounded-full text-pine-300 transition hover:bg-pine-800 hover:text-pine-100"
        >
          <SkipForward className="size-5" />
        </button>

        <div className="hidden items-center gap-2 sm:flex">
          {volume === 0 ? (
            <VolumeX className="size-4 text-pine-400" />
          ) : (
            <Volume2 className="size-4 text-pine-400" />
          )}
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
          title="Quitar emisora"
          className="flex size-9 items-center justify-center rounded-full text-pine-400 transition hover:bg-pine-800 hover:text-pine-100"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}