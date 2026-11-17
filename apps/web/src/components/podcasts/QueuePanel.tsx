import { useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ListMusic, Pause, Play, RotateCcw, Trash2 } from "lucide-react";
import { formatEpisodeDuration } from "../../lib/podcastFormat.js";
import { applyQueueOrder, mergeQueueOrder } from "../../lib/podcastQueue.js";
import type { PodcastEpisode, PodcastQueue, PodcastSummary } from "../../lib/types.js";
import { useEpisodeDetailStore } from "../../stores/episodeDetail.js";
import { EpisodeDownloadButton } from "./EpisodeDownloadButton.js";
import { EpisodeFavoriteButton } from "./EpisodeFavoriteButton.js";
import { PodcastCover } from "./PodcastCover.js";
import { useEpisodeFavorite } from "./useEpisodeFavorite.js";
import { useEpisodePlayback } from "./useEpisodePlayback.js";

interface SortableQueueItemProps {
  episode: PodcastEpisode;
  podcast: PodcastSummary | undefined;
  index: number;
  onRemove: (episodeId: number) => void;
  dragEnabled: boolean;
}

function SortableQueueItem({ episode, podcast, index, onRemove, dragEnabled }: SortableQueueItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: episode.id,
  });
  const openDetail = useEpisodeDetailStore((s) => s.open);
  const playback = useEpisodePlayback(episode, podcast ?? null);
  const duration = formatEpisodeDuration(episode.durationSec);
  const favorite = useEpisodeFavorite({
    episodeId: episode.id,
    isFavorite: Boolean(episode.isFavorite),
  });

  const openEpisodeDetail = (trigger?: HTMLElement): void => {
    if (podcast) openDetail(episode, podcast, trigger ?? null);
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-xl border border-line bg-surface-raised p-2.5 ${
        isDragging ? "opacity-70" : ""
      }`}
    >
      {dragEnabled ? (
        <button
          type="button"
          {...attributes}
          {...listeners}
          title="Reordenar"
          aria-label="Reordenar episodio"
          className="cursor-grab touch-none rounded-lg p-1 text-faint hover:bg-surface-soft hover:text-foreground"
        >
          <GripVertical className="size-4" />
        </button>
      ) : (
        <span className="rounded-lg p-1 text-faint/50" aria-hidden="true">
          <GripVertical className="size-4" />
        </span>
      )}
      <span className="w-5 shrink-0 text-center text-xs text-faint">{index + 1}</span>
      <div className="size-10 shrink-0 overflow-hidden rounded-lg bg-pine-800">
        <PodcastCover src={episode.imageUrl ?? podcast?.imageUrl} alt="" className="size-full" />
      </div>
      <div
        className="min-w-0 flex-1 cursor-pointer"
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("button, a, input, select, textarea")) return;
          const titleButton = event.currentTarget.querySelector<HTMLButtonElement>("button");
          openEpisodeDetail(titleButton ?? undefined);
        }}
      >
        {podcast ? (
          <button
            type="button"
            onClick={(event) => openEpisodeDetail(event.currentTarget)}
            title={episode.title}
            className="block w-full truncate text-left text-sm font-medium text-foreground hover:underline"
          >
            {episode.title}
          </button>
        ) : (
          <p className="truncate text-sm font-medium text-foreground" title={episode.title}>
            {episode.title}
          </p>
        )}
        <p className="truncate text-xs text-muted">
          {podcast?.title ?? "Podcast"}
          {duration ? ` · ${duration}` : ""}
        </p>
      </div>
      <button
        type="button"
        onClick={playback.handlePlay}
        disabled={!podcast}
        title={playback.playTitle}
        aria-label={playback.playTitle}
        className="inline-flex size-8 items-center justify-center rounded-lg text-muted transition hover:bg-surface-soft hover:text-foreground disabled:opacity-40"
      >
        {playback.isFailed ? (
          <RotateCcw className="size-4" />
        ) : playback.isPlaying ? (
          <Pause className="size-4" />
        ) : (
          <Play className="size-4" />
        )}
      </button>
      <EpisodeDownloadButton episodeId={episode.id} episodeTitle={episode.title} />
      <EpisodeFavoriteButton
        isFavorite={favorite.isFavorite}
        pending={favorite.pending}
        onToggle={favorite.toggle}
      />
      <button
        type="button"
        onClick={() => onRemove(episode.id)}
        title="Quitar de la cola"
        aria-label="Quitar de la cola"
        className="inline-flex size-8 items-center justify-center rounded-lg text-muted transition hover:bg-surface-soft hover:text-rose-400"
      >
        <Trash2 className="size-4" />
      </button>
    </li>
  );
}

interface QueuePanelProps {
  queue: PodcastQueue;
  podcasts: Map<number, PodcastSummary>;
  onReorder: (episodeIds: number[]) => void;
  onRemove: (episodeId: number) => void;
  hiddenEpisodeId?: number | null;
  hasActiveEpisode?: boolean;
  /** Falso mientras se filtra por título: arrastrar con episodios ocultos alteraría el orden real. */
  reorderEnabled?: boolean;
}

export function QueuePanel({
  queue,
  podcasts,
  onReorder,
  onRemove,
  hiddenEpisodeId = null,
  hasActiveEpisode = false,
  reorderEnabled = true,
}: QueuePanelProps) {
  // La clave por revisión reinicia el orden local cuando el servidor confirma cambios.
  return (
    <QueuePanelList
      key={queue.revision}
      queue={queue}
      podcasts={podcasts}
      onReorder={onReorder}
      onRemove={onRemove}
      hiddenEpisodeId={hiddenEpisodeId}
      hasActiveEpisode={hasActiveEpisode}
      reorderEnabled={reorderEnabled}
    />
  );
}

function QueuePanelList({
  queue,
  podcasts,
  onReorder,
  onRemove,
  hiddenEpisodeId,
  hasActiveEpisode,
  reorderEnabled = true,
}: QueuePanelProps) {
  const [order, setOrder] = useState(() => queue.items.map((item) => item.id));
  const items = applyQueueOrder(queue.items, order);
  const visibleItems =
    hiddenEpisodeId === null ? items : items.filter((item) => item.id !== hiddenEpisodeId);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent): void => {
    if (!reorderEnabled) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = visibleItems.findIndex((item) => item.id === active.id);
    const newIndex = visibleItems.findIndex((item) => item.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const nextVisible = arrayMove(visibleItems, oldIndex, newIndex);
    const nextOrder = mergeQueueOrder(
      items,
      nextVisible.map((item) => item.id),
      hiddenEpisodeId,
    );
    setOrder(nextOrder);
    onReorder(nextOrder);
  };

  if (visibleItems.length === 0) {
    const title = hasActiveEpisode ? "No hay más episodios en cola" : "Tu cola está vacía";
    const description = hasActiveEpisode
      ? "El episodio en reproducción está en el reproductor."
      : "Añade episodios desde cualquier podcast para escucharlos seguidos.";
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line-strong px-6 py-10 text-center">
        <ListMusic className="size-8 text-faint" />
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted">{description}</p>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={visibleItems.map((item) => item.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="flex flex-col gap-2">
          {visibleItems.map((episode, index) => (
            <SortableQueueItem
              key={episode.id}
              episode={episode}
              podcast={podcasts.get(episode.podcastId)}
              index={index}
              onRemove={onRemove}
              dragEnabled={reorderEnabled}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
