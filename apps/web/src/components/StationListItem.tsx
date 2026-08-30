import { Play, Radio } from "lucide-react";
import { toast } from "sonner";
import type { Station } from "../lib/types.js";
import { usePlayerStore } from "../stores/player.js";
import { FavoriteButton } from "./FavoriteButton.js";

export function StationListItem({ station }: { station: Station }) {
  const play = usePlayerStore((s) => s.play);
  const isPlaying = usePlayerStore((s) => s.isPlaying && s.station?.id === station.id);

  return (
    <article className="group flex items-center gap-3 rounded-xl border border-line bg-surface-raised p-2.5 transition hover:border-pine-600 hover:bg-surface-soft">
      <div className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-pine-800">
        {station.favicon ? (
          <img
            src={station.favicon}
            alt=""
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
            className="size-full object-cover"
          />
        ) : (
          <Radio className="size-5 text-pine-400" />
        )}
        <button
          type="button"
          onClick={() => {
            play(station);
            toast.dismiss();
          }}
          title={isPlaying ? "Reproduciendo" : "Reproducir"}
          aria-label={isPlaying ? "Reproduciendo" : "Reproducir"}
          className={`absolute inset-0 flex items-center justify-center transition ${
            isPlaying
              ? "bg-pine-950/50 text-ochre-500"
              : "bg-black/0 text-transparent group-hover:bg-black/40 group-hover:text-pine-100"
          }`}
        >
          <Play className="size-5" />
        </button>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h3 className="truncate font-semibold text-foreground" title={station.name}>
          {station.name}
        </h3>
        <p className="truncate text-xs text-muted">
          {[station.country, station.language].filter(Boolean).join(" · ") || "Emisora"}
        </p>
        <div className="flex flex-wrap items-center gap-1">
          {station.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-pine-800 px-2 py-0.5 text-[10px] uppercase tracking-wide text-pine-300"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {station.bitrate ? (
        <span className="hidden text-xs text-faint sm:inline">{station.bitrate} kbps</span>
      ) : null}
      <FavoriteButton station={station} />
    </article>
  );
}