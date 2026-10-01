import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  theme: text("theme").notNull().default("dark"),
  defaultView: text("default_view").notNull().default("explorar"),
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