import type { ReactNode } from "react";
import type { PodcastSummary } from "../../lib/types.js";
import { useViewModeStore } from "../../stores/viewMode.js";
import { PodcastCard } from "./PodcastCard.js";
import { PodcastListItem } from "./PodcastListItem.js";

interface PodcastListProps {
  podcasts: PodcastSummary[];
  renderAction?: (podcast: PodcastSummary) => ReactNode;
}

export function PodcastList({ podcasts, renderAction }: PodcastListProps) {
  const viewMode = useViewModeStore((s) => s.viewMode);

  if (viewMode === "list") {
    return (
      <div className="flex flex-col gap-2">
        {podcasts.map((podcast) => (
          <PodcastListItem
            key={podcast.id}
            podcast={podcast}
            action={renderAction?.(podcast)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {podcasts.map((podcast) => (
        <PodcastCard key={podcast.id} podcast={podcast} action={renderAction?.(podcast)} />
      ))}
    </div>
  );
}
