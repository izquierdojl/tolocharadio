import type { Config } from "./config/env.js";
import type { DB } from "./db/client.js";
import { JwtService } from "./lib/jwt.js";
import type { AppContext } from "./context.js";
import { AuthService } from "./services/auth.js";
import { CustomStationsService } from "./services/customStations.js";
import { FavoritesService } from "./services/favorites.js";
import { HistoryService } from "./services/history.js";
import { StationsService } from "./services/stations.js";
import { SuggestionsService } from "./services/suggestions.js";

export function createContext(config: Config, db: DB): AppContext {
  const jwt = new JwtService(config);
  const customStations = new CustomStationsService(db);
  const stations = new StationsService(config, customStations);
  const auth = new AuthService({ config, db, jwt });
  const favorites = new FavoritesService(db, stations);
  const history = new HistoryService(db, config, stations);
  const suggestions = new SuggestionsService(db);
  return { config, db, jwt, auth, stations, customStations, favorites, history, suggestions };
}