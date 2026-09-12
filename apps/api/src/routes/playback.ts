import { Readable } from "node:stream";
import { Router, type Request, type Response as ExpressResponse } from "express";
import type { AppContext } from "../context.js";
import { AppError, serviceUnavailable, unauthorized } from "../errors.js";
import { requireAuth } from "../middleware/auth.js";
import { routeParam } from "../lib/params.js";
import {
  buildSubresourceUrl,
  HLS_MANIFEST_CONTENT_TYPE,
  HLS_MAX_DEPTH,
  isHlsManifest,
  looksLikeHlsBody,
  rewriteHlsManifest,
  validateSubresourceRequest,
} from "../lib/hls.js";
import { fetchFollowingRedirects, readBodyCapped } from "../lib/upstream.js";
import {
  detectPlaylistFormat,
  fetchHlsManifest,
  fetchPlaylist,
  openFirstPlayable,
  PLAYLIST_MAX_BYTES,
} from "../services/playlist.js";
import type { Station } from "../services/normalize.js";

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

function upstreamHeaders(station: Station, req: Request, appName: string): Record<string, string> {
  return {
    "User-Agent": appName,
    Accept: station.codec ? `audio/${station.codec.toLowerCase()}, */*` : "*/*",
    "Accept-Encoding": "identity",
    Range: (req.headers.range as string) || "",
  };
}

function pipeOrigin(res: ExpressResponse, origin: Response, onError: () => void): void {
  for (const name of COPY_HEADERS) {
    const value = origin.headers.get(name);
    if (value) res.setHeader(name, value);
  }
  res.status(origin.status);

  const stream = Readable.fromWeb(
    origin.body as import("node:stream/web").ReadableStream,
  );
  stream.on("error", onError);
  stream.pipe(res);
}

