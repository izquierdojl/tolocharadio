import type { Station } from "../lib/types.js";
import { useViewModeStore } from "../stores/viewMode.js";
import { StationCard } from "./StationCard.js";
import { StationListItem } from "./StationListItem.js";

export function StationList({ stations }: { stations: Station[] }) {
  const viewMode = useViewModeStore((s) => s.viewMode);

  if (viewMode === "list") {
    return (
      <div className="flex flex-col gap-2">
        {stations.map((station) => (
          <StationListItem key={station.id} station={station} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {stations.map((station) => (
        <StationCard key={station.id} station={station} />
      ))}
    </div>
  );
}