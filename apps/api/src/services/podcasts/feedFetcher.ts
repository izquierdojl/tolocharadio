import { badRequest, serviceUnavailable } from "../../errors.js";
import {
  fetchFollowingRedirects,
  readBodyCapped,
  type DnsLookupFn,
} from "../../lib/upstream.js";
import { parsePodcastFeedXml, type ParsedPodcastFeed } from "./feedParser.js";

export const FEED_FETCH_TIMEOUT_MS = 10_000;

export interface FetchFeedOptions {
  etag?: string | null;
  lastModified?: string | null;
  maxBytes?: number;
  userAgent?: string;
  signal?: AbortSignal;
  lookupFn?: DnsLookupFn;
}

export type FetchFeedResult =
  | {
      notModified: true;
      finalUrl: string;
      etag: string | null;
      lastModified: string | null;
    }
  | {
      notModified: false;
      finalUrl: string;
      etag: string | null;
      lastModified: string | null;
      feed: ParsedPodcastFeed;
    };

export async function fetchAndParsePodcastFeed(
  feedUrl: string,
  options: FetchFeedOptions = {},
): Promise<FetchFeedResult> {
  const maxBytes = options.maxBytes ?? 5_242_880;
  const headers: Record<string, string> = {
    "User-Agent": options.userAgent ?? "TolochaRadio",
    Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*;q=0.8",
    "Accept-Encoding": "identity",
  };
  if (options.etag) {
    headers["If-None-Match"] = options.etag;
  }
  if (options.lastModified) {
    headers["If-Modified-Since"] = options.lastModified;
  }

  const timeoutSignal = AbortSignal.timeout(FEED_FETCH_TIMEOUT_MS);
  const signal = options.signal
    ? AbortSignal.any([options.signal, timeoutSignal])
    : timeoutSignal;

  let response: Response;
  let finalUrl: string;
  try {
    ({ response, finalUrl } = await fetchFollowingRedirects(feedUrl, headers, {
      signal,
      lookupFn: options.lookupFn,
    }));
  } catch (err) {
    if (err instanceof Error && "status" in err) throw err;
    throw serviceUnavailable("FEED_UNREACHABLE", "No se pudo conectar con el feed del podcast");
  }

  const etag = response.headers.get("etag") ?? options.etag ?? null;
  const lastModified = response.headers.get("last-modified") ?? options.lastModified ?? null;

  if (response.status === 304) {
    response.body?.cancel().catch(() => {});
    return {
      notModified: true,
      finalUrl,
      etag,
      lastModified,
    };
  }

  if (!response.ok) {
    response.body?.cancel().catch(() => {});
    throw serviceUnavailable(
      "FEED_UNREACHABLE",
      `El servidor del feed respondio con estado ${response.status}`,
    );
  }

  let xml: string | null;
  try {
    xml = await readBodyCapped(response, maxBytes);
  } catch {
    throw serviceUnavailable("FEED_UNREACHABLE", "Error al descargar el contenido del feed");
  }

  if (xml === null) {
    throw badRequest(
      "FEED_TOO_LARGE",
      "El feed supera el tamano maximo permitido",
    );
  }

  const feed = parsePodcastFeedXml(xml, finalUrl);
  return {
    notModified: false,
    finalUrl,
    etag,
    lastModified,
    feed,
  };
}
