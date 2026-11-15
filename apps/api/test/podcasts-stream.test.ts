import { afterEach, describe, expect, it, vi } from "vitest";
import { request, setupServer } from "./helpers.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

const FEED_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Podcast Stream Test</title>
    <item>
      <title>Episodio 1</title>
      <guid>ep-stream-1</guid>
      <enclosure url="https://audio.example.org/ep1.mp3" type="audio/mpeg" />
    </item>
  </channel>
</rss>`;

async function registerUser(app: Parameters<typeof request>[0]) {
  const res = await request(app)
    .post("/api/v1/auth/register")
    .send({ email: "stream@example.com", password: "Password123!", name: "Stream" })
    .expect(201);
  return res.body.accessToken as string;
}

describe("Podcast playback token y stream con soporte Range", () => {
  it("emite URL firmada y sirve 200, 206 Partial Content y 416 Range Not Satisfiable sin requerir Bearer", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: unknown, init?: RequestInit) => {
        const url = String(input);
        if (url === "https://audio.example.org/feed.xml") {
          return new Response(FEED_XML, { status: 200 });
        }
        const headers = (init?.headers ?? {}) as Record<string, string>;
        if (headers.Range === "bytes=10-19") {
          return new Response("0123456789", {
            status: 206,
            headers: {
              "content-type": "audio/mpeg",
              "content-range": "bytes 10-19/100",
              "accept-ranges": "bytes",
            },
          });
        }
        if (headers.Range === "bytes=9999-") {
          return new Response(null, {
            status: 416,
            headers: {
              "content-range": "bytes */100",
            },
          });
        }
        return new Response("audio-completo", {
          status: 200,
          headers: { "content-type": "audio/mpeg" },
        });
      }),
    );

    const srv = setupServer({ PODCASTS_ENABLED: "true" });
    try {
      const token = await registerUser(srv.app);
      const resolved = await request(srv.app)
        .post("/api/v1/podcasts/resolve")
        .set("Authorization", `Bearer ${token}`)
        .send({ feedUrl: "https://audio.example.org/feed.xml" })
        .expect(200);

      const episodeId = resolved.body.episodes.items[0].id as number;

      const pb = await request(srv.app)
        .post(`/api/v1/podcasts/episodes/${episodeId}/playback`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(pb.headers["cache-control"]).toBe("no-store");
      const streamPath = pb.body.url as string;

      // 206 Range valido (sin cabecera Authorization!)
      const partial = await request(srv.app)
        .get(streamPath)
        .set("Range", "bytes=10-19")
        .expect(206);
      expect(partial.headers["content-range"]).toBe("bytes 10-19/100");
      expect(partial.headers["accept-ranges"]).toBe("bytes");

      // 416 Range fuera de rango se propaga como 416 (no 503)
      const outOfRange = await request(srv.app)
        .get(streamPath)
        .set("Range", "bytes=9999-")
        .expect(416);
      expect(outOfRange.headers["content-range"]).toBe("bytes */100");

      // Firma alterada -> 403
      await request(srv.app).get(`${streamPath}00`).expect(403);
    } finally {
      srv.db.sqlite.close();
    }
  });

  it("redirige con 302 cuando PODCAST_STREAM_MODE=redirect", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(FEED_XML, { status: 200 })),
    );

    const srv = setupServer({
      PODCASTS_ENABLED: "true",
      PODCAST_STREAM_MODE: "redirect",
    });
    try {
      const token = await registerUser(srv.app);
      const resolved = await request(srv.app)
        .post("/api/v1/podcasts/resolve")
        .set("Authorization", `Bearer ${token}`)
        .send({ feedUrl: "https://audio.example.org/feed.xml" })
        .expect(200);
      const episodeId = resolved.body.episodes.items[0].id as number;

      const pb = await request(srv.app)
        .post(`/api/v1/podcasts/episodes/${episodeId}/playback`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const redir = await request(srv.app).get(pb.body.url).expect(302);
      expect(redir.headers.location).toBe("https://audio.example.org/ep1.mp3");
    } finally {
      srv.db.sqlite.close();
    }
  });
});
