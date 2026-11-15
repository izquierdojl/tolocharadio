import { Router } from "express";
import type { AppContext } from "../context.js";
import { unauthorized } from "../errors.js";
import {
  ensureTimelineRange,
  parseGranularity,
  parseLimit,
  parseRange,
} from "../lib/statsQuery.js";
import { requireAuth } from "../middleware/auth.js";

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
      ensureTimelineRange(range);
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
