import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import type { FavoriteEntry, Station } from "../lib/types.js";
import { api } from "../lib/api.js";
import { useAuthStore } from "../stores/auth.js";

export interface FavoriteButtonProps {
  station: Station;
}

export function FavoriteButton({ station }: FavoriteButtonProps) {
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
      aria-label={isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
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