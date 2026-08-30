import { Readable } from "node:stream";
import { Router } from "express";
import type { AppContext } from "../context.js";
import { AppError, badRequest, serviceUnavailable, unauthorized } from "../errors.js";
import { requireAuth } from "../middleware/auth.js";
import { routeParam } from "../lib/params.js";
import type { Station } from "../services/normalize.js";

const MAX_REDIRECTS = 5;
const STATUS_TIMEOUT_MS = 6000;
const COPY_HEADERS = [
  "content-type",
  "content-length",
  "accept-ranges",
  "content-range",
  "cache-control",
  "expires",
  "etag",
  "last-modified",
  "date",
] as const;

async function fetchStream(url: string, headers: Record<string, string>): Promise<Response> {
  let current = url;
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const controller = new AbortController();
    const response = await fetch(current, {
      redirect: "manual",
      headers,
      signal: controller.signal,
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (location) {
        current = new URL(location, current).toString();
        response.body?.cancel().catch(() => {});
        continue;
      }
      response.body?.cancel().catch(() => {});
      throw badRequest("STREAM_UNAVAILABLE", "La emisora no esta disponible en este momento");
    }
    return response;
  }
  throw badRequest("STREAM_UNAVAILABLE", "Demasiadas redirecciones al reproducir la emisora");
}

async function isPlayable(url: string, appName: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), STATUS_TIMEOUT_MS);
    const response = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent": appName,
        Accept: "*/*",
        "Accept-Encoding": "identity",
        Range: "bytes=0-",
      },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (response.status < 200 || response.status >= 400) {
      response.body?.cancel().catch(() => {});
      return false;
    }
    const reader = response.body?.getReader();
    if (!reader) return true;
    try {
      await reader.read();
    } catch {
      return false;
    } finally {
      reader.cancel().catch(() => {});
    }
    return true;
  } catch {
    return false;
  }
}

export function playbackRouter(ctx: AppContext): Router {
  const router = Router();
  const auth = requireAuth(ctx);

  router.get("/playback/:stationId", auth, async (req, res, next) => {
    try {
      const user = req.authUser;
      if (!user) throw unauthorized();

      const controller = new AbortController();
      const abort = () => {
        controller.abort();
        if (!res.writableEnded) res.destroy();
      };
      req.on("close", abort);
      res.on("close", abort);

      const station: Station = await ctx.stations.getStation(routeParam(req, "stationId"), user.id);

      let origin: Response;
      try {
        origin = await fetchStream(station.url, {
          "User-Agent": ctx.config.radioBrowserAppName,
          Accept: station.codec ? `audio/${station.codec.toLowerCase()}, */*` : "*/*",
          "Accept-Encoding": "identity",
          Range: (req.headers.range as string) || "",
        });
      } catch (err) {
        if (res.headersSent) {
          abort();
          return;
        }
        if (err instanceof AppError) {
          return next(err);
        }
        return next(
          serviceUnavailable("STREAM_UNAVAILABLE", "No se pudo conectar con la emisora"),
        );
      }

      if (!origin.ok) {
        origin.body?.cancel().catch(() => {});
        if (res.headersSent) {
          abort();
          return;
        }
        return next(
          serviceUnavailable(
            "STREAM_UNAVAILABLE",
            "La emisora no esta disponible en este momento",
          ),
        );
      }

      ctx.history.record(user.id, station.id).catch(() => {});

      for (const name of COPY_HEADERS) {
        const value = origin.headers.get(name);
        if (value) res.setHeader(name, value);
      }
      res.status(origin.status);

      const stream = Readable.fromWeb(
        origin.body as import("node:stream/web").ReadableStream,
      );
      stream.on("error", abort);
      stream.pipe(res);
    } catch (err) {
      if (res.headersSent) {
        res.destroy();
        return;
      }
      next(err);
    }
  });

  router.get("/playback/:stationId/status", auth, async (req, res, next) => {
    try {
      const user = req.authUser;
      if (!user) throw unauthorized();
      const station = await ctx.stations.getStation(routeParam(req, "stationId"), user.id);
      const playable = await isPlayable(station.url, ctx.config.radioBrowserAppName);
      res.json({
        id: station.id,
        playable,
        ...(playable ? {} : { reason: "STREAM_UNREACHABLE" }),
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}