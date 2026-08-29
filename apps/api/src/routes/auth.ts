import { Router } from "express";
import { z } from "zod";
import type { AppContext } from "../context.js";
import { parseBody } from "../lib/validation.js";
import { ACCESS_COOKIE, loadRefreshToken } from "../middleware/auth.js";

const REFRESH_COOKIE = "tolocha-refresh";

const cookieOpts = (ctx: AppContext, maxAge: number) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: ctx.config.nodeEnv === "production",
  path: "/",
  maxAge,
});

const registerSchema = z.object({
  email: z.string(),
  password: z.string(),
  name: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string(),
  password: z.string(),
});

const refreshSchema = z.object({
  refreshToken: z.string().optional(),
});

const forgotSchema = z.object({ email: z.string() });

const resetSchema = z.object({ token: z.string(), newPassword: z.string() });

export function authRouter(ctx: AppContext): Router {
  const router = Router();

  const setSessionCookies = (
    res: { cookie(name: string, value: string, opts: Record<string, unknown>): void },
    tokens: { accessToken: string; refreshToken: string },
  ) => {
    res.cookie(ACCESS_COOKIE, tokens.accessToken, {
      ...cookieOpts(ctx, ctx.config.jwtAccessTtlMs),
    });
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
      ...cookieOpts(ctx, ctx.config.jwtRefreshTtlMs),
    });
  };

  const clearSessionCookies = (res: { clearCookie(name: string, opts: Record<string, unknown>): void }) => {
    res.clearCookie(ACCESS_COOKIE, { ...cookieOpts(ctx, 0) });
    res.clearCookie(REFRESH_COOKIE, { ...cookieOpts(ctx, 0) });
  };

  router.post("/auth/register", async (req, res, next) => {
    try {
      const body = parseBody(registerSchema, req.body);
      const result = await ctx.auth.register(body);
      setSessionCookies(res, result);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  });

  router.post("/auth/login", async (req, res, next) => {
    try {
      const body = parseBody(loginSchema, req.body);
      const result = await ctx.auth.login(body);
      setSessionCookies(res, result);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  router.post("/auth/refresh", async (req, res, next) => {
    try {
      parseBody(refreshSchema, req.body);
      const token = loadRefreshToken(req, REFRESH_COOKIE);
      const result = await ctx.auth.refresh(token);
      setSessionCookies(res, result);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  router.post("/auth/logout", async (req, res, next) => {
    try {
      parseBody(refreshSchema, req.body);
      const token = loadRefreshToken(req, REFRESH_COOKIE);
      const result = await ctx.auth.logout(token);
      clearSessionCookies(res);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  router.post("/auth/forgot-password", async (req, res, next) => {
    try {
      const body = parseBody(forgotSchema, req.body);
      const result = await ctx.auth.forgotPassword(body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  router.post("/auth/reset-password", async (req, res, next) => {
    try {
      const body = parseBody(resetSchema, req.body);
      const result = await ctx.auth.resetPassword(body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  return router;
}