import { Router } from "express";
import { z } from "zod";
import type { AppContext } from "../context.js";
import { unauthorized } from "../errors.js";
import { parseBody } from "../lib/validation.js";
import { requireAuth } from "../middleware/auth.js";
import { routeParam } from "../lib/params.js";

const createSchema = z.object({
  name: z.string().min(1).max(256),
  url: z
    .string()
    .refine((v) => {
      try {
        const url = new URL(v);
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    }, "La URL del stream debe ser HTTP(S) valida"),
});

export function customStationsRouter(ctx: AppContext): Router {
  const router = Router();
  const auth = requireAuth(ctx);

  router.post("/custom-stations", auth, async (req, res, next) => {
    try {
      const user = req.authUser;
      if (!user) throw unauthorized();
      const body = parseBody(createSchema, req.body);
      const station = await ctx.customStations.create(user.id, body.name, body.url);
      res.status(201).json({ station });
    } catch (err) {
      next(err);
    }
  });

  router.get("/custom-stations", auth, async (req, res, next) => {
    try {
      const user = req.authUser;
      if (!user) throw unauthorized();
      const items = await ctx.customStations.list(user.id);
      res.json({ items });
    } catch (err) {
      next(err);
    }
  });

  router.delete("/custom-stations/:id", auth, (req, res, next) => {
    try {
      const user = req.authUser;
      if (!user) throw unauthorized();
      const result = ctx.customStations.delete(user.id, routeParam(req, "id"));
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
