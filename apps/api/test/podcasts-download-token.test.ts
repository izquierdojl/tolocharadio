import { describe, expect, it } from "vitest";
import {
  issuePodcastDownloadToken,
  issuePodcastPlaybackToken,
  validatePodcastDownloadQuery,
  validatePodcastPlaybackQuery,
} from "../src/services/podcasts/playbackToken.js";

const SECRET = "test-secret-with-at-least-32-characters-123456";

function queryFrom(url: string) {
  const parsed = new URL(url, "https://radio.example.org");
  return {
    path: parsed.pathname,
    rawUserId: parsed.searchParams.get("u"),
    rawExp: parsed.searchParams.get("exp"),
    rawSig: parsed.searchParams.get("sig"),
  };
}

function errorCode(fn: () => unknown): string {
  try {
    fn();
  } catch (err) {
    return (err as { code?: string }).code ?? "UNKNOWN";
  }
  return "NO_ERROR";
}

describe("downloadToken", () => {
  const nowMs = 1_700_000_000_000;

  it("emite una URL de descarga y la valida", () => {
    const issued = issuePodcastDownloadToken({
      secret: SECRET,
      basePath: "/api/v1",
      userId: 7,
      episodeId: 42,
      ttlMs: 21_600_000,
      nowMs,
    });

    const query = queryFrom(issued.url);
    expect(query.path).toBe("/api/v1/podcasts/episodes/42/download");

    const validated = validatePodcastDownloadQuery({
      secret: SECRET,
      episodeId: 42,
      rawUserId: query.rawUserId,
      rawExp: query.rawExp,
      rawSig: query.rawSig,
      nowMs: nowMs + 60_000,
    });
    expect(validated.userId).toBe(7);
  });

  it("un token de reproducción no vale como descarga", () => {
    const issued = issuePodcastPlaybackToken({
      secret: SECRET,
      basePath: "/api/v1",
      userId: 7,
      episodeId: 42,
      ttlMs: 60_000,
      nowMs,
    });
    const query = queryFrom(issued.url);

    expect(
      errorCode(() =>
        validatePodcastDownloadQuery({
          secret: SECRET,
          episodeId: 42,
          rawUserId: query.rawUserId,
          rawExp: query.rawExp,
          rawSig: query.rawSig,
          nowMs,
        }),
      ),
    ).toBe("DOWNLOAD_TOKEN_FORBIDDEN");
  });

  it("un token de descarga no vale como reproducción", () => {
    const issued = issuePodcastDownloadToken({
      secret: SECRET,
      basePath: "/api/v1",
      userId: 7,
      episodeId: 42,
      ttlMs: 60_000,
      nowMs,
    });
    const query = queryFrom(issued.url);

    expect(
      errorCode(() =>
        validatePodcastPlaybackQuery({
          secret: SECRET,
          episodeId: 42,
          rawUserId: query.rawUserId,
          rawExp: query.rawExp,
          rawSig: query.rawSig,
          nowMs,
        }),
      ),
    ).toBe("PLAYBACK_TOKEN_FORBIDDEN");
  });

  it("rechaza un token de descarga expirado", () => {
    const issued = issuePodcastDownloadToken({
      secret: SECRET,
      basePath: "/api/v1",
      userId: 7,
      episodeId: 42,
      ttlMs: 60_000,
      nowMs,
    });
    const query = queryFrom(issued.url);

    expect(
      errorCode(() =>
        validatePodcastDownloadQuery({
          secret: SECRET,
          episodeId: 42,
          rawUserId: query.rawUserId,
          rawExp: query.rawExp,
          rawSig: query.rawSig,
          nowMs: nowMs + 120_000,
        }),
      ),
    ).toBe("DOWNLOAD_TOKEN_EXPIRED");
  });
});
