import type { Config, PublicUser, UserDefaultSection, UserDefaultView, UserTheme } from "./config/env.js";
import type { DB } from "./db/client.js";
import type { JwtService } from "./lib/jwt.js";
import type { AuthService } from "./services/auth.js";
import type { CustomStationsService } from "./services/customStations.js";
import type { FavoritesService } from "./services/favorites.js";
import type { HistoryService } from "./services/history.js";
import type { NowPlayingService } from "./services/nowPlaying.js";
import type { PodcastCatalogService } from "./services/podcasts/catalog.js";
import type { PodcastDiscoveryService } from "./services/podcasts/discovery.js";
import type { PodcastFavoritesService } from "./services/podcasts/favorites.js";
import type { PodcastProgressService } from "./services/podcasts/progress.js";
import type { PodcastQueueService } from "./services/podcasts/queue.js";
import type { PodcastRefreshService } from "./services/podcasts/refreshScheduler.js";
import type { PodcastStatsService } from "./services/podcasts/stats.js";
import type { PodcastSubscriptionsService } from "./services/podcasts/subscriptions.js";
import type { StationsService } from "./services/stations.js";
import type { StatsService } from "./services/stats.js";
import type { SuggestionsService } from "./services/suggestions.js";

export interface UserIdentity {
  id: number;
  email: string;
  name: string | null;
  theme: UserTheme;
  defaultView: UserDefaultView;
  defaultSection?: UserDefaultSection;
  createdAt: number;
}

export interface AppContext {
  config: Config;
  db: DB;
  jwt: JwtService;
  auth: AuthService;
  stations: StationsService;
  customStations: CustomStationsService;
  favorites: FavoritesService;
  history: HistoryService;
  stats: StatsService;
  suggestions: SuggestionsService;
  nowPlaying: NowPlayingService;
  podcastCatalog: PodcastCatalogService;
  podcastSubscriptions: PodcastSubscriptionsService;
  podcastDiscovery: PodcastDiscoveryService;
  podcastRefresh: PodcastRefreshService;
  podcastProgress: PodcastProgressService;
  podcastQueue: PodcastQueueService;
  podcastFavorites: PodcastFavoritesService;
  podcastStats: PodcastStatsService;
}

export function toPublicUser(user: UserIdentity): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    theme: user.theme,
    defaultView: user.defaultView,
    defaultSection: user.defaultSection ?? "radio",
    createdAt: user.createdAt,
  };
}