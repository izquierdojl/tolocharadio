import type { Config } from "./config/env.js";
import type { DB } from "./db/client.js";
import { JwtService } from "./lib/jwt.js";
import type { AppContext } from "./context.js";
import { AuthService } from "./services/auth.js";
import { FavoritesService } from "./services/favorites.js";
import { HistoryService } from "./services/history.js";
import { StationsService } from "./services/stations.js";

export function createContext(config: Config, db: DB): AppContext {
  const jwt = new JwtService(config);
  const stations = new StationsService(config);
  const auth = new AuthService({ config, db, jwt });
  const favorites = new FavoritesService(db, stations);
  const history = new HistoryService(db, config, stations);
  return { config, db, jwt, auth, stations, favorites, history };
}