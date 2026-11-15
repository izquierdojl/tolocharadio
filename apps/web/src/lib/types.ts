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

export type UserDefaultSection = "radio" | "podcasts";

export interface User {
  id: number;
  email: string;
  name: string | null;
  theme: UserTheme;
  defaultView: UserDefaultView;
  defaultSection?: UserDefaultSection;
  createdAt: number;
}

export interface UpdateProfileBody {
  name?: string;
  theme?: UserTheme;
  defaultView?: UserDefaultView;
  defaultSection?: UserDefaultSection;
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

export type PodcastDiscoveryProvider = "itunes" | "podcastindex" | "none";

export interface PublicConfigFeatures {
  radio: boolean;
  podcasts: boolean;
  podcastDiscovery: PodcastDiscoveryProvider;
  podcastOpml: boolean;
  podcastQueue: boolean;
  podcastFavorites: boolean;
  podcastStats: boolean;
  podcastDownloads: boolean;
}

export interface PublicConfigLimits {
  podcastQueueMax: number;
  podcastSubscriptionsMax: number;
  podcastFeedMaxBytes: number;
  podcastEpisodesPageSize: number;
  podcastOpmlMaxFeeds: number;
}

export interface PublicConfigAuth {
  accessTokenTtlSec: number;
  playbackTokenTtlSec: number;
}

export interface PublicConfig {
  appName: string;
  version?: string;
  apiVersion?: number;
  registrationEnabled: boolean;
  features?: PublicConfigFeatures;
  limits?: PublicConfigLimits;
  auth?: PublicConfigAuth;
}

export type PlaybackRate = 1 | 1.25 | 1.5 | 2;

export interface PodcastSummary {
  id: number;
  feedUrl: string;
  title: string;
  author: string | null;
  description: string | null;
  imageUrl: string | null;
  language: string | null;
  link: string | null;
  categories: string[];
  lastFetchedAt: number | null;
  episodeCount: number;
  isSubscribed: boolean;
  subscribedAt?: number | null;
}

export interface PodcastEpisodeProgress {
  positionSec: number;
  durationSec: number | null;
  completed: boolean;
  completedAt: number | null;
  updatedAt: number;
}

export interface PodcastEpisode {
  id: number;
  podcastId: number;
  title: string;
  description: string | null;
  publishedAt: number | null;
  durationSec: number | null;
  imageUrl: string | null;
  episodeNumber: number | null;
  seasonNumber: number | null;
  explicit: boolean;
  progress: PodcastEpisodeProgress | null;
  isFavorite?: boolean;
}

export interface PodcastSearchResult {
  title: string;
  author: string | null;
  feedUrl: string;
  imageUrl: string | null;
  categories: string[];
  description: string | null;
}

export interface PodcastEpisodePage {
  items: PodcastEpisode[];
  pagination: { offset: number; limit: number; hasMore: boolean };
}

export interface PodcastQueue {
  revision: number;
  updatedAt: number | null;
  limit: number;
  items: PodcastEpisode[];
}

export interface PodcastQueueSummary {
  revision: number;
  count: number;
  limit: number;
  next: PodcastEpisode | null;
}

export interface PodcastHome {
  continueListening: PodcastEpisode[];
  latestEpisodes: PodcastEpisode[];
  subscriptions: PodcastSummary[];
  queue: PodcastQueueSummary;
}

export interface BulkSubscriptionResult {
  imported: number;
  skipped: number;
  failed: number;
  items: PodcastSummary[];
  errors: Array<{ feedUrl: string; message: string }>;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    status: number;
    details?: Array<{ field: string; message: string }>;
  };
}