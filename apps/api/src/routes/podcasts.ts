import { Readable } from "node:stream";
import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import type { AppContext } from "../context.js";
import { AppError, badRequest, forbidden, serviceUnavailable, unauthorized } from "../errors.js";
import { routeParam } from "../lib/params.js";
import {
  ensureTimelineRange,
  parseGranularity,
  parseLimit,
  parseRange,
} from "../lib/statsQuery.js";
import { fetchFollowingRedirects } from "../lib/upstream.js";
import { parseBody } from "../lib/validation.js";
import { requireAuth } from "../middleware/auth.js";
import type { EpisodeFilter, EpisodeSort } from "../services/podcasts/catalog.js";
import {
  issuePodcastPlaybackToken,
  validatePodcastPlaybackQuery,
} from "../services/podcasts/playbackToken.js";

const resolveSchema = z.object({
  feedUrl: z.string().min(1),
});

const subscribeSchema = z
  .object({
    podcastId: z.number().int().positive().optional(),
    feedUrl: z.string().min(1).optional(),
  })
  .refine((data) => data.podcastId !== undefined || Boolean(data.feedUrl), {
    message: "Debes indicar podcastId o feedUrl",
  });

const bulkSubscribeSchema = z.object({
  feedUrls: z.array(z.string().min(1)).min(1),
});

const queueAddSchema = z.object({
  episodeId: z.number().int().positive(),
  position: z.enum(["end", "next"]).optional(),
});

const queueOrderSchema = z.object({
  baseRevision: z.number().int().min(0),
  episodeIds: z.array(z.number().int().positive()),
});

const favoriteSchema = z.object({
  episodeId: z.number().int().positive(),
});

const progressBodySchema = z.object({
  sessionId: z.string().min(1).max(128),
  sequence: z.number().int().min(0),
  positionSec: z.number().min(0),
  durationSec: z.number().positive().nullable().optional(),
  listenedMs: z.number().min(0),
  completed: z.boolean().optional(),
  occurredAt: z.number().int().positive().optional(),
  source: z.enum(["web", "android", "desktop"]).optional(),
});

const STREAM_COPY_HEADERS = [
  "content-type",
  "content-length",
  "accept-ranges",
  "content-range",
  "cache-control",
  "etag",
  "last-modified",
] as const;

function parseIdParam(req: Request, name: string): number {
  const raw = routeParam(req, name);
  if (!/^\d+$/.test(raw)) {
    throw badRequest("VALIDATION_ERROR", `El parametro ${name} debe ser un entero positivo`);
  }
  const n = Number(raw);
  if (!Number.isSafeInteger(n) || n <= 0) {
    throw badRequest("VALIDATION_ERROR", `El parametro ${name} debe ser un entero positivo`);
  }
  return n;
}

