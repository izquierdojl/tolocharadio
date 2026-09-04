import type { Config, PublicUser, UserDefaultView, UserTheme } from "./config/env.js";
import type { DB } from "./db/client.js";
import type { JwtService } from "./lib/jwt.js";
import type { AuthService } from "./services/auth.js";
import type { CustomStationsService } from "./services/customStations.js";
import type { FavoritesService } from "./services/favorites.js";
import type { HistoryService } from "./services/history.js";
import type { StationsService } from "./services/stations.js";
import type { SuggestionsService } from "./services/suggestions.js";

export interface UserIdentity {
  id: number;
  email: string;
  name: string | null;
  theme: UserTheme;
  defaultView: UserDefaultView;
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
  suggestions: SuggestionsService;
}

export function toPublicUser(user: UserIdentity): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    theme: user.theme,
    defaultView: user.defaultView,
    createdAt: user.createdAt,
  };
}