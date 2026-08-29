import { Router } from "express";
import { z } from "zod";
import type { AppContext } from "../context.js";
import { getValidationDetails } from "../lib/validation.js";
import { validationError } from "../errors.js";

const searchSchema = z.object({
  name: z.string().optional(),
  country: z.string().optional(),
  language: z.string().optional(),
  tag: z.string().optional(),
  limit: z.preprocess((v) => (v === undefined ? undefined : Number(v)), z.number().int().min(1).optional()),
  offset: z.preprocess((v) => (v === undefined ? undefined : Number(v)), z.number().int().min(0).optional()),
});

export function stationsRouter(ctx: AppContext): Router {
  const router = Router();

  router.get("/stations", async (req, res, next) => {
    try {
      const raw = req.query;
      const parsed = searchSchema.safeParse({
        name: raw.name,
        country: raw.country,
        language: raw.language,
        tag: raw.tag,
        limit: raw.limit,
        offset: raw.offset,
      });
      if (!parsed.success) {
        throw validationError(getValidationDetails(parsed.error));
      }
      const query = parsed.data;
      const limit = query.limit ?? 24;
      const offset = query.offset ?? 0;
      const unique = raw.unique === "true" || raw.unique === "1";

      const result = await ctx.stations.search({
        name: query.name,
        country: query.country,
        language: query.language,
        tag: query.tag,
        limit,
        offset,
        unique,
      });

      res.json({
        items: result.items,
        pagination: { offset: result.offset, limit: result.limit, hasMore: result.hasMore },
      });
    } catch (err) {
      next(err);
    }
  });

  router.get("/stations/countries", async (_req, res, next) => {
    try {
      res.json({ items: await ctx.stations.listCountries() });
    } catch (err) {
      next(err);
    }
  });

  router.get("/stations/languages", async (_req, res, next) => {
    try {
      res.json({ items: await ctx.stations.listLanguages() });
    } catch (err) {
      next(err);
    }
  });

  router.get("/stations/tags", async (_req, res, next) => {
    try {
      res.json({ items: await ctx.stations.listTags() });
    } catch (err) {
      next(err);
    }
  });

  router.get("/stations/:id", async (req, res, next) => {
    try {
      const station = await ctx.stations.getStation(req.params.id);
      res.json(station);
    } catch (err) {
      next(err);
    }
  });

  return router;
}