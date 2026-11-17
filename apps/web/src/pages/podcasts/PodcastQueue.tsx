import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowLeft, ListMusic, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  ApiError,
  clearPodcastQueue,
  fetchPodcastQueue,
  removeEpisodeFromQueue,
  reorderPodcastQueue,
} from "../../lib/api.js";
import { isQueueEpisodeActive } from "../../lib/podcastQueue.js";
import { ConfirmDialog } from "../../components/ConfirmDialog.js";
import { QueuePanel } from "../../components/podcasts/QueuePanel.js";
import { usePodcastSummaries } from "../../components/podcasts/usePodcastSummaries.js";
import { usePlayerStore } from "../../stores/player.js";

export function PodcastQueue() {
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const queueQuery = useQuery({
    queryKey: ["podcast-queue"],
    queryFn: fetchPodcastQueue,
  });

  const queue = queueQuery.data?.queue;
  const podcasts = usePodcastSummaries(queue?.items.map((episode) => episode.podcastId) ?? []);
  const activeEpisodeId = usePlayerStore((s) =>
    s.kind === "podcast" && s.episode && isQueueEpisodeActive(s.status) ? s.episode.id : null,
  );
  const loadedEpisodeId = usePlayerStore((s) =>
    s.kind === "podcast" ? (s.episode?.id ?? null) : null,
  );
  const keepEpisodeId =
    loadedEpisodeId !== null && queue?.items.some((item) => item.id === loadedEpisodeId)
      ? loadedEpisodeId
      : undefined;
  const clearableCount = queue
    ? queue.items.filter((item) => item.id !== keepEpisodeId).length
    : 0;

  const reorderMutation = useMutation({
    mutationFn: (input: { baseRevision: number; episodeIds: number[] }) =>
      reorderPodcastQueue(input.baseRevision, input.episodeIds),
    onSuccess: ({ queue: updated }) => {
      queryClient.setQueryData(["podcast-queue"], { queue: updated });
      void queryClient.invalidateQueries({ queryKey: ["podcast-home"] });
      void queryClient.invalidateQueries({ queryKey: ["podcast-queue-count"] });
    },
    onError: (err) => {
      if (err instanceof ApiError && err.code === "QUEUE_CONFLICT") {
        toast.error("La cola cambió en otro dispositivo. Se ha recargado.");
      } else {
        toast.error(err instanceof Error ? err.message : "No se pudo reordenar la cola");
      }
      void queryClient.invalidateQueries({ queryKey: ["podcast-queue"] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (episodeId: number) => removeEpisodeFromQueue(episodeId),
    onSuccess: ({ queue: updated }) => {
      queryClient.setQueryData(["podcast-queue"], { queue: updated });
      void queryClient.invalidateQueries({ queryKey: ["podcast-home"] });
      void queryClient.invalidateQueries({ queryKey: ["podcast-queue-count"] });
      toast.success("Episodio quitado de la cola");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "No se pudo quitar el episodio");
    },
  });

  const clearMutation = useMutation({
    mutationFn: (keepEpisode: number | undefined) => clearPodcastQueue(keepEpisode),
    onSuccess: ({ queue: updated }) => {
      queryClient.setQueryData(["podcast-queue"], { queue: updated });
      void queryClient.invalidateQueries({ queryKey: ["podcast-home"] });
      void queryClient.invalidateQueries({ queryKey: ["podcast-queue-count"] });
      setConfirmOpen(false);
      toast.success("Cola vaciada");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "No se pudo vaciar la cola");
    },
  });

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            to="/podcasts"
            className="mb-1 inline-flex items-center gap-1 text-sm text-muted transition hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Podcasts
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Cola de reproducción</h1>
          <p className="text-sm text-muted">Episodios a continuación</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {queue ? (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm text-soft">
              <ListMusic className="size-4" />
              {queue.items.length} / {queue.limit}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={!queue || clearableCount === 0 || clearMutation.isPending}
            title="Vaciar la cola"
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm text-muted transition hover:border-rose-400/60 hover:bg-rose-500/10 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:bg-transparent disabled:hover:text-muted"
          >
            <Trash2 className="size-4" />
            Vaciar cola
          </button>
        </div>
      </div>

      {queueQuery.isLoading ? (
        <p className="py-10 text-center text-faint">Cargando cola…</p>
      ) : queueQuery.isError ? (
        <p className="text-sm text-rose-400">
          {queueQuery.error instanceof Error ? queueQuery.error.message : "No se pudo cargar la cola"}
        </p>
      ) : !queue ? null : (
        <QueuePanel
          queue={queue}
          podcasts={podcasts}
          hiddenEpisodeId={activeEpisodeId}
          hasActiveEpisode={activeEpisodeId !== null}
          onReorder={(episodeIds) =>
            reorderMutation.mutate({ baseRevision: queue.revision, episodeIds })
          }
          onRemove={(episodeId) => removeMutation.mutate(episodeId)}
        />
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Vaciar la cola"
        description={`Se quitarán ${clearableCount} ${
          clearableCount === 1 ? "episodio" : "episodios"
        } de la cola. La reproducción en curso no se detendrá.`}
        confirmLabel="Vaciar cola"
        pending={clearMutation.isPending}
        destructive
        onConfirm={() => clearMutation.mutate(keepEpisodeId)}
        onCancel={() => setConfirmOpen(false)}
      />
    </section>
  );
}
