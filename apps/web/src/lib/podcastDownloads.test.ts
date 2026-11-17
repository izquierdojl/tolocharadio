import { describe, expect, it } from "vitest";
import { isPodcastDownloadsEnabled } from "./podcastDownloads.js";
import type { PublicConfig } from "./types.js";

function config(downloads: boolean): PublicConfig {
  return {
    appName: "TolochaRadio",
    version: "0.0.0",
    apiVersion: 1,
    registrationEnabled: true,
    features: {
      radio: true,
      podcasts: true,
      podcastDiscovery: "itunes",
      podcastOpml: true,
      podcastQueue: true,
      podcastFavorites: true,
      podcastStats: true,
      podcastDownloads: downloads,
    },
    limits: {
      podcastQueueMax: 200,
      podcastSubscriptionsMax: 200,
      podcastFeedMaxBytes: 5_242_880,
      podcastEpisodesPageSize: 50,
      podcastOpmlMaxFeeds: 200,
    },
    auth: {
      accessTokenTtlSec: 900,
      playbackTokenTtlSec: 21_600,
    },
  };
}

describe("isPodcastDownloadsEnabled", () => {
  it("solo habilita los botones cuando la configuración publica la capacidad", () => {
    expect(isPodcastDownloadsEnabled(config(true))).toBe(true);
    expect(isPodcastDownloadsEnabled(config(false))).toBe(false);
    expect(isPodcastDownloadsEnabled(undefined)).toBe(false);
    expect(isPodcastDownloadsEnabled(null)).toBe(false);
  });
});
