import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  theme: text("theme").notNull().default("dark"),
  defaultView: text("default_view").notNull().default("explorar"),
  defaultSection: text("default_section").notNull().default("radio"),
  podcastStatsResetAt: integer("podcast_stats_reset_at").notNull().default(0),
  createdAt: integer("created_at").notNull(),
});

export const refreshTokens = sqliteTable("refresh_tokens", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: integer("expires_at").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const passwordResetTokens = sqliteTable("password_reset_tokens", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: integer("expires_at").notNull(),
  usedAt: integer("used_at"),
  createdAt: integer("created_at").notNull(),
});

export const favorites = sqliteTable(
  "favorites",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    stationId: text("station_id").notNull(),
    snapshot: text("snapshot").notNull(),
    createdAt: integer("created_at").notNull(),
    position: integer("position"),
  },
  (t) => [
    uniqueIndex("favorites_user_station").on(t.userId, t.stationId),
    index("favorites_user").on(t.userId),
  ],
);

export const customStations = sqliteTable(
  "custom_stations",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    stationId: text("station_id").notNull(),
    name: text("name").notNull(),
    url: text("url").notNull(),
    snapshot: text("snapshot").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [
    uniqueIndex("custom_stations_user_station").on(t.userId, t.stationId),
    index("custom_stations_user").on(t.userId),
  ],
);

export const history = sqliteTable(
  "history",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    stationId: text("station_id").notNull(),
    snapshot: text("snapshot").notNull(),
    playedAt: integer("played_at").notNull(),
  },
  (t) => [
    index("history_user").on(t.userId),
    uniqueIndex("history_user_station").on(t.userId, t.stationId),
  ],
);

export const suggestions = sqliteTable(
  "suggestions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    genre: text("genre").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [
    uniqueIndex("suggestions_user_genre").on(t.userId, t.genre),
    index("suggestions_user").on(t.userId),
  ],
);

export const playbackSessions = sqliteTable(
  "playback_sessions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    stationId: text("station_id").notNull(),
    snapshot: text("snapshot").notNull(),
    source: text("source").notNull(),
    startedAt: integer("started_at").notNull(),
    endedAt: integer("ended_at").notNull(),
    durationMs: integer("duration_ms").notNull(),
  },
  (t) => [index("playback_sessions_user_started").on(t.userId, t.startedAt)],
);

export const userStationStatsHourly = sqliteTable(
  "user_station_stats_hourly",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    stationId: text("station_id").notNull(),
    bucket: text("bucket").notNull(),
    totalMs: integer("total_ms").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.stationId, t.bucket] }),
    index("user_station_stats_hourly_user_bucket").on(t.userId, t.bucket),
  ],
);

export const podcasts = sqliteTable("podcasts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  feedUrl: text("feed_url").notNull().unique(),
  title: text("title").notNull(),
  author: text("author"),
  description: text("description"),
  imageUrl: text("image_url"),
  language: text("language"),
  link: text("link"),
  categories: text("categories").notNull().default("[]"),
  lastFetchedAt: integer("last_fetched_at"),
  etag: text("etag"),
  lastModified: text("last_modified"),
  lastError: text("last_error"),
  errorCount: integer("error_count").notNull().default(0),
  createdAt: integer("created_at").notNull(),
});

export const podcastEpisodes = sqliteTable(
  "podcast_episodes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    podcastId: integer("podcast_id")
      .notNull()
      .references(() => podcasts.id, { onDelete: "cascade" }),
    guid: text("guid").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    audioUrl: text("audio_url").notNull(),
    publishedAt: integer("published_at"),
    durationSec: integer("duration_sec"),
    imageUrl: text("image_url"),
    episodeNumber: integer("episode_number"),
    seasonNumber: integer("season_number"),
    explicit: integer("explicit").notNull().default(0),
    lastSeenAt: integer("last_seen_at"),
    removedAt: integer("removed_at"),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [
    uniqueIndex("podcast_episodes_podcast_guid").on(t.podcastId, t.guid),
    index("podcast_episodes_podcast_published").on(t.podcastId, t.publishedAt),
  ],
);

