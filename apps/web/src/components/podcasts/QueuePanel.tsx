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
import { GripVertical, ListMusic, Pause, Play, Trash2 } from "lucide-react";
import type { PodcastEpisode, PodcastQueue, PodcastSummary } from "../../lib/types.js";
import { usePlayerStore } from "../../stores/player.js";
import { PodcastCover } from "./PodcastCover.js";

function formatDuration(rawSec: number | null | undefined): string | null {
  if (rawSec === null || rawSec === undefined || !Number.isFinite(rawSec) || rawSec <= 0) {
    return null;
  }
  const total = Math.round(rawSec);
  const hh = Math.floor(total / 3600);
  const mm = Math.floor((total % 3600) / 60);
  const ss = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return hh > 0 ? `${hh}:${pad(mm)}:${pad(ss)}` : `${mm}:${pad(ss)}`;
}

interface SortableQueueItemProps {
  episode: PodcastEpisode;
  podcast: PodcastSummary | undefined;
  index: number;
  onRemove: (episodeId: number) => void;
}

function SortableQueueItem({ episode, podcast, index, onRemove }: SortableQueueItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: episode.id,
  });
  const playEpisode = usePlayerStore((s) => s.playEpisode);
  const isCurrent = usePlayerStore((s) => s.kind === "podcast" && s.episode?.id === episode.id);
  const isPlaying = usePlayerStore((s) => s.isPlaying && isCurrent);
  const duration = formatDuration(episode.durationSec);

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
      <span className="w-5 shrink-0 text-center text-xs text-faint">{index + 1}</span>
      <div className="size-10 shrink-0 overflow-hidden rounded-lg bg-pine-800">
        <PodcastCover src={episode.imageUrl ?? podcast?.imageUrl} alt="" className="size-full" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground" title={episode.title}>
          {episode.title}
        </p>
        <p className="truncate text-xs text-muted">
          {podcast?.title ?? "Podcast"}
          {duration ? ` · ${duration}` : ""}
        </p>
      </div>
      <button
        type="button"
        onClick={() => {
          if (podcast) playEpisode(episode, podcast, { startPositionSec: 0 });
        }}
        disabled={!podcast}
        title={isPlaying ? "Pausar" : "Reproducir"}
        aria-label={isPlaying ? "Pausar" : "Reproducir"}
        className="inline-flex size-8 items-center justify-center rounded-lg text-muted transition hover:bg-surface-soft hover:text-foreground disabled:opacity-40"
      >
        {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
      </button>
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
}

export function QueuePanel({ queue, podcasts, onReorder, onRemove }: QueuePanelProps) {
  // La clave por revisión reinicia el orden local cuando el servidor confirma cambios.
  return (
    <QueuePanelList
      key={queue.revision}
      queue={queue}
      podcasts={podcasts}
      onReorder={onReorder}
      onRemove={onRemove}
    />
  );
}

function QueuePanelList({ queue, podcasts, onReorder, onRemove }: QueuePanelProps) {
  const [items, setItems] = useState(queue.items);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next);
    onReorder(next.map((item) => item.id));
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line-strong px-6 py-10 text-center">
        <ListMusic className="size-8 text-faint" />
        <p className="font-medium text-foreground">Tu cola está vacía</p>
        <p className="text-sm text-muted">
          Añade episodios desde cualquier podcast para escucharlos seguidos.
        </p>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        <ul className="flex flex-col gap-2">
          {items.map((episode, index) => (
            <SortableQueueItem
              key={episode.id}
              episode={episode}
              podcast={podcasts.get(episode.podcastId)}
              index={index}
              onRemove={onRemove}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
