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

const DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad(value: number, size = 2): string {
  return String(value).padStart(size, "0");
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function isValidDay(day: string): boolean {
  const match = DAY_PATTERN.exec(day);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const dayOfMonth = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, dayOfMonth));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === dayOfMonth
  );
}

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function zonedParts(epochMs: number, timeZone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(epochMs));
  const value = (type: string): number => Number(parts.find((part) => part.type === type)?.value ?? "0");
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
    second: value("second"),
  };
}

function dayString(parts: Pick<ZonedParts, "year" | "month" | "day">): string {
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

export function zonedDay(epochMs: number, timeZone: string): string {
  return dayString(zonedParts(epochMs, timeZone));
}

export function zonedBucket(epochMs: number, timeZone: string): string {
  const parts = zonedParts(epochMs, timeZone);
  return `${dayString(parts)}T${pad(parts.hour)}`;
}

function timeZoneOffsetMs(epochMs: number, timeZone: string): number {
  const parts = zonedParts(epochMs, timeZone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUtc - Math.floor(epochMs / 1000) * 1000;
}

export function zonedDayStart(day: string, timeZone: string): number {
  const match = DAY_PATTERN.exec(day);
  if (!match) {
    throw new Error(`Dia invalido: "${day}" (usa YYYY-MM-DD)`);
  }
  const base = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  let guess = base;
  for (let i = 0; i < 2; i += 1) {
    guess = base - timeZoneOffsetMs(guess, timeZone);
  }
  return guess;
}

export function addDays(day: string, days: number): string {
  const match = DAY_PATTERN.exec(day);
  if (!match) {
    throw new Error(`Dia invalido: "${day}" (usa YYYY-MM-DD)`);
  }
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days));
  return dayString({
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  });
}

export function zonedDayBounds(day: string, timeZone: string): { startMs: number; endMs: number } {
  return {
    startMs: zonedDayStart(day, timeZone),
    endMs: zonedDayStart(addDays(day, 1), timeZone),
  };
}

export function isoWeekday(day: string): number {
  const match = DAY_PATTERN.exec(day);
  if (!match) {
    throw new Error(`Dia invalido: "${day}" (usa YYYY-MM-DD)`);
  }
  const jsWeekday = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))).getUTCDay();
  return (jsWeekday + 6) % 7;
}

export function startOfIsoWeek(day: string): string {
  return addDays(day, -isoWeekday(day));
}

export function daysBetween(from: string, to: string): number {
  const parse = (value: string): number => {
    const match = DAY_PATTERN.exec(value);
    if (!match) throw new Error(`Dia invalido: "${value}" (usa YYYY-MM-DD)`);
    return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  };
  return Math.round((parse(to) - parse(from)) / 86_400_000);
}