import { Heart } from "lucide-react";

interface EpisodeFavoriteButtonProps {
  isFavorite: boolean;
  pending?: boolean;
  onToggle: () => void;
  className?: string;
}

export function EpisodeFavoriteButton({
  isFavorite,
  pending = false,
  onToggle,
  className = "",
}: EpisodeFavoriteButtonProps) {
  const label = isFavorite ? "Quitar de favoritos" : "Añadir a favoritos";

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={pending}
      title={label}
      aria-label={label}
      aria-pressed={isFavorite}
      className={`inline-flex size-8 shrink-0 items-center justify-center rounded-lg transition hover:bg-surface-soft disabled:opacity-50 ${
        isFavorite ? "text-rose-400" : "text-muted hover:text-foreground"
      } ${className}`}
    >
      <Heart className={`size-4 ${isFavorite ? "fill-current" : ""}`} />
    </button>
  );
}
