import { createHmac, timingSafeEqual } from "node:crypto";
import { badRequest, forbidden, unauthorized } from "../../errors.js";

export type PodcastTokenPurpose = "playback" | "download";

const SIGNING_CONTEXTS: Record<PodcastTokenPurpose, string> = {
  playback: "tolocharadio/podcast-playback/v1",
  download: "tolocharadio/podcast-download/v1",
};

const TOKEN_PATHS: Record<PodcastTokenPurpose, string> = {
  playback: "stream",
  download: "download",
};

const ERROR_PREFIXES: Record<PodcastTokenPurpose, string> = {
  playback: "PLAYBACK_TOKEN",
  download: "DOWNLOAD_TOKEN",
};

function signingKey(secret: string, purpose: PodcastTokenPurpose): Buffer {
  return createHmac("sha256", secret).update(SIGNING_CONTEXTS[purpose]).digest();
}

export function signPodcastToken(
  secret: string,
  purpose: PodcastTokenPurpose,
  userId: number,
  episodeId: number,
  expSec: number,
): string {
  return createHmac("sha256", signingKey(secret, purpose))
    .update(`${userId}\n${episodeId}\n${expSec}`)
    .digest("hex");
}

export function verifyPodcastTokenSignature(
  secret: string,
  purpose: PodcastTokenPurpose,
  userId: number,
  episodeId: number,
  expSec: number,
  signature: string,
): boolean {
  if (!/^[0-9a-f]{64}$/i.test(signature)) return false;
  const expected = Buffer.from(
    signPodcastToken(secret, purpose, userId, episodeId, expSec),
    "hex",
  );
  const provided = Buffer.from(signature, "hex");
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}

export function signPodcastPlayback(
  secret: string,
  userId: number,
  episodeId: number,
  expSec: number,
): string {
  return signPodcastToken(secret, "playback", userId, episodeId, expSec);
}

export function verifyPodcastPlaybackSignature(
  secret: string,
  userId: number,
  episodeId: number,
  expSec: number,
  signature: string,
): boolean {
  return verifyPodcastTokenSignature(secret, "playback", userId, episodeId, expSec, signature);
}

export function signPodcastDownload(
  secret: string,
  userId: number,
  episodeId: number,
  expSec: number,
): string {
  return signPodcastToken(secret, "download", userId, episodeId, expSec);
}

export function verifyPodcastDownloadSignature(
  secret: string,
  userId: number,
  episodeId: number,
  expSec: number,
  signature: string,
): boolean {
  return verifyPodcastTokenSignature(secret, "download", userId, episodeId, expSec, signature);
}

export interface IssuedPodcastToken {
  url: string;
  expiresAt: number;
}

export type IssuedPlaybackToken = IssuedPodcastToken;

export interface IssuePodcastTokenParams {
  secret: string;
  basePath: string;
  userId: number;
  episodeId: number;
  ttlMs: number;
  nowMs?: number;
}

export function issuePodcastToken(
  purpose: PodcastTokenPurpose,
  params: IssuePodcastTokenParams,
): IssuedPodcastToken {
  const nowMs = params.nowMs ?? Date.now();
  const expiresAt = nowMs + params.ttlMs;
  const expSec = Math.floor(expiresAt / 1000);
  const sig = signPodcastToken(params.secret, purpose, params.userId, params.episodeId, expSec);
  const url = `${params.basePath}/podcasts/episodes/${params.episodeId}/${TOKEN_PATHS[purpose]}?u=${params.userId}&exp=${expSec}&sig=${sig}`;
  return {
    url,
    expiresAt: expSec * 1000,
  };
}

export function issuePodcastPlaybackToken(params: IssuePodcastTokenParams): IssuedPlaybackToken {
  return issuePodcastToken("playback", params);
}

export function issuePodcastDownloadToken(params: IssuePodcastTokenParams): IssuedPodcastToken {
  return issuePodcastToken("download", params);
}

export interface ValidatePodcastTokenQueryParams {
  secret: string;
  purpose: PodcastTokenPurpose;
  episodeId: number;
  rawUserId: unknown;
  rawExp: unknown;
  rawSig: unknown;
  nowMs?: number;
}

export type ValidatePlaybackQueryParams = Omit<ValidatePodcastTokenQueryParams, "purpose">;

export function validatePodcastTokenQuery(params: ValidatePodcastTokenQueryParams): {
  userId: number;
  expSec: number;
} {
  const { secret, purpose, episodeId, rawUserId, rawExp, rawSig } = params;
  const prefix = ERROR_PREFIXES[purpose];
  const nowSec = Math.floor((params.nowMs ?? Date.now()) / 1000);

  if (typeof rawUserId !== "string" || !/^\d+$/.test(rawUserId)) {
    throw badRequest(
      `${prefix}_INVALID`,
      "Parametro de usuario invalido en token de podcast",
    );
  }
  if (typeof rawExp !== "string" || !/^\d+$/.test(rawExp)) {
    throw badRequest(`${prefix}_INVALID`, "Parametro exp invalido en token de podcast");
  }
  if (typeof rawSig !== "string" || rawSig.length === 0) {
    throw badRequest(`${prefix}_INVALID`, "Falta la firma del token de podcast");
  }

  const userId = Number(rawUserId);
  const expSec = Number(rawExp);
  if (!Number.isSafeInteger(userId) || userId <= 0 || !Number.isSafeInteger(expSec)) {
    throw badRequest(`${prefix}_INVALID`, "Token de podcast mal formado");
  }

  if (expSec <= nowSec) {
    throw unauthorized(`${prefix}_EXPIRED`, "El token de podcast ha caducado");
  }

  if (!verifyPodcastTokenSignature(secret, purpose, userId, episodeId, expSec, rawSig)) {
    throw forbidden(`${prefix}_FORBIDDEN`, "Firma de token de podcast invalida");
  }

  return { userId, expSec };
}

export function validatePodcastPlaybackQuery(params: ValidatePlaybackQueryParams): {
  userId: number;
  expSec: number;
} {
  return validatePodcastTokenQuery({ ...params, purpose: "playback" });
}

export function validatePodcastDownloadQuery(params: ValidatePlaybackQueryParams): {
  userId: number;
  expSec: number;
} {
  return validatePodcastTokenQuery({ ...params, purpose: "download" });
}
