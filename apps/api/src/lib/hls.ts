import { createHmac, timingSafeEqual } from "node:crypto";
import { badRequest, forbidden, serviceUnavailable } from "../errors.js";

export const HLS_MAX_DEPTH = 2;
export const HLS_MANIFEST_CONTENT_TYPE = "application/vnd.apple.mpegurl";

const SIGNING_CONTEXT = "tolocharadio/hls-subresource/v1";
const URI_ATTRIBUTE_REGEX = /URI="([^"]*)"/gi;
const URI_ATTRIBUTE_PREFIX = 'URI="';

function signingKey(secret: string): Buffer {
  return createHmac("sha256", secret).update(SIGNING_CONTEXT).digest();
}

export function signSubresource(
  secret: string,
  stationId: string,
  depth: number,
  url: string,
): string {
  return createHmac("sha256", signingKey(secret))
    .update(`${stationId}\n${depth}\n${url}`)
    .digest("hex");
}

export function verifySubresource(
  secret: string,
  stationId: string,
  depth: number,
  url: string,
  signature: string,
): boolean {
  const expected = Buffer.from(signSubresource(secret, stationId, depth, url), "hex");
  const provided = Buffer.from(signature, "hex");
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}

export function buildSubresourceUrl(
  secret: string,
  stationId: string,
  basePath: string,
  url: string,
  depth: number,
): string {
  const encoded = Buffer.from(url, "utf8").toString("base64url");
  const signature = signSubresource(secret, stationId, depth, url);
  const path = `${basePath}/playback/${encodeURIComponent(stationId)}/hls`;
  return `${path}?u=${encoded}&d=${depth}&s=${signature}`;
}

export interface SubresourceRequest {
  secret: string;
  stationId: string;
  rawUrl: unknown;
  rawDepth: unknown;
  signature: unknown;
}

export interface ValidatedSubresource {
  url: string;
  depth: number;
}

export function validateSubresourceRequest(params: SubresourceRequest): ValidatedSubresource {
  const { secret, stationId, rawUrl, rawDepth, signature } = params;
  const invalid = () => badRequest("HLS_INVALID_URL", "Peticion de subrecurso HLS invalida");

  if (typeof rawUrl !== "string" || rawUrl.length === 0) throw invalid();
  if (typeof rawDepth !== "string" || !/^\d+$/.test(rawDepth)) throw invalid();
  if (typeof signature !== "string" || signature.length === 0) throw invalid();

  const depth = Number(rawDepth);
  if (!Number.isInteger(depth) || depth < 0 || depth > HLS_MAX_DEPTH) throw invalid();

  const decoded = Buffer.from(rawUrl, "base64url").toString("utf8");
  let parsed: URL;
  try {
    parsed = new URL(decoded);
  } catch {
    throw invalid();
  }
  if (parsed.protocol !== "https:") throw invalid();

  if (!verifySubresource(secret, stationId, depth, decoded, signature)) {
    throw forbidden("HLS_INVALID_SIGNATURE", "Firma de subrecurso HLS invalida");
  }

  return { url: decoded, depth };
}

export function looksLikeHlsBody(text: string): boolean {
  return text.replace(/^\uFEFF/, "").trimStart().startsWith("#EXTM3U");
}

export function isHlsManifest(url: string, contentType: string | null, body?: string): boolean {
  if (body !== undefined && looksLikeHlsBody(body)) return true;
  const type = (contentType ?? "").toLowerCase();
  if (type.includes("mpegurl")) return true;
  try {
    return new URL(url).pathname.toLowerCase().endsWith(".m3u8");
  } catch {
    return false;
  }
}

export interface HlsRewriteOptions {
  baseUrl: string;
  depth: number;
  rewriteUri: (absoluteUrl: string, depth: number) => string;
}

export function rewriteHlsManifest(text: string, options: HlsRewriteOptions): string {
  const { baseUrl, depth, rewriteUri } = options;
  const nextDepth = depth + 1;

  const resolve = (raw: string): string => {
    let resolved: URL;
    try {
      resolved = new URL(raw, baseUrl);
    } catch {
      throw serviceUnavailable("PLAYLIST_MALFORMED", "El manifiesto HLS no es valido");
    }
    if (resolved.protocol !== "https:") {
      throw serviceUnavailable(
        "PLAYLIST_INSECURE_ONLY",
        "La emisora solo ofrece conexiones no seguras (HTTP)",
      );
    }
    return rewriteUri(resolved.toString(), nextDepth);
  };

  return text
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      if (trimmed.startsWith("#")) {
        return line.replace(URI_ATTRIBUTE_REGEX, (match) => {
          const uri = match.slice(URI_ATTRIBUTE_PREFIX.length, -1).trim();
          if (!uri) return match;
          return `${URI_ATTRIBUTE_PREFIX}${resolve(uri)}"`;
        });
      }
      return resolve(trimmed);
    })
    .join("\n");
}
