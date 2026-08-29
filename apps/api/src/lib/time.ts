const UNITS: Record<string, number> = {
  ms: 1,
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  w: 604_800_000,
};

export function parseDuration(input: string): number {
  const match = /^(\d+(?:\.\d+)?)\s*(ms|s|m|h|d|w)$/.exec(input.trim());
  if (!match) {
    throw new Error(`Duracion invalida: "${input}" (usa formatos como 15m, 14d, 1h)`);
  }
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Duracion invalida: "${input}"`);
  }
  const factor = UNITS[match[2]!];
  if (factor === undefined) {
    throw new Error(`Duracion invalida: "${input}"`);
  }
  return Math.round(value * factor);
}