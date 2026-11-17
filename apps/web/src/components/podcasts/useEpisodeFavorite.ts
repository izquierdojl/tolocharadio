import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { addPodcastFavorite, removePodcastFavorite } from "../../lib/api.js";

interface UseEpisodeFavoriteOptions {
  episodeId: number;
  isFavorite?: boolean;
  onChange?: (isFavorite: boolean) => void;
}

export interface EpisodeFavoriteState {
  isFavorite: boolean;
  pending: boolean;
  toggle: () => void;
}

export function useEpisodeFavorite({
  episodeId,
  isFavorite = false,
  onChange,
}: UseEpisodeFavoriteOptions): EpisodeFavoriteState {
  const queryClient = useQueryClient();
  const [current, setCurrent] = useState(isFavorite);
  const [syncedFavorite, setSyncedFavorite] = useState(isFavorite);

  // Ajuste de estado durante el render cuando la prop cambia (patrón de React
  // para sincronizar con datos del servidor sin un efecto).
  if (syncedFavorite !== isFavorite) {
    setSyncedFavorite(isFavorite);
    setCurrent(isFavorite);
  }

  const mutation = useMutation({
    mutationFn: async (next: boolean) => {
      if (next) {
        await addPodcastFavorite(episodeId);
      } else {
        await removePodcastFavorite(episodeId);
      }
    },
    onSuccess: (_data, next) => {
      setCurrent(next);
      onChange?.(next);
      toast.success(next ? "Añadido a favoritos" : "Quitado de favoritos");
      void queryClient.invalidateQueries({ queryKey: ["podcast-home"] });
      void queryClient.invalidateQueries({ queryKey: ["podcast-favorites"] });
      void queryClient.invalidateQueries({ queryKey: ["podcast-queue"] });
      void queryClient.invalidateQueries({ queryKey: ["podcast-queue-count"] });
      void queryClient.invalidateQueries({ queryKey: ["podcast-episodes"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "No se pudo actualizar el favorito");
    },
  });

  return {
    isFavorite: current,
    pending: mutation.isPending,
    toggle: () => mutation.mutate(!current),
  };
}
