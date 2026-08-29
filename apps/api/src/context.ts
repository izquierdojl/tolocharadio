import type { Config, PublicUser } from "./config/env.js";
import type { DB } from "./db/client.js";
import type { JwtService } from "./lib/jwt.js";
import type { AuthService } from "./services/auth.js";
import type { FavoritesService } from "./services/favorites.js";
import type { HistoryService } from "./services/history.js";
import type { StationsService } from "./services/stations.js";

export interface UserIdentity {
  id: number;
  email: string;
  name: string | null;
  createdAt: number;
}

export interface AppContext {
  config: Config;
  db: DB;
  jwt: JwtService;
  auth: AuthService;
  stations: StationsService;
  favorites: FavoritesService;
  history: HistoryService;
}

export function toPublicUser(user: UserIdentity): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
  };
}