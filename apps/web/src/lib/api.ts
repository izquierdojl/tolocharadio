import type {
  ApiErrorBody,
  AuthResponse,
  BulkSubscriptionResult,
  PodcastEpisode,
  PodcastEpisodePage,
  PodcastEpisodeProgress,
  PodcastHome,
  PodcastQueue,
  PodcastSearchResult,
  PodcastSummary,
  PublicConfig,
  Station,
  StringListPage,
  Suggestion,
} from "./types.js";

const API_PREFIX = "/api/v1";

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function parseError(res: Response): Promise<ApiError> {
  let body: ApiErrorBody | undefined;
  try {
    body = (await res.json()) as ApiErrorBody;
  } catch {
    body = undefined;
  }
  const message = body?.error?.message ?? "Error inesperado del servidor";
  const code = body?.error?.code ?? "UNKNOWN";
  return new ApiError(res.status, code, message);
}

async function rawRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(`${API_PREFIX}${path}`, { ...init, headers, credentials: "same-origin" });
  if (!res.ok) {
    throw await parseError(res);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

async function doRefresh(): Promise<string | null> {
  const res = await fetch(`${API_PREFIX}/auth/refresh`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  if (!res.ok) {
    return null;
  }
  const data = (await res.json()) as AuthResponse;
  accessToken = data.accessToken;
  return data.accessToken;
}

export function refreshSession(): Promise<string | null> {
  refreshPromise ??= doRefresh().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

const REFRESH_MARGIN_MS = 30_000;

function decodeExp(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = parts[1]!;
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof json.exp === "number" ? json.exp : null;
  } catch {
    return null;
  }
}

export async function ensureValidToken(): Promise<boolean> {
  if (!accessToken) {
    const token = await refreshSession();
    return token !== null;
  }
  const exp = decodeExp(accessToken);
  if (exp === null) return true;
  const expiresAtMs = exp * 1000;
  if (expiresAtMs - Date.now() < REFRESH_MARGIN_MS) {
    const newToken = await refreshSession();
    return newToken !== null;
  }
  return true;
}

async function request<T>(path: string, init?: RequestInit, retried = false): Promise<T> {
  try {
    return await rawRequest<T>(path, init);
  } catch (err) {
    const isAuth = path.startsWith("/auth/");
    if (!retried && err instanceof ApiError && err.status === 401 && !isAuth) {
      const token = await refreshSession();
      if (token) {
        return rawRequest<T>(path, init);
      }
    }
    throw err;
  }
}

export const api = {
  get: <T>(path: string): Promise<T> => request<T>(path),
  post: <T>(path: string, body?: unknown): Promise<T> =>
    request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown): Promise<T> =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown): Promise<T> =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: <T>(path: string): Promise<T> => request<T>(path, { method: "DELETE" }),
};

export function reorderFavorites(stationIds: string[]): Promise<{ ok: true }> {
  return api.put<{ ok: true }>("/favorites/order", { stationIds });
}

export function fetchPublicConfig(): Promise<PublicConfig> {
  return request<PublicConfig>("/config", undefined, true);
}

export interface PlaybackStatus {
  id: string;
  playable: boolean;
  reason?: string;
}

export function playbackUrl(stationId: string, attempt?: number): string {
  const suffix = attempt === undefined ? "" : `?r=${attempt}`;
  return `${API_PREFIX}/playback/${encodeURIComponent(stationId)}${suffix}`;
}

export function livePlaybackUrl(stationId: string, attempt = 0): string {
  return `${API_PREFIX}/playback/${encodeURIComponent(stationId)}/live?r=${attempt}`;
}

export function fetchPlaybackStatus(stationId: string): Promise<PlaybackStatus> {
  return api.get<PlaybackStatus>(`/playback/${encodeURIComponent(stationId)}/status`);
}

export interface NowPlaying {
  id: string;
  title: string | null;
}

export function fetchNowPlaying(stationId: string): Promise<NowPlaying> {
  return api.get<NowPlaying>(`/playback/${encodeURIComponent(stationId)}/now-playing`);
}

export function fetchCatalogCountries(): Promise<StringListPage> {
  return api.get<StringListPage>("/stations/countries");
}

export function fetchCatalogLanguages(): Promise<StringListPage> {
  return api.get<StringListPage>("/stations/languages");
}

export function fetchCatalogTags(): Promise<StringListPage> {
  return api.get<StringListPage>("/stations/tags");
}

export function fetchCustomStations(): Promise<{ items: Station[] }> {
  return api.get<{ items: Station[] }>("/custom-stations");
}

export function createCustomStation(name: string, url: string): Promise<{ station: Station }> {
  return api.post<{ station: Station }>("/custom-stations", { name, url });
}

export function deleteCustomStation(id: string): Promise<{ ok: true }> {
  return api.delete<{ ok: true }>(`/custom-stations/${encodeURIComponent(id)}`);
}

export function fetchSuggestions(): Promise<{ items: Suggestion[] }> {
  return api.get<{ items: Suggestion[] }>("/suggestions");
}

export function createSuggestion(genre: string): Promise<{ suggestion: Suggestion }> {
  return api.post<{ suggestion: Suggestion }>("/suggestions", { genre });
}

export function deleteSuggestion(id: number): Promise<{ ok: true }> {
  return api.delete<{ ok: true }>(`/suggestions/${id}`);
}

export interface IssuedPlaybackToken {
  url: string;
  expiresAt: number;
}

export function issueEpisodePlaybackToken(episodeId: number): Promise<IssuedPlaybackToken> {
  return api.post<IssuedPlaybackToken>(`/podcasts/episodes/${episodeId}/playback`);
}

