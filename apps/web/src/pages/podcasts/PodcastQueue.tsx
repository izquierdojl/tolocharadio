import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowLeft, ListMusic } from "lucide-react";
import { toast } from "sonner";
import {
  ApiError,
  fetchPodcastQueue,
  removeEpisodeFromQueue,
  reorderPodcastQueue,
} from "../../lib/api.js";
import { QueuePanel } from "../../components/podcasts/QueuePanel.js";
import { usePodcastSummaries } from "../../components/podcasts/usePodcastSummaries.js";

export function PodcastQueue() {
  const queryClient = useQueryClient();
  const queueQuery = useQuery({
    queryKey: ["podcast-queue"],
    queryFn: fetchPodcastQueue,
  });

  const queue = queueQuery.data?.queue;
  const podcasts = usePodcastSummaries(queue?.items.map((episode) => episode.podcastId) ?? []);

  const reorderMutation = useMutation({
    mutationFn: (input: { baseRevision: number; episodeIds: number[] }) =>
      reorderPodcastQueue(input.baseRevision, input.episodeIds),
    onSuccess: ({ queue: updated }) => {
      queryClient.setQueryData(["podcast-queue"], { queue: updated });
      void queryClient.invalidateQueries({ queryKey: ["podcast-home"] });
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
      toast.success("Episodio quitado de la cola");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "No se pudo quitar el episodio");
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
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Cola de podcasts</h1>
          <p className="text-sm text-muted">
            Arrastra para ordenar. Al terminar un episodio se quita y suena el siguiente.
          </p>
        </div>
        {queue ? (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm text-soft">
            <ListMusic className="size-4" />
            {queue.items.length} / {queue.limit}
          </span>
        ) : null}
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
          onReorder={(episodeIds) =>
            reorderMutation.mutate({ baseRevision: queue.revision, episodeIds })
          }
          onRemove={(episodeId) => removeMutation.mutate(episodeId)}
        />
      )}
    </section>
  );
}
