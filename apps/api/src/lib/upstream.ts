import { badRequest } from "../errors.js";

export const MAX_REDIRECTS = 5;

export interface UpstreamResponse {
  response: Response;
  finalUrl: string;
}

export interface FetchUpstreamOptions {
  signal?: AbortSignal;
  maxRedirects?: number;
}

export async function fetchFollowingRedirects(
  url: string,
  headers: Record<string, string>,
  options: FetchUpstreamOptions = {},
): Promise<UpstreamResponse> {
  const maxRedirects = options.maxRedirects ?? MAX_REDIRECTS;
  let current = url;

  for (let i = 0; i <= maxRedirects; i++) {
    const response = await fetch(current, {
      redirect: "manual",
      headers,
      signal: options.signal,
    });

    if (response.status >= 300 && response.status < 400) {
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

export async function readBodyCapped(response: Response, maxBytes: number): Promise<string | null> {
  const reader = response.body?.getReader() as
    | ReadableStreamDefaultReader<Uint8Array>
    | undefined;
  if (!reader) return "";

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

  return Buffer.concat(chunks).toString("utf8");
}
