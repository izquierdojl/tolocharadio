import { describe, expect, it } from "vitest";
import {
  issuePodcastPlaybackToken,
  validatePodcastPlaybackQuery,
  verifyPodcastPlaybackSignature,
} from "../src/services/podcasts/playbackToken.js";

describe("playbackToken", () => {
  const SECRET = "test-secret-with-at-least-32-characters-123456";

  it("emite y valida una URL firmada para un usuario y episodio", () => {
    const nowMs = 1_700_000_000_000;
    const issued = issuePodcastPlaybackToken({
      secret: SECRET,
      basePath: "/api/v1",
      userId: 7,
      episodeId: 42,
      ttlMs: 21_600_000,
      nowMs,
    });

    const parsed = new URL(issued.url, "https://radio.example.org");
    expect(parsed.pathname).toBe("/api/v1/podcasts/episodes/42/stream");

    const validated = validatePodcastPlaybackQuery({
      secret: SECRET,
      episodeId: 42,
      rawUserId: parsed.searchParams.get("u"),
      rawExp: parsed.searchParams.get("exp"),
      rawSig: parsed.searchParams.get("sig"),
      nowMs: nowMs + 60_000,
    });
    expect(validated.userId).toBe(7);
  });

  it("rechaza firmas de otro episodio o usuario y tokens expirados", () => {
    const nowMs = 1_700_000_000_000;
    const issued = issuePodcastPlaybackToken({
      secret: SECRET,
      basePath: "/api/v1",
      userId: 7,
      episodeId: 42,
      ttlMs: 60_000,
      nowMs,
    });
    const parsed = new URL(issued.url, "https://radio.example.org");

    expect(() =>
      validatePodcastPlaybackQuery({
        secret: SECRET,
        episodeId: 99,
        rawUserId: parsed.searchParams.get("u"),
        rawExp: parsed.searchParams.get("exp"),
        rawSig: parsed.searchParams.get("sig"),
        nowMs,
      }),
    ).toThrow(/Firma/);

    expect(() =>
      validatePodcastPlaybackQuery({
        secret: SECRET,
        episodeId: 42,
        rawUserId: parsed.searchParams.get("u"),
        rawExp: parsed.searchParams.get("exp"),
        rawSig: parsed.searchParams.get("sig"),
        nowMs: nowMs + 120_000,
      }),
    ).toThrow(/caducado/);

    expect(verifyPodcastPlaybackSignature(SECRET, 7, 42, 1700000060, "no-hex")).toBe(false);
  });
});
