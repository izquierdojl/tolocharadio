import { useState } from "react";
import { Podcast as PodcastIcon } from "lucide-react";

interface PodcastCoverProps {
  src: string | null | undefined;
  alt?: string;
  className?: string;
}

function isSafeImageUrl(value: string | null | undefined): value is string {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

/// Portada de podcast/episodio con carga diferida, sin referrer y fallback local.
export function PodcastCover({ src, alt = "", className = "" }: PodcastCoverProps) {
  const [failed, setFailed] = useState(false);

  if (!isSafeImageUrl(src) || failed) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-pine-700 to-pine-900 ${className}`}
        aria-hidden="true"
      >
        <PodcastIcon className="size-8 text-pine-400" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  );
}
