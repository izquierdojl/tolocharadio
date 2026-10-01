import { Router } from "express";
import type { AppContext } from "../context.js";
import { badRequest, unauthorized } from "../errors.js";
import { daysBetween, isValidDay } from "../lib/time.js";
import { requireAuth } from "../middleware/auth.js";
import type { StatsRange, TimelineGranularity } from "../services/stats.js";

const MAX_TIMELINE_DAYS = 1830;
const GRANULARITIES: readonly TimelineGranularity[] = ["day", "week", "month"];

function parseDay(value: unknown, name: string): string | null {
  if (value === undefined) return null;
  if (typeof value !== "string" || !isValidDay(value)) {
    throw badRequest("INVALID_PARAMS", `${name} invalido (usa YYYY-MM-DD)`);
  }
  return value;
}

function parseRange(query: Record<string, unknown>): StatsRange {
  const from = parseDay(query.from, "from");
  const to = parseDay(query.to, "to");
  if (from && to && from > to) {
    throw badRequest("INVALID_PARAMS", "from no puede ser posterior a to");
  }
  return { from, to };
}

function parseLimit(value: unknown, fallback: number, max: number): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > max) {
    throw badRequest("INVALID_PARAMS", `limit invalido (1..${max})`);
  }
  return parsed;
}

function parseGranularity(value: unknown): TimelineGranularity {
  if (value === undefined) return "day";
  if (typeof value !== "string" || !GRANULARITIES.includes(value as TimelineGranularity)) {
    throw badRequest("INVALID_PARAMS", "granularity invalida (day, week o month)");
  }
  return value as TimelineGranularity;
}

export function statsRouter(ctx: AppContext): Router {
  const router = Router();
  const auth = requireAuth(ctx);

  router.get("/stats/me/top", auth, (req, res, next) => {
    try {
      const user = req.authUser;
      if (!user) throw unauthorized();
      const range = parseRange(req.query);
      const limit = parseLimit(req.query.limit, 10, 50);
      res.json({ items: ctx.stats.topStations(user.id, range, limit) });
    } catch (err) {
      next(err);
    }
  });

  router.get("/stats/me/timeline", auth, (req, res, next) => {
    try {
      const user = req.authUser;
      if (!user) throw unauthorized();
      const range = parseRange(req.query);
      const granularity = parseGranularity(req.query.granularity);
      if (range.from && range.to && daysBetween(range.from, range.to) > MAX_TIMELINE_DAYS) {
        throw badRequest("INVALID_PARAMS", `El rango no puede superar ${MAX_TIMELINE_DAYS} dias`);
      }
      res.json({ granularity, items: ctx.stats.timeline(user.id, range, granularity) });
    } catch (err) {
      next(err);
    }
  });

  router.get("/stats/me/habits", auth, (req, res, next) => {
    try {
      const user = req.authUser;
      if (!user) throw unauthorized();
      res.json({ items: ctx.stats.habits(user.id, parseRange(req.query)) });
    } catch (err) {
      next(err);
    }
  });

  router.get("/stats/me/genres", auth, (req, res, next) => {
    try {
      const user = req.authUser;
      if (!user) throw unauthorized();
      const range = parseRange(req.query);
      const limit = parseLimit(req.query.limit, 10, 50);
      res.json({ items: ctx.stats.genres(user.id, range, limit) });
    } catch (err) {
      next(err);
    }
  });

  router.get("/stats/me/countries", auth, (req, res, next) => {
    try {
      const user = req.authUser;
      if (!user) throw unauthorized();
      res.json({ items: ctx.stats.countries(user.id, parseRange(req.query)) });
    } catch (err) {
      next(err);
    }
  });

  router.get("/stats/me/recent", auth, (req, res, next) => {
    try {
      const user = req.authUser;
      if (!user) throw unauthorized();
      const limit = parseLimit(req.query.limit, 50, 200);
      res.json({ items: ctx.stats.recent(user.id, limit) });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