export interface UpsertEpisodeProgressPayload {
  sessionId: string;
  sequence: number;
  positionSec: number;
  durationSec?: number | null;
  listenedMs: number;
  completed?: boolean;
  occurredAt?: number;
  source?: "web" | "android" | "desktop";
}

export function saveEpisodeProgress(
  episodeId: number,
  payload: UpsertEpisodeProgressPayload,
  keepalive = false,
): Promise<{ progress: PodcastEpisodeProgress }> {
  return request<{ progress: PodcastEpisodeProgress }>(
    `/podcasts/episodes/${episodeId}/progress`,
    {
      method: keepalive ? "POST" : "PUT",
      body: JSON.stringify(payload),
      keepalive,
    },
  );
}

async function requestText(path: string, retried = false): Promise<string> {
  const headers = new Headers();
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  const res = await fetch(`${API_PREFIX}${path}`, { headers, credentials: "same-origin" });
  if (!res.ok) {
    if (!retried && res.status === 401) {
      const token = await refreshSession();
      if (token) return requestText(path, true);
    }
    throw await parseError(res);
  }
  return res.text();
}

export function searchPodcasts(q: string, limit = 20): Promise<{ items: PodcastSearchResult[] }> {
  const params = new URLSearchParams({ q, limit: String(limit) });
  return api.get<{ items: PodcastSearchResult[] }>(`/podcasts/search?${params.toString()}`);
}

export function resolvePodcastFeed(
  feedUrl: string,
): Promise<{ podcast: PodcastSummary; episodes: PodcastEpisodePage }> {
  return api.post<{ podcast: PodcastSummary; episodes: PodcastEpisodePage }>("/podcasts/resolve", {
    feedUrl,
  });
}

export function fetchPodcast(podcastId: number): Promise<{ podcast: PodcastSummary }> {
  return api.get<{ podcast: PodcastSummary }>(`/podcasts/${podcastId}`);
}

export function fetchPodcastEpisodes(
  podcastId: number,
  params: { sort?: string; filter?: string; offset?: number; limit?: number } = {},
): Promise<PodcastEpisodePage> {
  const q = new URLSearchParams();
  if (params.sort) q.set("sort", params.sort);
  if (params.filter) q.set("filter", params.filter);
  if (params.offset !== undefined) q.set("offset", String(params.offset));
  if (params.limit !== undefined) q.set("limit", String(params.limit));
  const suffix = q.toString() ? `?${q.toString()}` : "";
  return api.get<PodcastEpisodePage>(`/podcasts/${podcastId}/episodes${suffix}`);
}

export function fetchPodcastSubscriptions(): Promise<{ items: PodcastSummary[] }> {
  return api.get<{ items: PodcastSummary[] }>("/podcasts/subscriptions");
}

export function subscribePodcast(input: {
  podcastId?: number;
  feedUrl?: string;
}): Promise<{ podcast: PodcastSummary }> {
  return api.post<{ podcast: PodcastSummary }>("/podcasts/subscriptions", input);
}

export function unsubscribePodcast(podcastId: number): Promise<{ ok: true }> {
  return api.delete<{ ok: true }>(`/podcasts/subscriptions/${podcastId}`);
}

export function bulkSubscribePodcasts(feedUrls: string[]): Promise<BulkSubscriptionResult> {
  return api.post<BulkSubscriptionResult>("/podcasts/subscriptions/bulk", { feedUrls });
}

export function fetchPodcastOpml(): Promise<string> {
  return requestText("/podcasts/subscriptions/opml");
}

export function fetchPodcastHome(): Promise<PodcastHome> {
  return api.get<PodcastHome>("/podcasts/home");
}

export function fetchPodcastQueue(): Promise<{ queue: PodcastQueue }> {
  return api.get<{ queue: PodcastQueue }>("/podcasts/queue");
}

export function fetchPodcastQueueCount(): Promise<{ count: number; limit: number }> {
  return api.get<{ count: number; limit: number }>("/podcasts/queue/count");
}

export function dismissPodcastEpisode(episodeId: number): Promise<{ dismissed: boolean }> {
  return api.post<{ dismissed: boolean }>(`/podcasts/episodes/${episodeId}/dismiss`);
}

export function addEpisodeToQueue(
  episodeId: number,
  position: "end" | "next" = "end",
): Promise<{ queue: PodcastQueue }> {
  return api.post<{ queue: PodcastQueue }>("/podcasts/queue", { episodeId, position });
}

export function removeEpisodeFromQueue(episodeId: number): Promise<{ queue: PodcastQueue }> {
  return api.delete<{ queue: PodcastQueue }>(`/podcasts/queue/${episodeId}`);
}

export function reorderPodcastQueue(
  baseRevision: number,
  episodeIds: number[],
): Promise<{ queue: PodcastQueue }> {
  return api.put<{ queue: PodcastQueue }>("/podcasts/queue/order", {
    baseRevision,
    episodeIds,
  });
}

export function fetchPodcastFavorites(): Promise<{ items: PodcastEpisode[] }> {
  return api.get<{ items: PodcastEpisode[] }>("/podcasts/favorites");
}

export function addPodcastFavorite(episodeId: number): Promise<{ episode: PodcastEpisode }> {
  return api.post<{ episode: PodcastEpisode }>("/podcasts/favorites", { episodeId });
}

export function removePodcastFavorite(episodeId: number): Promise<{ ok: true }> {
  return api.delete<{ ok: true }>(`/podcasts/favorites/${episodeId}`);
}