export const podcastSubscriptions = sqliteTable(
  "podcast_subscriptions",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    podcastId: integer("podcast_id")
      .notNull()
      .references(() => podcasts.id, { onDelete: "cascade" }),
    subscribedAt: integer("subscribed_at").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.podcastId] }),
    index("podcast_subscriptions_user").on(t.userId),
    index("podcast_subscriptions_podcast").on(t.podcastId),
  ],
);

export const podcastProgress = sqliteTable(
  "podcast_progress",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    episodeId: integer("episode_id")
      .notNull()
      .references(() => podcastEpisodes.id, { onDelete: "cascade" }),
    positionSec: integer("position_sec").notNull(),
    durationSec: integer("duration_sec"),
    completedAt: integer("completed_at"),
    dismissedAt: integer("dismissed_at"),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.episodeId] }),
    index("podcast_progress_user_updated").on(t.userId, t.updatedAt),
  ],
);

export const podcastListenSessions = sqliteTable(
  "podcast_listen_sessions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    episodeId: integer("episode_id")
      .notNull()
      .references(() => podcastEpisodes.id, { onDelete: "cascade" }),
    podcastId: integer("podcast_id")
      .notNull()
      .references(() => podcasts.id, { onDelete: "cascade" }),
    clientSessionId: text("client_session_id").notNull(),
    source: text("source").notNull(),
    startedAt: integer("started_at").notNull(),
    endedAt: integer("ended_at").notNull(),
    listenedMs: integer("listened_ms").notNull(),
    lastPositionSec: integer("last_position_sec"),
    durationSec: integer("duration_sec"),
    completed: integer("completed").notNull().default(0),
    completedAt: integer("completed_at"),
    lastSequence: integer("last_sequence").notNull().default(0),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [
    uniqueIndex("podcast_listen_sessions_user_client_session").on(t.userId, t.clientSessionId),
    index("podcast_listen_sessions_user_started").on(t.userId, t.startedAt),
    index("podcast_listen_sessions_user_podcast").on(t.userId, t.podcastId),
    index("podcast_listen_sessions_user_episode").on(t.userId, t.episodeId),
  ],
);

export const userPodcastStatsHourly = sqliteTable(
  "user_podcast_stats_hourly",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    podcastId: integer("podcast_id")
      .notNull()
      .references(() => podcasts.id, { onDelete: "cascade" }),
    episodeId: integer("episode_id")
      .notNull()
      .references(() => podcastEpisodes.id, { onDelete: "cascade" }),
    bucket: text("bucket").notNull(),
    totalMs: integer("total_ms").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.episodeId, t.bucket] }),
    index("user_podcast_stats_hourly_user_podcast_bucket").on(t.userId, t.podcastId, t.bucket),
  ],
);

export const podcastFavorites = sqliteTable(
  "podcast_favorites",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    episodeId: integer("episode_id")
      .notNull()
      .references(() => podcastEpisodes.id, { onDelete: "cascade" }),
    createdAt: integer("created_at").notNull(),
    position: integer("position"),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.episodeId] }),
    index("podcast_favorites_user_created").on(t.userId, t.createdAt),
  ],
);

export const podcastQueueState = sqliteTable("podcast_queue_state", {
  userId: integer("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  revision: integer("revision").notNull().default(0),
  updatedAt: integer("updated_at").notNull(),
});

export const podcastQueueItems = sqliteTable(
  "podcast_queue_items",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    episodeId: integer("episode_id")
      .notNull()
      .references(() => podcastEpisodes.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    addedAt: integer("added_at").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.episodeId] }),
    index("podcast_queue_items_user_position").on(t.userId, t.position),
  ],
);