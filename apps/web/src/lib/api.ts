import type { ApiErrorBody, AuthResponse, PublicConfig, Station, StringListPage, Suggestion } from "./types.js";

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
  if (!accessToken) return false;
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

export function playbackUrl(stationId: string): string {
  return `${API_PREFIX}/playback/${encodeURIComponent(stationId)}`;
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