export function podcastsRouter(ctx: AppContext): Router {
  const router = Router();
  const auth = requireAuth(ctx);

  const ensureEnabled = (_req: Request, _res: Response, next: NextFunction) => {
    if (!ctx.config.podcastsEnabled) {
      next(forbidden("PODCASTS_DISABLED", "La funcionalidad de podcasts esta deshabilitada"));
      return;
    }
    next();
  };

  router.use("/podcasts", ensureEnabled);

  router.get("/podcasts/search", auth, async (req, res, next) => {
    try {
      if (!req.authUser) throw unauthorized();
      const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
      if (!q) {
        throw badRequest("VALIDATION_ERROR", "El parametro de busqueda 'q' es obligatorio");
      }
      const rawLimit = typeof req.query.limit === "string" ? Number(req.query.limit) : 20;
      const limit = Number.isFinite(rawLimit) ? rawLimit : 20;
      const items = await ctx.podcastDiscovery.search(q, limit);
      res.json({ items });
    } catch (err) {
      next(err);
    }
  });

  router.post("/podcasts/resolve", auth, async (req, res, next) => {
    try {
      const user = req.authUser;
      if (!user) throw unauthorized();
      const body = parseBody(resolveSchema, req.body);
      const row = await ctx.podcastCatalog.resolveAndIngestFeed(body.feedUrl);
      const podcast = ctx.podcastCatalog.getPodcastForUser(row.id, user.id);
      const episodes = ctx.podcastCatalog.listEpisodesForUser(row.id, user.id, { limit: 20 });
      res.json({ podcast, episodes });
    } catch (err) {
      next(err);
    }
  });

  router.get("/podcasts/subscriptions", auth, (req, res, next) => {
    try {
      const user = req.authUser;
      if (!user) throw unauthorized();
      const items = ctx.podcastSubscriptions.list(user.id);
      res.json({ items });
    } catch (err) {
      next(err);
    }
  });

  router.post("/podcasts/subscriptions", auth, async (req, res, next) => {
    try {
      const user = req.authUser;
      if (!user) throw unauthorized();
      const body = parseBody(subscribeSchema, req.body);
      const podcast = await ctx.podcastSubscriptions.subscribe(user.id, body);
      res.status(201).json({ podcast });
    } catch (err) {
      next(err);
    }
  });

  router.post("/podcasts/subscriptions/bulk", auth, async (req, res, next) => {
    try {
      const user = req.authUser;
      if (!user) throw unauthorized();
      const body = parseBody(bulkSubscribeSchema, req.body);
      const result = await ctx.podcastSubscriptions.bulkSubscribe(user.id, body.feedUrls);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  router.get("/podcasts/subscriptions/opml", auth, (req, res, next) => {
    try {
      const user = req.authUser;
      if (!user) throw unauthorized();
      const xml = ctx.podcastSubscriptions.exportOpml(user.id);
      res.setHeader("Content-Type", "text/x-opml; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="tolocharadio-podcasts.opml"');
      res.status(200).send(xml);
    } catch (err) {
      next(err);
    }
  });

  router.delete("/podcasts/subscriptions/:podcastId", auth, (req, res, next) => {
    try {
      const user = req.authUser;
      if (!user) throw unauthorized();
      const podcastId = parseIdParam(req, "podcastId");
      const result = ctx.podcastSubscriptions.unsubscribe(user.id, podcastId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  router.get("/podcasts/home", auth, (req, res, next) => {
    try {
      const user = req.authUser;
      if (!user) throw unauthorized();
      const home = ctx.podcastCatalog.home(user.id);
      res.json({ ...home, queue: ctx.podcastQueue.summary(user.id) });
    } catch (err) {
      next(err);
    }
  });

  router.get("/podcasts/queue", auth, (req, res, next) => {
    try {
      const user = req.authUser;
      if (!user) throw unauthorized();
      res.json({ queue: ctx.podcastQueue.get(user.id) });
    } catch (err) {
      next(err);
    }
  });

  router.post("/podcasts/queue", auth, (req, res, next) => {
    try {
      const user = req.authUser;
      if (!user) throw unauthorized();
      const body = parseBody(queueAddSchema, req.body);
      const queue = ctx.podcastQueue.add(user.id, body.episodeId, body.position ?? "end");
      res.status(201).json({ queue });
    } catch (err) {
      next(err);
    }
  });

  router.put("/podcasts/queue/order", auth, (req, res, next) => {
    try {
      const user = req.authUser;
      if (!user) throw unauthorized();
      const body = parseBody(queueOrderSchema, req.body);
      const queue = ctx.podcastQueue.reorder(user.id, body.baseRevision, body.episodeIds);
      res.json({ queue });
    } catch (err) {
      next(err);
    }
  });

  router.delete("/podcasts/queue/:episodeId", auth, (req, res, next) => {
    try {
      const user = req.authUser;
      if (!user) throw unauthorized();
      const episodeId = parseIdParam(req, "episodeId");
      res.json({ queue: ctx.podcastQueue.remove(user.id, episodeId) });
    } catch (err) {
      next(err);
    }
  });

  router.get("/podcasts/favorites", auth, (req, res, next) => {
    try {
      const user = req.authUser;
      if (!user) throw unauthorized();
      res.json({ items: ctx.podcastFavorites.list(user.id) });
    } catch (err) {
      next(err);
    }
  });

  router.post("/podcasts/favorites", auth, (req, res, next) => {
    try {
      const user = req.authUser;
      if (!user) throw unauthorized();
      const body = parseBody(favoriteSchema, req.body);
      const episode = ctx.podcastFavorites.add(user.id, body.episodeId);
      res.status(201).json({ episode });
    } catch (err) {
      next(err);
    }
  });

  router.delete("/podcasts/favorites/:episodeId", auth, (req, res, next) => {
    try {
      const user = req.authUser;
      if (!user) throw unauthorized();
      const episodeId = parseIdParam(req, "episodeId");
      res.json(ctx.podcastFavorites.remove(user.id, episodeId));
    } catch (err) {
      next(err);
    }
  });

  router.get("/podcasts/stats/summary", auth, (req, res, next) => {
    try {
      const user = req.authUser;
      if (!user) throw unauthorized();
      res.json(ctx.podcastStats.summary(user.id, parseRange(req.query)));
    } catch (err) {
      next(err);
    }
  });

  router.get("/podcasts/stats/top-podcasts", auth, (req, res, next) => {
    try {
      const user = req.authUser;
      if (!user) throw unauthorized();
      const range = parseRange(req.query);
      const limit = parseLimit(req.query.limit, 10, 50);
      res.json({ items: ctx.podcastStats.topPodcasts(user.id, range, limit) });
    } catch (err) {
      next(err);
    }
  });

  router.get("/podcasts/stats/top-episodes", auth, (req, res, next) => {
    try {
      const user = req.authUser;
      if (!user) throw unauthorized();
      const range = parseRange(req.query);
      const limit = parseLimit(req.query.limit, 10, 50);
      res.json({ items: ctx.podcastStats.topEpisodes(user.id, range, limit) });
    } catch (err) {
      next(err);
    }
  });

  router.get("/podcasts/stats/timeline", auth, (req, res, next) => {
    try {
      const user = req.authUser;
      if (!user) throw unauthorized();
      const range = parseRange(req.query);
      const granularity = parseGranularity(req.query.granularity);
      ensureTimelineRange(range);
      res.json({
        granularity,
        items: ctx.podcastStats.timeline(user.id, range, granularity),
      });
    } catch (err) {
      next(err);
    }
  });

  router.get("/podcasts/stats/habits", auth, (req, res, next) => {
    try {
      const user = req.authUser;
      if (!user) throw unauthorized();
      res.json({ items: ctx.podcastStats.habits(user.id, parseRange(req.query)) });
    } catch (err) {
      next(err);
    }
  });

  router.get("/podcasts/stats/categories", auth, (req, res, next) => {
    try {
      const user = req.authUser;
      if (!user) throw unauthorized();
      const range = parseRange(req.query);
      const limit = parseLimit(req.query.limit, 10, 50);
      res.json({ items: ctx.podcastStats.categories(user.id, range, limit) });
    } catch (err) {
      next(err);
    }
  });

  router.get("/podcasts/stats/recent", auth, (req, res, next) => {
    try {
      const user = req.authUser;
      if (!user) throw unauthorized();
      const limit = parseLimit(req.query.limit, 20, 100);
      res.json({ items: ctx.podcastStats.recent(user.id, limit) });
    } catch (err) {
      next(err);
    }
  });

  router.get("/podcasts/:podcastId", auth, (req, res, next) => {
    try {
      const user = req.authUser;
      if (!user) throw unauthorized();
      const podcastId = parseIdParam(req, "podcastId");
      const podcast = ctx.podcastCatalog.getPodcastForUser(podcastId, user.id);
      res.json({ podcast });
    } catch (err) {
      next(err);
    }
  });

  router.get("/podcasts/:podcastId/episodes", auth, (req, res, next) => {
    try {
      const user = req.authUser;
      if (!user) throw unauthorized();
      const podcastId = parseIdParam(req, "podcastId");

      const rawSort = typeof req.query.sort === "string" ? req.query.sort : "recent";
      if (!["recent", "title", "duration"].includes(rawSort)) {
        throw badRequest("VALIDATION_ERROR", "Parametro sort invalido");
      }
      const rawFilter = typeof req.query.filter === "string" ? req.query.filter : "all";
      if (!["all", "unplayed", "in_progress", "completed"].includes(rawFilter)) {
        throw badRequest("VALIDATION_ERROR", "Parametro filter invalido");
      }

      const rawOffset = typeof req.query.offset === "string" ? Number(req.query.offset) : 0;
      const rawLimit =
        typeof req.query.limit === "string"
          ? Number(req.query.limit)
          : ctx.config.podcastEpisodesPageSize;
      if (!Number.isFinite(rawOffset) || rawOffset < 0) {
        throw badRequest("VALIDATION_ERROR", "Parametro offset invalido");
      }
      if (!Number.isFinite(rawLimit) || rawLimit < 1 || rawLimit > 100) {
        throw badRequest("VALIDATION_ERROR", "Parametro limit invalido");
      }

      const page = ctx.podcastCatalog.listEpisodesForUser(podcastId, user.id, {
        sort: rawSort as EpisodeSort,
        filter: rawFilter as EpisodeFilter,
        offset: rawOffset,
        limit: rawLimit,
      });
      res.json(page);
    } catch (err) {
      next(err);
    }
  });

  router.post("/podcasts/episodes/:episodeId/playback", auth, (req, res, next) => {
    try {
      const user = req.authUser;
      if (!user) throw unauthorized();
      const episodeId = parseIdParam(req, "episodeId");
      ctx.podcastCatalog.getEpisodeRow(episodeId);

      const issued = issuePodcastPlaybackToken({
        secret: ctx.config.jwtAccessSecret,
        basePath: req.baseUrl,
        userId: user.id,
        episodeId,
        ttlMs: ctx.config.podcastPlaybackTokenTtlMs,
      });
      res.setHeader("Cache-Control", "no-store");
      res.json(issued);
    } catch (err) {
      next(err);
    }
  });

  const handleEpisodeStream = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const episodeId = parseIdParam(req, "episodeId");
      validatePodcastPlaybackQuery({
        secret: ctx.config.jwtAccessSecret,
        episodeId,
        rawUserId: req.query.u,
        rawExp: req.query.exp,
        rawSig: req.query.sig,
      });

      const episode = ctx.podcastCatalog.getEpisodeRow(episodeId);

      if (ctx.config.podcastStreamMode === "redirect") {
        res.redirect(302, episode.audioUrl);
        return;
      }

      const controller = new AbortController();
      const abort = () => {
        controller.abort();
        if (!res.writableEnded) res.destroy();
      };
      req.on("close", abort);
      res.on("close", abort);

      const headers: Record<string, string> = {
        "User-Agent": ctx.config.radioBrowserAppName,
        Accept: "audio/*, */*",
        "Accept-Encoding": "identity",
      };
      const rangeHeader = req.headers.range;
      if (typeof rangeHeader === "string" && rangeHeader.trim().length > 0) {
        headers.Range = rangeHeader;
      }

      let origin: globalThis.Response;
      try {
        ({ response: origin } = await fetchFollowingRedirects(episode.audioUrl, headers, {
          signal: controller.signal,
        }));
      } catch (err) {
        if (err instanceof AppError) throw err;
        throw serviceUnavailable(
          "STREAM_UNAVAILABLE",
          "No se pudo conectar con el servidor de audio del episodio",
        );
      }

      if (origin.status === 416) {
        for (const name of ["content-range", "accept-ranges"] as const) {
          const val = origin.headers.get(name);
          if (val) res.setHeader(name, val);
        }
        origin.body?.cancel().catch(() => {});
        res.status(416).end();
        return;
      }

      if (!origin.ok) {
        origin.body?.cancel().catch(() => {});
        throw serviceUnavailable(
          "STREAM_UNAVAILABLE",
          "El audio del episodio no esta disponible en este momento",
        );
      }

      for (const name of STREAM_COPY_HEADERS) {
        const value = origin.headers.get(name);
        if (value) res.setHeader(name, value);
      }
      if (!res.getHeader("accept-ranges")) {
        res.setHeader("accept-ranges", "bytes");
      }

      res.status(origin.status);

      if (req.method === "HEAD" || !origin.body) {
        origin.body?.cancel().catch(() => {});
        res.end();
        return;
      }

      const stream = Readable.fromWeb(origin.body);
      stream.on("error", abort);
      stream.pipe(res);
    } catch (err) {
      if (res.headersSent) {
        res.destroy();
        return;
      }
      next(err);
    }
  };

  router.get("/podcasts/episodes/:episodeId/stream", handleEpisodeStream);
  router.head("/podcasts/episodes/:episodeId/stream", handleEpisodeStream);

  router.get("/podcasts/episodes/:episodeId/progress", auth, (req, res, next) => {
    try {
      const user = req.authUser;
      if (!user) throw unauthorized();
      const episodeId = parseIdParam(req, "episodeId");
      const progress = ctx.podcastProgress.getProgress(user.id, episodeId);
      res.json({ progress });
    } catch (err) {
      next(err);
    }
  });

  const handleRecordProgress = (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.authUser;
      if (!user) throw unauthorized();
      const episodeId = parseIdParam(req, "episodeId");
      const body = parseBody(progressBodySchema, req.body);
      const progress = ctx.podcastProgress.recordProgress(user.id, episodeId, body);
      res.json({ progress });
    } catch (err) {
      next(err);
    }
  };

  router.put("/podcasts/episodes/:episodeId/progress", auth, handleRecordProgress);
  router.post("/podcasts/episodes/:episodeId/progress", auth, handleRecordProgress);

  return router;
}
