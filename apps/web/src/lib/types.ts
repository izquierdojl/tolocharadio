export interface Station {
  id: string;
  name: string;
  url: string;
  homepage: string | null;
  favicon: string | null;
  country: string | null;
  countryCode: string | null;
  language: string | null;
  tags: string[];
  codec: string | null;
  bitrate: number | null;
  isSsl: boolean;
  lastCheckOk: boolean | null;
  votes: number | null;
  clickCount: number | null;
  isCustom: boolean;
}

export type UserTheme = "light" | "dark";

export type UserDefaultView = "explorar" | "favoritos" | "historial";

export interface User {
  id: number;
  email: string;
  name: string | null;
  theme: UserTheme;
  defaultView: UserDefaultView;
  createdAt: number;
}

export interface UpdateProfileBody {
  name?: string;
  theme?: UserTheme;
  defaultView?: UserDefaultView;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface Page<T> {
  items: T[];
  pagination: { offset: number; limit: number; hasMore: boolean };
}

export interface StringListPage {
  items: string[];
}

export interface FavoriteEntry {
  addedAt: number;
  station: Station;
}

export interface Suggestion {
  id: number;
  genre: string;
}

export interface HistoryEntry {
  playedAt: number;
  station: Station;
}

export interface PublicConfig {
  appName: string;
  registrationEnabled: boolean;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    status: number;
    details?: Array<{ field: string; message: string }>;
  };
}