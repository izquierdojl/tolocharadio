import { z } from "zod";
import { isValidTimeZone, parseDuration } from "../lib/time.js";

const stringBoolean = z
  .enum(["true", "false"])
  .default("true")
  .transform((v) => v === "true");

export type PodcastDiscoveryProvider = "itunes" | "podcastindex" | "none";
export type PodcastStreamMode = "proxy" | "redirect";

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    DATABASE_PATH: z.string().min(1).default("data/tolocharadio.db"),
    JWT_ACCESS_SECRET: z.string().min(1).optional(),
    JWT_REFRESH_SECRET: z.string().min(1).optional(),
    JWT_ACCESS_TTL: z.string().min(1).default("15m"),
    JWT_REFRESH_TTL: z.string().min(1).default("14d"),
    REFRESH_ROTATE_THRESHOLD: z.string().min(1).default("24h"),
    REFRESH_GRACE_MS: z.coerce.number().int().positive().default(60_000),
    REGISTRATION_ENABLED: stringBoolean,
    CORS_ORIGINS: z.string().default("*"),
    RADIOBROWSER_BASE_URL: z.string().url().default("https://de1.api.radio-browser.info"),
    RADIOBROWSER_APP_NAME: z.string().min(1).default("TolochaRadio"),
    CACHE_TTL_MS: z.coerce.number().int().positive().default(300_000),
    CACHE_MAX_ENTRIES: z.coerce.number().int().positive().default(500),
    HISTORY_LIMIT: z.coerce.number().int().positive().default(50),
    STATS_TIMEZONE: z
      .string()
      .min(1)
      .default("Europe/Madrid")
      .refine(isValidTimeZone, "Zona horaria IANA invalida"),
    STATS_FLUSH_INTERVAL_MS: z.coerce.number().int().positive().default(30_000),
    STATS_PULSE_CAP_MS: z.coerce.number().int().positive().default(15_000),
    STATS_HLS_IDLE_MS: z.coerce.number().int().positive().default(60_000),
    PODCASTS_ENABLED: stringBoolean,
    PODCAST_DISCOVERY_PROVIDER: z.enum(["itunes", "podcastindex", "none"]).default("itunes"),
    PODCAST_STREAM_MODE: z.enum(["proxy", "redirect"]).default("proxy"),
    PODCAST_FEED_MAX_BYTES: z.coerce.number().int().positive().default(5_242_880),
    PODCAST_REFRESH_INTERVAL_MS: z.coerce.number().int().positive().default(900_000),
    PODCAST_PLAYBACK_TOKEN_TTL: z.string().min(1).default("6h"),
    PODCAST_STATS_RETENTION_DAYS: z.coerce.number().int().positive().default(730),
    PODCASTINDEX_API_KEY: z.string().optional(),
    PODCASTINDEX_API_SECRET: z.string().optional(),
    STATIC_DIR: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === "production") {
      if (!data.JWT_ACCESS_SECRET || data.JWT_ACCESS_SECRET.length < 32) {
        ctx.addIssue({
          code: "custom",
          path: ["JWT_ACCESS_SECRET"],
          message: "Requerido en produccion (minimo 32 caracteres)",
        });
      }
      if (!data.JWT_REFRESH_SECRET || data.JWT_REFRESH_SECRET.length < 32) {
        ctx.addIssue({
          code: "custom",
          path: ["JWT_REFRESH_SECRET"],
          message: "Requerido en produccion (minimo 32 caracteres)",
        });
      }
    }
  });

export type NodeEnv = "development" | "test" | "production";

export interface Config {
  nodeEnv: NodeEnv;
  port: number;
  databasePath: string;
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  jwtAccessTtl: string;
  jwtRefreshTtl: string;
  jwtAccessTtlMs: number;
  jwtRefreshTtlMs: number;
  refreshRotateThreshold: string;
  refreshRotateThresholdMs: number;
  refreshGraceMs: number;
  registrationEnabled: boolean;
  corsOrigins: string[];
  radioBrowserBaseUrl: string;
  radioBrowserAppName: string;
  cacheTtlMs: number;
  cacheMaxEntries: number;
  historyLimit: number;
  statsTimezone: string;
  statsFlushIntervalMs: number;
  statsPulseCapMs: number;
  statsHlsIdleMs: number;
  podcastsEnabled: boolean;
  podcastDiscoveryProvider: PodcastDiscoveryProvider;
  podcastStreamMode: PodcastStreamMode;
  podcastFeedMaxBytes: number;
  podcastRefreshIntervalMs: number;
  podcastPlaybackTokenTtl: string;
  podcastPlaybackTokenTtlMs: number;
  podcastStatsRetentionDays: number;
  podcastIndexApiKey: string | null;
  podcastIndexApiSecret: string | null;
  podcastQueueMax: number;
  podcastSubscriptionsMax: number;
  podcastEpisodesPageSize: number;
  podcastOpmlMaxFeeds: number;
  podcastMaxEpisodesPerFeed: number;
  staticDir: string | null;
}