async function fetchOriginOrThrow(
  station: Station,
  headers: Record<string, string>,
  signal: AbortSignal,
): Promise<Response> {
  let response: Response;
  try {
    ({ response } = await fetchFollowingRedirects(station.url, headers, { signal }));
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw serviceUnavailable("STREAM_UNAVAILABLE", "No se pudo conectar con la emisora");
  }

  if (!response.ok) {
    response.body?.cancel().catch(() => {});
    throw serviceUnavailable(
      "STREAM_UNAVAILABLE",
      "La emisora no esta disponible en este momento",
    );
  }
  return response;
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

async function checkTextPlaylist(
  format: "m3u" | "pls",
  url: string,
  appName: string,
): Promise<{ playable: boolean; reason?: string }> {
  let candidates: string[];
  try {
    ({ candidates } = await fetchPlaylist(format, url, { userAgent: appName }));
  } catch (err) {
    if (err instanceof AppError) return { playable: false, reason: err.code };
    throw err;
  }

  for (const candidate of candidates) {
    if (await isPlayable(candidate, appName)) return { playable: true };
  }
  return { playable: false, reason: "STREAM_UNREACHABLE" };
}

async function checkHlsPlaylist(
  url: string,
  appName: string,
): Promise<{ playable: boolean; reason?: string }> {
  try {
    await fetchHlsManifest(url, { userAgent: appName });
    return { playable: true };
  } catch (err) {
    if (err instanceof AppError) return { playable: false, reason: err.code };
    throw err;
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
      const format = detectPlaylistFormat(station.url);
      const headers = upstreamHeaders(station, req, ctx.config.radioBrowserAppName);

      if (format === "m3u" || format === "pls") {
        const playlist = await fetchPlaylist(format, station.url, {
          userAgent: ctx.config.radioBrowserAppName,
          signal: controller.signal,
        });
        const winner = await openFirstPlayable(playlist.candidates, headers, {
          signal: controller.signal,
        });
        if (!winner) {
          throw serviceUnavailable(
            "STREAM_UNAVAILABLE",
            "La emisora no esta disponible en este momento",
          );
        }
        ctx.history.record(user.id, station.id).catch(() => {});
        pipeOrigin(res, winner.response, abort);
        return;
      }

      if (format === "hls") {
        const manifest = await fetchHlsManifest(station.url, {
          userAgent: ctx.config.radioBrowserAppName,
          signal: controller.signal,
        });
        const rewritten = rewriteHlsManifest(manifest.text, {
          baseUrl: manifest.finalUrl,
          depth: 0,
          rewriteUri: (absoluteUrl, depth) =>
            buildSubresourceUrl(
              ctx.config.jwtAccessSecret,
              station.id,
              req.baseUrl,
              absoluteUrl,
              depth,
            ),
        });
        ctx.history.record(user.id, station.id).catch(() => {});
        res.setHeader("content-type", HLS_MANIFEST_CONTENT_TYPE);
        res.setHeader("cache-control", "no-store");
        res.status(200).send(rewritten);
        return;
      }

      const origin = await fetchOriginOrThrow(station, headers, controller.signal);
      ctx.history.record(user.id, station.id).catch(() => {});
      pipeOrigin(res, origin, abort);
    } catch (err) {
      if (res.headersSent) {
        res.destroy();
        return;
      }
      next(err);
    }
  });

  router.get("/playback/:stationId/hls", auth, async (req, res, next) => {
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
      const subresource = validateSubresourceRequest({
        secret: ctx.config.jwtAccessSecret,
        stationId: station.id,
        rawUrl: req.query.u,
        rawDepth: req.query.d,
        signature: req.query.s,
      });

      let response: Response;
      let finalUrl: string;
      try {
        ({ response, finalUrl } = await fetchFollowingRedirects(
          subresource.url,
          {
            "User-Agent": ctx.config.radioBrowserAppName,
            Accept: "*/*",
            "Accept-Encoding": "identity",
            Range: (req.headers.range as string) || "",
          },
          { signal: controller.signal },
        ));
      } catch (err) {
        if (err instanceof AppError) throw err;
        throw serviceUnavailable("STREAM_UNAVAILABLE", "No se pudo conectar con la emisora");
      }

      if (!response.ok) {
        response.body?.cancel().catch(() => {});
        throw serviceUnavailable(
          "STREAM_UNAVAILABLE",
          "La emisora no esta disponible en este momento",
        );
      }

      const contentType = response.headers.get("content-type");
      if (isHlsManifest(finalUrl, contentType)) {
        if (subresource.depth >= HLS_MAX_DEPTH) {
          response.body?.cancel().catch(() => {});
          throw serviceUnavailable("PLAYLIST_MALFORMED", "El manifiesto HLS no es valido");
        }

        let text: string | null;
        try {
          text = await readBodyCapped(response, PLAYLIST_MAX_BYTES);
        } catch {
          throw serviceUnavailable("PLAYLIST_UNREACHABLE", "No se pudo descargar el manifiesto HLS");
        }
        if (text === null || !looksLikeHlsBody(text)) {
          throw serviceUnavailable("PLAYLIST_MALFORMED", "El manifiesto HLS no es valido");
        }

        const rewritten = rewriteHlsManifest(text, {
          baseUrl: finalUrl,
          depth: subresource.depth,
          rewriteUri: (absoluteUrl, depth) =>
            buildSubresourceUrl(
              ctx.config.jwtAccessSecret,
              station.id,
              req.baseUrl,
              absoluteUrl,
              depth,
            ),
        });
        res.setHeader("content-type", HLS_MANIFEST_CONTENT_TYPE);
        res.setHeader("cache-control", "no-store");
        res.status(200).send(rewritten);
        return;
      }

      pipeOrigin(res, response, abort);
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
      const format = detectPlaylistFormat(station.url);

      if (format === "m3u" || format === "pls") {
        const result = await checkTextPlaylist(format, station.url, ctx.config.radioBrowserAppName);
        res.json({ id: station.id, ...result });
        return;
      }

      if (format === "hls") {
        const result = await checkHlsPlaylist(station.url, ctx.config.radioBrowserAppName);
        res.json({ id: station.id, ...result });
        return;
      }

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
