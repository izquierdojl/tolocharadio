export function formatAbsoluteDate(ts: number): string {
  return new Date(ts).toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return "hace un momento";
  const min = Math.floor(diff / 60);
  if (min < 60) return min === 1 ? "hace 1 minuto" : `hace ${min} minutos`;
  const h = Math.floor(min / 60);
  if (h < 24) return h === 1 ? "hace 1 hora" : `hace ${h} horas`;
  const d = Math.floor(h / 24);
  return d === 1 ? "hace 1 dia" : `hace ${d} dias`;
}
