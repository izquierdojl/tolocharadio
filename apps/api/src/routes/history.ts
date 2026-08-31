import { Router } from "express";
import type { AppContext } from "../context.js";
import { badRequest, unauthorized } from "../errors.js";
import { requireAuth } from "../middleware/auth.js";

export function historyRouter(ctx: AppContext): Router {
  const router = Router();
  const auth = requireAuth(ctx);

  router.get("/history", auth, async (req, res, next) => {
    try {
      const user = req.authUser;
      if (!user) throw unauthorized();
      const items = await ctx.history.list(user.id);
      res.json({ items });
    } catch (err) {
      next(err);
    }
  });

  router.delete("/history", auth, async (req, res, next) => {
    try {
      const user = req.authUser;
      if (!user) throw unauthorized();
      const result = await ctx.history.clear(user.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  router.delete("/history/:stationId", auth, async (req, res, next) => {
    try {
      const user = req.authUser;
      if (!user) throw unauthorized();
      const stationId = req.params.stationId;
      if (typeof stationId !== "string") {
        throw badRequest("INVALID_PARAMS", " stationId invalido");
      }
      const result = await ctx.history.removeStation(user.id, stationId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  return router;
}