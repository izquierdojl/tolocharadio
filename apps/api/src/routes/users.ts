import { Router } from "express";
import { z } from "zod";
import type { AppContext } from "../context.js";
import { unauthorized } from "../errors.js";
import { parseBody } from "../lib/validation.js";
import { requireAuth } from "../middleware/auth.js";

const updateProfileSchema = z.object({
  name: z.string().optional(),
  theme: z.enum(["light", "dark"]).optional(),
  defaultView: z.enum(["explorar", "favoritos", "historial"]).optional(),
});
const updatePasswordSchema = z.object({ currentPassword: z.string(), newPassword: z.string() });

export function usersRouter(ctx: AppContext): Router {
  const router = Router();
  const auth = requireAuth(ctx);

  router.get("/users/me", auth, (req, res, next) => {
    try {
      const user = req.authUser;
      if (!user) throw unauthorized();
      res.json({ user });
    } catch (err) {
      next(err);
    }
  });

  router.patch("/users/me", auth, async (req, res, next) => {
    try {
      const user = req.authUser;
      if (!user) throw unauthorized();
      const body = parseBody(updateProfileSchema, req.body);
      const updated = await ctx.auth.updateProfile(user.id, body);
      res.json({ user: updated });
    } catch (err) {
      next(err);
    }
  });

  router.patch("/users/me/password", auth, async (req, res, next) => {
    try {
      const user = req.authUser;
      if (!user) throw unauthorized();
      const body = parseBody(updatePasswordSchema, req.body);
      const result = await ctx.auth.changePassword(user.id, body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  return router;
}