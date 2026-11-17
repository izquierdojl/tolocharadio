import { readFileSync } from "node:fs";
import { Router } from "express";
import type { AppContext } from "../context.js";

function loadPackageVersion(): string {
  try {
    const raw = readFileSync(new URL("../../package.json", import.meta.url), "utf8");
    const parsed = JSON.parse(raw) as { version?: unknown };
    return typeof parsed.version === "string" && parsed.version.length > 0
      ? parsed.version
      : "0.0.0";
  } catch {
    return "0.0.0";
  }
}

const APP_VERSION = loadPackageVersion();

export function configRouter(ctx: AppContext): Router {
  const router = Router();

  router.get("/config", (_req, res) => {
    const { config } = ctx;
    res.setHeader("Cache-Control", "no-store");
    res.json({
      appName: "TolochaRadio",
      version: APP_VERSION,
      apiVersion: 1,
      registrationEnabled: config.registrationEnabled,
      features: {
        radio: true,
        podcasts: config.podcastsEnabled,
        podcastDiscovery: config.podcastDiscoveryProvider,
        podcastOpml: config.podcastsEnabled,
        podcastQueue: config.podcastsEnabled,
        podcastFavorites: config.podcastsEnabled,
        podcastStats: config.podcastsEnabled,
        podcastDownloads: config.podcastsEnabled,
      },
      limits: {
        podcastQueueMax: config.podcastQueueMax,
        podcastSubscriptionsMax: config.podcastSubscriptionsMax,
        podcastFeedMaxBytes: config.podcastFeedMaxBytes,
        podcastEpisodesPageSize: config.podcastEpisodesPageSize,
        podcastOpmlMaxFeeds: config.podcastOpmlMaxFeeds,
      },
      auth: {
        accessTokenTtlSec: Math.round(config.jwtAccessTtlMs / 1000),
        playbackTokenTtlSec: Math.round(config.podcastPlaybackTokenTtlMs / 1000),
      },
    });
  });

  return router;
}
