import { Play, Radio } from "lucide-react";
import { toast } from "sonner";
import type { Station } from "../lib/types.js";
import { usePlayerStore } from "../stores/player.js";
import { FavoriteButton } from "./FavoriteButton.js";
import { SierraEmblem } from "./SierraEmblem.js";

export function StationCard({ station, isEditing = false }: { station: Station; isEditing?: boolean }) {
  const play = usePlayerStore((s) => s.play);
  const isPlaying = usePlayerStore((s) => s.isPlaying && s.station?.id === station.id);

  return (
    <article className={`group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface-raised transition hover:border-pine-600 hover:shadow-xl hover:shadow-black/30 ${isEditing ? "editing-border" : ""}`}>
      <div className="relative aspect-video w-full overflow-hidden bg-pine-800">
        {station.isCustom ? (
          <div className="flex size-full items-center justify-center bg-gradient-to-br from-pine-600 to-pine-800">
            <SierraEmblem className="size-24 rounded-2xl" />
          </div>
        ) : station.favicon ? (
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
          <div className="flex size-full items-center justify-center bg-gradient-to-br from-pine-700 to-pine-900">
            <Radio className="size-8 text-pine-400" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-pine-950/80 via-transparent to-transparent" />
        {!isEditing && (
          <button
            type="button"
            onClick={() => {
              play(station);
              toast.dismiss();
            }}
            title={isPlaying ? "Reproduciendo" : "Reproducir"}
            className={`absolute bottom-2 left-2 flex size-10 items-center justify-center rounded-full shadow-lg transition ${
              isPlaying
                ? "bg-ochre-500 text-pine-950"
                : "bg-black/50 text-pine-100"
            }`}
          >
            <Play className="ml-0.5 size-4" />
          </button>
        )}
        {!isEditing && (
          <div className="absolute right-2 top-2">
            <FavoriteButton station={station} />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="truncate font-semibold text-foreground" title={station.name}>
          {station.name}
        </h3>
        <p className="truncate text-xs text-muted">
          {[station.country, station.language].filter(Boolean).join(" · ") || "Emisora"}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1">
          {station.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-pine-800 px-2 py-0.5 text-[10px] uppercase tracking-wide text-pine-300"
            >
              {tag}
            </span>
          ))}
          {station.bitrate ? (
            <span className="ml-auto text-xs text-faint">{station.bitrate} kbps</span>
          ) : null}
        </div>
      </div>
    </article>
  );
}