export function formatEpisodeDuration(rawSec: number | null | undefined): string | null {
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

export function formatEpisodeDate(ts: number | null | undefined): string | null {
  if (!ts) return null;
  return new Date(ts).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