const DEV_ACCESS_SECRET = "tolocharadio-dev-access-secret-0123456789(do-not-use-in-prod)";
const DEV_REFRESH_SECRET = "tolocharadio-dev-refresh-secret-0123456789(do-not-use-in-prod)";

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = EnvSchema.parse(env);

  const nodeEnv: NodeEnv = parsed.NODE_ENV;
  const jwtAccessSecret =
    parsed.JWT_ACCESS_SECRET ?? (nodeEnv === "production" ? "" : DEV_ACCESS_SECRET);
  const jwtRefreshSecret =
    parsed.JWT_REFRESH_SECRET ?? (nodeEnv === "production" ? "" : DEV_REFRESH_SECRET);

  return {
    nodeEnv,
    port: parsed.PORT,
    databasePath: parsed.DATABASE_PATH,
    jwtAccessSecret,
    jwtRefreshSecret,
    jwtAccessTtl: parsed.JWT_ACCESS_TTL,
    jwtRefreshTtl: parsed.JWT_REFRESH_TTL,
    jwtAccessTtlMs: parseDuration(parsed.JWT_ACCESS_TTL),
    jwtRefreshTtlMs: parseDuration(parsed.JWT_REFRESH_TTL),
    refreshRotateThreshold: parsed.REFRESH_ROTATE_THRESHOLD,
    refreshRotateThresholdMs: parseDuration(parsed.REFRESH_ROTATE_THRESHOLD),
    refreshGraceMs: parsed.REFRESH_GRACE_MS,
    registrationEnabled: parsed.REGISTRATION_ENABLED,
    corsOrigins: (parsed.CORS_ORIGINS ?? "*")
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean),
    radioBrowserBaseUrl: parsed.RADIOBROWSER_BASE_URL,
    radioBrowserAppName: parsed.RADIOBROWSER_APP_NAME,
    cacheTtlMs: parsed.CACHE_TTL_MS,
    cacheMaxEntries: parsed.CACHE_MAX_ENTRIES,
    historyLimit: parsed.HISTORY_LIMIT,
    statsTimezone: parsed.STATS_TIMEZONE,
    statsFlushIntervalMs: parsed.STATS_FLUSH_INTERVAL_MS,
    statsPulseCapMs: parsed.STATS_PULSE_CAP_MS,
    statsHlsIdleMs: parsed.STATS_HLS_IDLE_MS,
    podcastsEnabled: parsed.PODCASTS_ENABLED,
    podcastDiscoveryProvider: parsed.PODCAST_DISCOVERY_PROVIDER,
    podcastStreamMode: parsed.PODCAST_STREAM_MODE,
    podcastFeedMaxBytes: parsed.PODCAST_FEED_MAX_BYTES,
    podcastRefreshIntervalMs: parsed.PODCAST_REFRESH_INTERVAL_MS,
    podcastPlaybackTokenTtl: parsed.PODCAST_PLAYBACK_TOKEN_TTL,
    podcastPlaybackTokenTtlMs: parseDuration(parsed.PODCAST_PLAYBACK_TOKEN_TTL),
    podcastStatsRetentionDays: parsed.PODCAST_STATS_RETENTION_DAYS,
    podcastIndexApiKey: parsed.PODCASTINDEX_API_KEY?.trim() || null,
    podcastIndexApiSecret: parsed.PODCASTINDEX_API_SECRET?.trim() || null,
    podcastQueueMax: 200,
    podcastSubscriptionsMax: 200,
    podcastEpisodesPageSize: 50,
    podcastOpmlMaxFeeds: 200,
    podcastMaxEpisodesPerFeed: 500,
    staticDir: parsed.STATIC_DIR || null,
  };
}

export type UserTheme = "light" | "dark";

export type UserDefaultView = "explorar" | "favoritos" | "historial";

export type UserDefaultSection = "radio" | "podcasts";

export interface PublicUser {
  id: number;
  email: string;
  name: string | null;
  theme: UserTheme;
  defaultView: UserDefaultView;
  defaultSection: UserDefaultSection;
  createdAt: number;
}