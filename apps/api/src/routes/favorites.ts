import { Router } from "express";
import { z } from "zod";
import type { AppContext } from "../context.js";
import { unauthorized } from "../errors.js";
import { parseBody } from "../lib/validation.js";
import { requireAuth } from "../middleware/auth.js";
import { routeParam } from "../lib/params.js";

const addFavoriteSchema = z.object({ stationId: z.string().min(1).max(64) });

export function favoritesRouter(ctx: AppContext): Router {
  const router = Router();
  const auth = requireAuth(ctx);

  router.get("/favorites", auth, async (req, res, next) => {
    try {
      const user = req.authUser;
      if (!user) throw unauthorized();
      const items = await ctx.favorites.list(user.id);
      res.json({ items });
    } catch (err) {
      next(err);
    }
  });

  router.post("/favorites", auth, async (req, res, next) => {
    try {
      const user = req.authUser;
      if (!user) throw unauthorized();
      const body = parseBody(addFavoriteSchema, req.body);
      const favorite = await ctx.favorites.add(user.id, body.stationId);
      res.status(201).json({ favorite });
    } catch (err) {
      next(err);
    }
  });

  router.delete("/favorites/:stationId", auth, async (req, res, next) => {
    try {
      const user = req.authUser;
      if (!user) throw unauthorized();
      const result = await ctx.favorites.remove(user.id, routeParam(req, "stationId"));
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  return router;
}