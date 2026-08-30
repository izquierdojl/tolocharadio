import type { Request, Response } from "express";
import { AppError, unauthorized } from "../errors.js";

export const ACCESS_COOKIE = "tolocha-access";

export function requireAuth(ctx: {
  jwt: { verifyAccessToken(token: string): Promise<{ userId: number }> };
  auth: { publicUser(userId: number): Promise<{ id: number; email: string; name: string | null; theme: "light" | "dark"; createdAt: number } | null> };
}) {
  return async (req: Request, res: Response, next: (err?: unknown) => void) => {
    try {
      const header = req.headers.authorization;
      const cookie = (req.cookies as Record<string, string> | undefined)?.[ACCESS_COOKIE];
      const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : cookie;
      if (!token) {
        throw unauthorized();
      }
      const payload = await ctx.jwt.verifyAccessToken(token);
      const user = await ctx.auth.publicUser(payload.userId);
      if (!user) throw unauthorized();
      req.authUser = user;
      next();
    } catch (err) {
      next(err instanceof AppError ? err : unauthorized("INVALID_TOKEN", "Token no valido o expirado"));
    }
  };
}

export function loadRefreshToken(req: Request, cookieName: string): string | undefined {
  const fromBody = typeof (req.body as { refreshToken?: unknown }).refreshToken === "string"
    ? (req.body as { refreshToken: string }).refreshToken
    : undefined;
  const fromCookie = typeof (req.cookies as Record<string, unknown> | undefined)?.[cookieName] === "string"
    ? ((req.cookies as Record<string, string>)[cookieName] as string)
    : undefined;
  return fromBody || fromCookie || undefined;
}