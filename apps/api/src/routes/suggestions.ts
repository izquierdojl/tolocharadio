import { Router } from "express";
import { z } from "zod";
import type { AppContext } from "../context.js";
import { unauthorized } from "../errors.js";
import { parseBody } from "../lib/validation.js";
import { requireAuth } from "../middleware/auth.js";
import { routeParam } from "../lib/params.js";

const createSchema = z.object({ genre: z.string().min(1).max(256) });

export function suggestionsRouter(ctx: AppContext): Router {
  const router = Router();
  const auth = requireAuth(ctx);

  router.get("/suggestions", auth, async (req, res, next) => {
    try {
      const user = req.authUser;
      if (!user) throw unauthorized();
      const items = await ctx.suggestions.list(user.id);
      res.json({ items });
    } catch (err) {
      next(err);
    }
  });

  router.post("/suggestions", auth, async (req, res, next) => {
    try {
      const user = req.authUser;
      if (!user) throw unauthorized();
      const body = parseBody(createSchema, req.body);
      const suggestion = await ctx.suggestions.add(user.id, body.genre);
      res.status(201).json({ suggestion });
    } catch (err) {
      next(err);
    }
  });

  router.delete("/suggestions/:id", auth, async (req, res, next) => {
    try {
      const user = req.authUser;
      if (!user) throw unauthorized();
      const id = Number(routeParam(req, "id"));
      if (!Number.isInteger(id) || id <= 0) {
        res.status(400).json({ error: { code: "INVALID_ID", message: "Identificador invalido", status: 400 } });
        return;
      }
      const result = await ctx.suggestions.delete(user.id, id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  return router;
}