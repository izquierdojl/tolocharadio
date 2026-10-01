import { describe, expect, it } from "vitest";
import {
  addDays,
  daysBetween,
  isValidDay,
  isValidTimeZone,
  isoWeekday,
  startOfIsoWeek,
  zonedBucket,
  zonedDay,
  zonedDayBounds,
  zonedDayStart,
} from "../src/lib/time.js";

describe("zonas horarias", () => {
  it("valida zonas IANA", () => {
    expect(isValidTimeZone("Europe/Madrid")).toBe(true);
    expect(isValidTimeZone("UTC")).toBe(true);
    expect(isValidTimeZone("Mars/Olympus")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
  });

  it("valida dias YYYY-MM-DD", () => {
    expect(isValidDay("2026-10-01")).toBe(true);
    expect(isValidDay("2026-02-28")).toBe(true);
    expect(isValidDay("2024-02-29")).toBe(true);
    expect(isValidDay("2026-02-29")).toBe(false);
    expect(isValidDay("2026-02-30")).toBe(false);
    expect(isValidDay("2026-2-3")).toBe(false);
    expect(isValidDay("01-10-2026")).toBe(false);
  });

  it("convierte epoch a bucket local en invierno y verano", () => {
    expect(zonedBucket(Date.UTC(2026, 0, 15, 10, 30), "Europe/Madrid")).toBe("2026-01-15T11");
    expect(zonedBucket(Date.UTC(2026, 6, 15, 10, 30), "Europe/Madrid")).toBe("2026-07-15T12");
    expect(zonedBucket(Date.UTC(2026, 6, 15, 10, 30), "UTC")).toBe("2026-07-15T10");
  });

  it("convierte epoch a dia local", () => {
    expect(zonedDay(Date.UTC(2026, 0, 14, 23, 30), "Europe/Madrid")).toBe("2026-01-15");
    expect(zonedDay(Date.UTC(2026, 0, 15, 22, 59), "Europe/Madrid")).toBe("2026-01-15");
    expect(zonedDay(Date.UTC(2026, 0, 15, 23, 0), "Europe/Madrid")).toBe("2026-01-16");
  });

  it("devuelve los limites de un dia normal (24h)", () => {
    const bounds = zonedDayBounds("2026-01-15", "Europe/Madrid");
    expect(bounds.startMs).toBe(Date.UTC(2026, 0, 14, 23));
    expect(bounds.endMs).toBe(Date.UTC(2026, 0, 15, 23));
    expect(bounds.endMs - bounds.startMs).toBe(24 * 3_600_000);
    expect(zonedDayStart("2026-01-15", "Europe/Madrid")).toBe(bounds.startMs);
  });

  it("maneja los cambios de hora (23h y 25h)", () => {
    const spring = zonedDayBounds("2026-03-29", "Europe/Madrid");
    expect(spring.startMs).toBe(Date.UTC(2026, 2, 28, 23));
    expect(spring.endMs - spring.startMs).toBe(23 * 3_600_000);

    const fall = zonedDayBounds("2026-10-25", "Europe/Madrid");
    expect(fall.startMs).toBe(Date.UTC(2026, 9, 24, 22));
    expect(fall.endMs - fall.startMs).toBe(25 * 3_600_000);
  });

  it("calcula weekday ISO y el lunes de la semana", () => {
    expect(isoWeekday("2026-09-28")).toBe(0);
    expect(isoWeekday("2026-10-01")).toBe(3);
    expect(isoWeekday("2026-10-04")).toBe(6);
    expect(startOfIsoWeek("2026-10-01")).toBe("2026-09-28");
    expect(startOfIsoWeek("2026-09-28")).toBe("2026-09-28");
  });

  it("suma dias y calcula diferencias", () => {
    expect(addDays("2026-10-01", 1)).toBe("2026-10-02");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(daysBetween("2026-10-01", "2026-10-08")).toBe(7);
    expect(daysBetween("2026-10-08", "2026-10-01")).toBe(-7);
  });
});
