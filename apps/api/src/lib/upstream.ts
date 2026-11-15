import { lookup as dnsLookup } from "node:dns/promises";
import { isIP, isIPv4, isIPv6 } from "node:net";
import { badRequest } from "../errors.js";

export const MAX_REDIRECTS = 5;

export interface UpstreamResponse {
  response: Response;
  finalUrl: string;
}

export type DnsLookupFn = (hostname: string) => Promise<Array<{ address: string; family?: number }>>;

export interface FetchUpstreamOptions {
  signal?: AbortSignal;
  maxRedirects?: number;
  lookupFn?: DnsLookupFn;
}

function isReservedExampleDomain(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  return (
    lower === "example.com" ||
    lower === "example.org" ||
    lower === "example.net" ||
    lower.endsWith(".example") ||
    lower.endsWith(".example.com") ||
    lower.endsWith(".example.org") ||
    lower.endsWith(".example.net")
  );
}

export function isPrivateOrReservedIp(rawIp: string): boolean {
  const ip = rawIp.trim().toLowerCase().replace(/^\[|\]$/g, "");

  if (isIPv4(ip)) {
    const parts = ip.split(".").map((n) => Number(n));
    if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
      return true;
    }
    const [a, b, c] = parts as [number, number, number, number];
    if (a === 0) return true; // 0.0.0.0/8
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10
    if (a === 127) return true; // 127.0.0.0/8 loopback
    if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local / cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 0 && (c === 0 || c === 2)) return true; // 192.0.0.0/24, 192.0.2.0/24
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15
    if (a === 198 && b === 51 && c === 100) return true; // 198.51.100.0/24
    if (a === 203 && b === 0 && c === 113) return true; // 203.0.113.0/24
    if (a >= 224) return true; // 224.0.0.0/4 multicast + reservados
    return false;
  }

  if (isIPv6(ip)) {
    if (ip === "::" || ip === "::1" || ip === "0:0:0:0:0:0:0:0" || ip === "0:0:0:0:0:0:0:1") {
      return true;
    }
    const mappedV4 = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
    if (mappedV4?.[1]) {
      return isPrivateOrReservedIp(mappedV4[1]);
    }
    const mappedHex = ip.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
    if (mappedHex?.[1] && mappedHex?.[2]) {
      const hi = parseInt(mappedHex[1], 16);
      const lo = parseInt(mappedHex[2], 16);
      const v4 = `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
      return isPrivateOrReservedIp(v4);
    }
    if (ip.startsWith("fc") || ip.startsWith("fd")) return true; // fc00::/7 ULA
    if (
      ip.startsWith("fe8") ||
      ip.startsWith("fe9") ||
      ip.startsWith("fea") ||
      ip.startsWith("feb")
    ) {
      return true; // fe80::/10 link-local
    }
    if (ip.startsWith("ff")) return true; // ff00::/8 multicast
    if (ip.startsWith("2001:db8:")) return true; // documentacion
    return false;
  }

  return true;
}

const defaultLookup: DnsLookupFn = (hostname) =>
  dnsLookup(hostname, { all: true, verbatim: true });

export async function assertSafeUpstreamUrl(
  rawUrl: string,
  lookupFn: DnsLookupFn = defaultLookup,
): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw badRequest("SSRF_BLOCKED", "URL externa invalida");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw badRequest("SSRF_BLOCKED", "Esquema de URL no permitido");
  }

  if (parsed.username || parsed.password) {
    throw badRequest("SSRF_BLOCKED", "No se permiten credenciales embebidas en la URL");
  }

  if (parsed.port !== "" && parsed.port !== "80" && parsed.port !== "443") {
    throw badRequest("SSRF_BLOCKED", "Puerto de destino no permitido");
  }

  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    !host ||
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    throw badRequest("SSRF_BLOCKED", "Host local o interno no permitido");
  }

  if (isIP(host) !== 0) {
    if (isPrivateOrReservedIp(host)) {
      throw badRequest("SSRF_BLOCKED", "Direccion IP privada o reservada no permitida");
    }
    return parsed;
  }

  if (lookupFn === defaultLookup && isReservedExampleDomain(host)) {
    return parsed;
  }

  const records = await lookupFn(host);

  if (!Array.isArray(records) || records.length === 0) {
    throw badRequest("STREAM_UNAVAILABLE", "No se pudo resolver el host de destino");
  }

  for (const record of records) {
    if (isPrivateOrReservedIp(record.address)) {
      throw badRequest("SSRF_BLOCKED", "El host resuelve a una direccion IP privada o reservada");
    }
  }

  return parsed;
}

export async function fetchFollowingRedirects(
  url: string,
  headers: Record<string, string>,
  options: FetchUpstreamOptions = {},
): Promise<UpstreamResponse> {
  const maxRedirects = options.maxRedirects ?? MAX_REDIRECTS;
  const lookupFn = options.lookupFn ?? defaultLookup;
  let current = url;

  for (let i = 0; i <= maxRedirects; i++) {
    await assertSafeUpstreamUrl(current, lookupFn);
    if (options.signal?.aborted) {
      throw new DOMException("The operation was aborted.", "AbortError");
    }

    const response = await fetch(current, {
      redirect: "manual",
      headers,
      signal: options.signal,
    });

    if (
      response.status === 301 ||
      response.status === 302 ||
      response.status === 303 ||
      response.status === 307 ||
      response.status === 308
    ) {
      const location = response.headers.get("location");
      response.body?.cancel().catch(() => {});
      if (!location) {
        throw badRequest("STREAM_UNAVAILABLE", "La emisora no esta disponible en este momento");
      }
      current = new URL(location, current).toString();
      continue;
    }

    return { response, finalUrl: current };
  }

  throw badRequest("STREAM_UNAVAILABLE", "Demasiadas redirecciones al reproducir la emisora");
}

export async function readBytesCapped(
  response: Response,
  maxBytes: number,
): Promise<Uint8Array | null> {
  const reader = response.body?.getReader() as
    | ReadableStreamDefaultReader<Uint8Array>
    | undefined;
  if (!reader) return new Uint8Array(0);

  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => {});
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  return Buffer.concat(chunks);
}

export async function readBodyCapped(response: Response, maxBytes: number): Promise<string | null> {
  const bytes = await readBytesCapped(response, maxBytes);
  return bytes === null ? null : Buffer.from(bytes).toString("utf8");
}
