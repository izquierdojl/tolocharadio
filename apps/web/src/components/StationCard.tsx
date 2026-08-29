import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, Play, Radio } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import type { FavoriteEntry, Station } from "../lib/types.js";
import { api } from "../lib/api.js";
import { useAuthStore } from "../stores/auth.js";
import { usePlayerStore } from "../stores/player.js";

function FavoriteButton({ station }: { station: Station }) {
  const queryClient = useQueryClient();
  const status = useAuthStore((s) => s.status);
  const [busy, setBusy] = useState(false);

  const { data: favorites } = useQuery({
    queryKey: ["favorites"],
    queryFn: () => api.get<{ items: FavoriteEntry[] }>("/favorites"),
    enabled: status === "authenticated",
  });
  const isFavorite = !!favorites?.items.some((f) => f.station.id === station.id);

  if (status !== "authenticated") return null;

  const toggle = async (): Promise<void> => {
    if (busy) return;
    setBusy(true);
    try {
      if (isFavorite) {
        await api.delete<{ ok: true }>(`/favorites/${encodeURIComponent(station.id)}`);
        toast.success("Eliminada de favoritos");
      } else {
        await api.post<{ ok: true }>("/favorites", { stationId: station.id });
        toast.success("Añadida a favoritos");
      }
      void queryClient.invalidateQueries({ queryKey: ["favorites"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo actualizar favoritos");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={busy}
      title={isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
      className={`flex size-9 items-center justify-center rounded-full backdrop-blur transition ${
        isFavorite
          ? "bg-ochre-500 text-pine-950"
          : "bg-black/40 text-pine-100 hover:bg-ochre-500 hover:text-pine-950"
      }`}
    >
      <Heart className={`size-4 ${isFavorite ? "fill-current" : ""}`} />
    </button>
  );
}

export function StationCard({ station }: { station: Station }) {
  const play = usePlayerStore((s) => s.play);
  const isPlaying = usePlayerStore((s) => s.isPlaying && s.station?.id === station.id);

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-pine-800 bg-pine-900/50 transition hover:border-pine-600 hover:shadow-xl hover:shadow-black/30">
      <div className="relative aspect-video w-full overflow-hidden bg-pine-800">
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
          <div className="flex size-full items-center justify-center bg-gradient-to-br from-pine-700 to-pine-900">
            <Radio className="size-8 text-pine-400" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-pine-950/80 via-transparent to-transparent" />
        <button
          type="button"
          onClick={() => {
            play(station);
            toast.dismiss();
          }}
          title={isPlaying ? "Reproduciendo" : "Reproducir"}
          className={`absolute bottom-2 left-2 flex size-10 items-center justify-center rounded-full shadow-lg transition ${
            isPlaying
              ? "bg-ochre-500 text-pine-950 opacity-100"
              : "bg-black/50 text-pine-100 opacity-0 group-hover:opacity-100"
          }`}
        >
          <Play className="ml-0.5 size-4" />
        </button>
        <div className="absolute right-2 top-2">
          <FavoriteButton station={station} />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="truncate font-semibold text-pine-100" title={station.name}>
          {station.name}
        </h3>
        <p className="truncate text-xs text-pine-400">
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
            <span className="ml-auto text-xs text-pine-500">{station.bitrate} kbps</span>
          ) : null}
        </div>
      </div>
    </article>
  );
}