import { createHmac, timingSafeEqual } from "node:crypto";
import { badRequest, forbidden, unauthorized } from "../../errors.js";

const SIGNING_CONTEXT = "tolocharadio/podcast-playback/v1";

function signingKey(secret: string): Buffer {
  return createHmac("sha256", secret).update(SIGNING_CONTEXT).digest();
}

export function signPodcastPlayback(
  secret: string,
  userId: number,
  episodeId: number,
  expSec: number,
): string {
  return createHmac("sha256", signingKey(secret))
    .update(`${userId}\n${episodeId}\n${expSec}`)
    .digest("hex");
}

export function verifyPodcastPlaybackSignature(
  secret: string,
  userId: number,
  episodeId: number,
  expSec: number,
  signature: string,
): boolean {
  if (!/^[0-9a-f]{64}$/i.test(signature)) return false;
  const expected = Buffer.from(signPodcastPlayback(secret, userId, episodeId, expSec), "hex");
  const provided = Buffer.from(signature, "hex");
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}

export interface IssuedPlaybackToken {
  url: string;
  expiresAt: number;
}

export function issuePodcastPlaybackToken(params: {
  secret: string;
  basePath: string;
  userId: number;
  episodeId: number;
  ttlMs: number;
  nowMs?: number;
}): IssuedPlaybackToken {
  const nowMs = params.nowMs ?? Date.now();
  const expiresAt = nowMs + params.ttlMs;
  const expSec = Math.floor(expiresAt / 1000);
  const sig = signPodcastPlayback(params.secret, params.userId, params.episodeId, expSec);
  const url = `${params.basePath}/podcasts/episodes/${params.episodeId}/stream?u=${params.userId}&exp=${expSec}&sig=${sig}`;
  return {
    url,
    expiresAt: expSec * 1000,
  };
}

export interface ValidatePlaybackQueryParams {
  secret: string;
  episodeId: number;
  rawUserId: unknown;
  rawExp: unknown;
  rawSig: unknown;
  nowMs?: number;
}

export function validatePodcastPlaybackQuery(params: ValidatePlaybackQueryParams): {
  userId: number;
  expSec: number;
} {
  const { secret, episodeId, rawUserId, rawExp, rawSig } = params;
  const nowSec = Math.floor((params.nowMs ?? Date.now()) / 1000);

  if (typeof rawUserId !== "string" || !/^\d+$/.test(rawUserId)) {
    throw badRequest("PLAYBACK_TOKEN_INVALID", "Parametro de usuario invalido en token de reproduccion");
  }
  if (typeof rawExp !== "string" || !/^\d+$/.test(rawExp)) {
    throw badRequest("PLAYBACK_TOKEN_INVALID", "Parametro exp invalido en token de reproduccion");
  }
  if (typeof rawSig !== "string" || rawSig.length === 0) {
    throw badRequest("PLAYBACK_TOKEN_INVALID", "Falta la firma del token de reproduccion");
  }

  const userId = Number(rawUserId);
  const expSec = Number(rawExp);
  if (!Number.isSafeInteger(userId) || userId <= 0 || !Number.isSafeInteger(expSec)) {
    throw badRequest("PLAYBACK_TOKEN_INVALID", "Token de reproduccion mal formado");
  }

  if (expSec <= nowSec) {
    throw unauthorized("PLAYBACK_TOKEN_EXPIRED", "El token de reproduccion ha caducado");
  }

  if (!verifyPodcastPlaybackSignature(secret, userId, episodeId, expSec, rawSig)) {
    throw forbidden("PLAYBACK_TOKEN_FORBIDDEN", "Firma de token de reproduccion invalida");
  }

  return { userId, expSec };
}
