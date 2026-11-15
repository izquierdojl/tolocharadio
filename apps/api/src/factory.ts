import type { Config } from "./config/env.js";
import type { DB } from "./db/client.js";
import { JwtService } from "./lib/jwt.js";
import type { AppContext } from "./context.js";
import { AuthService } from "./services/auth.js";
import { CustomStationsService } from "./services/customStations.js";
import { FavoritesService } from "./services/favorites.js";
import { HistoryService } from "./services/history.js";
import { NowPlayingService } from "./services/nowPlaying.js";
import { PodcastCatalogService } from "./services/podcasts/catalog.js";
import { PodcastDiscoveryService } from "./services/podcasts/discovery.js";
import { PodcastFavoritesService } from "./services/podcasts/favorites.js";
import { PodcastProgressService } from "./services/podcasts/progress.js";
import { PodcastQueueService } from "./services/podcasts/queue.js";
import { PodcastRefreshService } from "./services/podcasts/refreshScheduler.js";
import { PodcastStatsService } from "./services/podcasts/stats.js";
import { PodcastSubscriptionsService } from "./services/podcasts/subscriptions.js";
import { StationsService } from "./services/stations.js";
import { StatsService } from "./services/stats.js";
import { SuggestionsService } from "./services/suggestions.js";

export function createContext(config: Config, db: DB): AppContext {
  const jwt = new JwtService(config);
  const customStations = new CustomStationsService(db);
  const stations = new StationsService(config, customStations);
  const auth = new AuthService({ config, db, jwt });
  const favorites = new FavoritesService(db, stations);
  const history = new HistoryService(db, config, stations);
  const stats = new StatsService(db, config);
  const suggestions = new SuggestionsService(db);
  const nowPlaying = new NowPlayingService({ userAgent: config.radioBrowserAppName });
  const podcastCatalog = new PodcastCatalogService(db, config);
  const podcastSubscriptions = new PodcastSubscriptionsService(db, config, podcastCatalog);
  const podcastDiscovery = new PodcastDiscoveryService(config);
  const podcastRefresh = new PodcastRefreshService(db, config, podcastCatalog);
  const podcastProgress = new PodcastProgressService(db, config, podcastCatalog);
  const podcastQueue = new PodcastQueueService(db, config, podcastCatalog);
  const podcastFavorites = new PodcastFavoritesService(db, podcastCatalog);
  const podcastStats = new PodcastStatsService(db, config);
  return {
    config,
    db,
    jwt,
    auth,
    stations,
    customStations,
    favorites,
    history,
    stats,
    suggestions,
    nowPlaying,
    podcastCatalog,
    podcastSubscriptions,
    podcastDiscovery,
    podcastRefresh,
    podcastProgress,
    podcastQueue,
    podcastFavorites,
    podcastStats,
  };
}