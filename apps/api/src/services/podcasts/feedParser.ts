import { createHash } from "node:crypto";
import { XMLParser } from "fast-xml-parser";
import { badRequest } from "../../errors.js";
import { sanitizeText } from "../normalize.js";

export interface ParsedPodcastEpisode {
  guid: string;
  title: string;
  description: string | null;
  audioUrl: string;
  publishedAt: number | null;
  durationSec: number | null;
  imageUrl: string | null;
  episodeNumber: number | null;
  seasonNumber: number | null;
  explicit: boolean;
}

export interface ParsedPodcastFeed {
  title: string;
  author: string | null;
  description: string | null;
  imageUrl: string | null;
  language: string | null;
  link: string | null;
  categories: string[];
  episodes: ParsedPodcastEpisode[];
}

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  processEntities: false,
  htmlEntities: true,
  trimValues: true,
  parseTagValue: false,
  parseAttributeValue: false,
});

function asArray<T>(val: T | T[] | undefined | null): T[] {
  if (val === undefined || val === null) return [];
  return Array.isArray(val) ? val : [val];
}

function decodeXmlEntities(str: string): string {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function extractText(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") return decodeXmlEntities(val);
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (typeof val === "object") {
    const rec = val as Record<string, unknown>;
    if (typeof rec["#text"] === "string" || typeof rec["#text"] === "number") {
      return decodeXmlEntities(String(rec["#text"]));
    }
    if (typeof rec.__cdata === "string") {
      return decodeXmlEntities(rec.__cdata);
    }
  }
  return "";
}

export function resolveSafeHttpUrl(raw: unknown, baseUrl?: string): string | null {
  const text = extractText(raw).trim();
  if (!text) return null;
  try {
    const url = baseUrl ? new URL(text, baseUrl) : new URL(text);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function parsePodcastDuration(raw: unknown): number | null {
  const text = extractText(raw).trim();
  if (!text) return null;
  if (/^\d+$/.test(text)) {
    const sec = Number(text);
    return Number.isFinite(sec) && sec > 0 ? Math.round(sec) : null;
  }
  const parts = text.split(":").map((p) => Number(p.trim()));
  if (parts.some((n) => !Number.isFinite(n) || n < 0)) return null;
  if (parts.length === 2) {
    const [mm, ss] = parts as [number, number];
    const total = mm * 60 + ss;
    return total > 0 ? Math.round(total) : null;
  }
  if (parts.length === 3) {
    const [hh, mm, ss] = parts as [number, number, number];
    const total = hh * 3600 + mm * 60 + ss;
    return total > 0 ? Math.round(total) : null;
  }
  return null;
}

export function parsePodcastDate(raw: unknown): number | null {
  const text = extractText(raw).trim();
  if (!text) return null;
  const ms = Date.parse(text);
  if (!Number.isFinite(ms) || ms <= 0) return null;
  return ms;
}

function parsePositiveInt(raw: unknown): number | null {
  const text = extractText(raw).trim();
  if (!/^\d+$/.test(text)) return null;
  const n = Number(text);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function parseExplicit(raw: unknown): boolean {
  const text = extractText(raw).trim().toLowerCase();
  return text === "true" || text === "yes" || text === "explicit" || text === "1";
}

function isAudioMimeOrUrl(typeRaw: unknown, url: string): boolean {
  const type = extractText(typeRaw).trim().toLowerCase();
  if (type.startsWith("video/")) return false;
  if (type.startsWith("audio/")) return true;
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    return /\.(mp3|m4a|aac|ogg|oga|opus|wav|flac)$/.test(pathname) || type === "";
  } catch {
    return false;
  }
}

function extractCategories(rawChannel: Record<string, unknown>): string[] {
  const out = new Set<string>();

  const collect = (node: unknown) => {
    for (const item of asArray(node)) {
      if (typeof item === "string") {
        const clean = sanitizeText(item, 80);
        if (clean) out.add(clean);
      } else if (typeof item === "object" && item !== null) {
        const rec = item as Record<string, unknown>;
        const attrText = sanitizeText(
          extractText(rec["@_text"] ?? rec["@_term"] ?? rec["#text"]),
          80,
        );
        if (attrText) out.add(attrText);
        if (rec["itunes:category"]) collect(rec["itunes:category"]);
      }
    }
  };

  collect(rawChannel["itunes:category"]);
  collect(rawChannel.category);
  return Array.from(out).slice(0, 10);
}

function extractChannelImage(rawChannel: Record<string, unknown>, feedUrl: string): string | null {
  const itunesImg = rawChannel["itunes:image"];
  if (typeof itunesImg === "object" && itunesImg !== null) {
    const href = resolveSafeHttpUrl((itunesImg as Record<string, unknown>)["@_href"], feedUrl);
    if (href) return href;
  } else if (typeof itunesImg === "string") {
    const href = resolveSafeHttpUrl(itunesImg, feedUrl);
    if (href) return href;
  }

  const image = rawChannel.image;
  if (typeof image === "object" && image !== null) {
    const rec = image as Record<string, unknown>;
    const url = resolveSafeHttpUrl(rec.url ?? rec["@_href"], feedUrl);
    if (url) return url;
  }
  return null;
}

function fallbackGuid(audioUrl: string, publishedAt: number | null, title: string): string {
  return createHash("sha256")
    .update(`${audioUrl}\n${publishedAt ?? title}`)
    .digest("hex");
}

function parseRssChannel(channel: Record<string, unknown>, feedUrl: string): ParsedPodcastFeed {
  const title = sanitizeText(extractText(channel.title), 300);
  if (!title) {
    throw badRequest("FEED_INVALID", "El feed RSS no contiene un titulo valido");
  }

  const author =
    sanitizeText(
      extractText(channel["itunes:author"] ?? channel.managingEditor ?? channel["dc:creator"]),
      200,
    ) || null;
  const description =
    sanitizeText(
      extractText(channel.description ?? channel["itunes:summary"] ?? channel["itunes:subtitle"]),
      4000,
    ) || null;
  const imageUrl = extractChannelImage(channel, feedUrl);
  const language = sanitizeText(extractText(channel.language), 32) || null;

  let link: string | null = null;
  for (const l of asArray(channel.link)) {
    if (typeof l === "string") {
      link = resolveSafeHttpUrl(l, feedUrl);
      if (link) break;
    } else if (typeof l === "object" && l !== null) {
      const rec = l as Record<string, unknown>;
      if (!rec["@_rel"] || rec["@_rel"] === "alternate") {
        link = resolveSafeHttpUrl(rec["@_href"] ?? rec["#text"], feedUrl);
        if (link) break;
      }
    }
  }

  const categories = extractCategories(channel);
  const channelExplicit = parseExplicit(channel["itunes:explicit"]);

  const episodes: ParsedPodcastEpisode[] = [];
  const seenGuids = new Set<string>();

  for (const rawItem of asArray(channel.item)) {
    if (typeof rawItem !== "object" || rawItem === null) continue;
    const item = rawItem as Record<string, unknown>;

    let audioUrl: string | null = null;
    for (const enc of asArray(item.enclosure)) {
      if (typeof enc !== "object" || enc === null) continue;
      const encRec = enc as Record<string, unknown>;
      const candidateUrl = resolveSafeHttpUrl(encRec["@_url"] ?? encRec.url, feedUrl);
      if (candidateUrl && isAudioMimeOrUrl(encRec["@_type"] ?? encRec.type, candidateUrl)) {
        audioUrl = candidateUrl;
        break;
      }
    }
    if (!audioUrl) continue;

    const epTitle = sanitizeText(extractText(item.title), 300) || "Episodio sin título";
    const publishedAt = parsePodcastDate(item.pubDate ?? item["dc:date"] ?? item.published);
    const rawGuid = sanitizeText(extractText(item.guid), 512);
    const guid = rawGuid || fallbackGuid(audioUrl, publishedAt, epTitle);
    if (seenGuids.has(guid)) continue;
    seenGuids.add(guid);

    const epDesc =
      sanitizeText(
        extractText(
          item.description ?? item["itunes:summary"] ?? item["content:encoded"] ?? item.summary,
        ),
        8000,
      ) || null;
    const durationSec = parsePodcastDuration(item["itunes:duration"] ?? item.duration);
    const epImage = extractChannelImage(item, feedUrl) ?? imageUrl;
    const episodeNumber = parsePositiveInt(item["itunes:episode"]);
    const seasonNumber = parsePositiveInt(item["itunes:season"]);
    const explicit =
      item["itunes:explicit"] !== undefined
        ? parseExplicit(item["itunes:explicit"])
        : channelExplicit;

    episodes.push({
      guid,
      title: epTitle,
      description: epDesc,
      audioUrl,
      publishedAt,
      durationSec,
      imageUrl: epImage,
      episodeNumber,
      seasonNumber,
      explicit,
    });
  }

  return {
    title,
    author,
    description,
    imageUrl,
    language,
    link,
    categories,
    episodes,
  };
}

function parseAtomFeed(feed: Record<string, unknown>, feedUrl: string): ParsedPodcastFeed {
  const title = sanitizeText(extractText(feed.title), 300);
  if (!title) {
    throw badRequest("FEED_INVALID", "El feed Atom no contiene un titulo valido");
  }

  let authorName: string;
  const rawAuthor = feed.author;
  if (typeof rawAuthor === "object" && rawAuthor !== null) {
    authorName = extractText((rawAuthor as Record<string, unknown>).name);
  } else {
    authorName = extractText(feed["itunes:author"] ?? rawAuthor);
  }
  const author = sanitizeText(authorName, 200) || null;
  const description =
    sanitizeText(extractText(feed.subtitle ?? feed["itunes:summary"]), 4000) || null;
  const imageUrl =
    resolveSafeHttpUrl(feed.logo ?? feed.icon, feedUrl) ?? extractChannelImage(feed, feedUrl);
  const language =
    sanitizeText(extractText(feed["@_xml:lang"] ?? feed.language), 32) || null;

  let link: string | null = null;
  for (const l of asArray(feed.link)) {
    if (typeof l === "object" && l !== null) {
      const rec = l as Record<string, unknown>;
      const rel = extractText(rec["@_rel"]);
      if (!rel || rel === "alternate") {
        link = resolveSafeHttpUrl(rec["@_href"], feedUrl);
        if (link) break;
      }
    }
  }

  const categories = extractCategories(feed);
  const episodes: ParsedPodcastEpisode[] = [];
  const seenGuids = new Set<string>();

  for (const rawEntry of asArray(feed.entry)) {
    if (typeof rawEntry !== "object" || rawEntry === null) continue;
    const entry = rawEntry as Record<string, unknown>;

    let audioUrl: string | null = null;
    for (const l of asArray(entry.link)) {
      if (typeof l !== "object" || l === null) continue;
      const rec = l as Record<string, unknown>;
      if (extractText(rec["@_rel"]) === "enclosure") {
        const candidateUrl = resolveSafeHttpUrl(rec["@_href"], feedUrl);
        if (candidateUrl && isAudioMimeOrUrl(rec["@_type"], candidateUrl)) {
          audioUrl = candidateUrl;
          break;
        }
      }
    }
    if (!audioUrl) continue;

    const epTitle = sanitizeText(extractText(entry.title), 300) || "Episodio sin título";
    const publishedAt = parsePodcastDate(entry.published ?? entry.updated);
    const rawGuid = sanitizeText(extractText(entry.id), 512);
    const guid = rawGuid || fallbackGuid(audioUrl, publishedAt, epTitle);
    if (seenGuids.has(guid)) continue;
    seenGuids.add(guid);

    const epDesc =
      sanitizeText(extractText(entry.summary ?? entry.content ?? entry["itunes:summary"]), 8000) ||
      null;
    const durationSec = parsePodcastDuration(entry["itunes:duration"]);
    const epImage = extractChannelImage(entry, feedUrl) ?? imageUrl;

    episodes.push({
      guid,
      title: epTitle,
      description: epDesc,
      audioUrl,
      publishedAt,
      durationSec,
      imageUrl: epImage,
      episodeNumber: parsePositiveInt(entry["itunes:episode"]),
      seasonNumber: parsePositiveInt(entry["itunes:season"]),
      explicit: parseExplicit(entry["itunes:explicit"]),
    });
  }

  return {
    title,
    author,
    description,
    imageUrl,
    language,
    link,
    categories,
    episodes,
  };
}

export function parsePodcastFeedXml(xml: string, feedUrl: string): ParsedPodcastFeed {
  if (!xml || !xml.trim()) {
    throw badRequest("FEED_INVALID", "El contenido del feed esta vacio");
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = xmlParser.parse(xml) as Record<string, unknown>;
  } catch {
    throw badRequest("FEED_INVALID", "El documento XML del feed no es valido");
  }

  const rss = parsed.rss as Record<string, unknown> | undefined;
  if (rss && typeof rss.channel === "object" && rss.channel !== null) {
    return parseRssChannel(rss.channel as Record<string, unknown>, feedUrl);
  }

  if (typeof parsed.feed === "object" && parsed.feed !== null) {
    return parseAtomFeed(parsed.feed as Record<string, unknown>, feedUrl);
  }

  throw badRequest("FEED_INVALID", "El documento no es un feed RSS o Atom reconocido");
}
