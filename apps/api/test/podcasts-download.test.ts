import { afterEach, describe, expect, it, vi } from "vitest";
import { request, setupServer } from "./helpers.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

const FEED_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Podcast Download Test</title>
    <item>
      <title>Episodio de descarga</title>
      <guid>ep-download-1</guid>
      <enclosure url="https://audio.example.org/ep1.mp3" type="audio/mpeg" />
    </item>
  </channel>
</rss>`;

async function registerUser(app: Parameters<typeof request>[0]) {
  const res = await request(app)
    .post("/api/v1/auth/register")
    .send({ email: "download@example.com", password: "Password123!", name: "Download" })
    .expect(201);
  return res.body.accessToken as string;
}

async function resolveEpisode(app: Parameters<typeof request>[0], token: string) {
  const resolved = await request(app)
    .post("/api/v1/podcasts/resolve")
    .set("Authorization", `Bearer ${token}`)
    .send({ feedUrl: "https://audio.example.org/feed.xml" })
    .expect(200);
  return resolved.body.episodes.items[0].id as number;
}

async function issueDownload(
  app: Parameters<typeof request>[0],
  token: string,
  episodeId: number,
) {
  const res = await request(app)
    .post(`/api/v1/podcasts/episodes/${episodeId}/download`)
    .set("Authorization", `Bearer ${token}`)
    .expect(200);
  return res.body.url as string;
}

function stubAudioFetch(): void {
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
            "content-disposition": 'attachment; filename="Cronica del bosque.mp3"',
          },
        });
      }
      if (headers.Range === "bytes=9999-") {
        return new Response(null, {
          status: 416,
          headers: { "content-range": "bytes */100" },
        });
      }
      return new Response("audio-completo", {
        status: 200,
        headers: {
          "content-type": "audio/mpeg",
          "content-length": "14",
          "content-disposition": 'attachment; filename="Cronica del bosque.mp3"',
        },
      });
    }),
  );
}

describe("Podcast download token y proxy", () => {
  it("emite una URL firmada de descarga con Cache-Control no-store", async () => {
    stubAudioFetch();
    const srv = setupServer({ PODCASTS_ENABLED: "true" });
    try {
      const token = await registerUser(srv.app);
      const episodeId = await resolveEpisode(srv.app, token);
      const res = await request(srv.app)
        .post(`/api/v1/podcasts/episodes/${episodeId}/download`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.headers["cache-control"]).toBe("no-store");
      expect(res.body.expiresAt).toEqual(expect.any(Number));
      const url = new URL(res.body.url as string, "https://radio.example.org");
      expect(url.pathname).toBe(`/api/v1/podcasts/episodes/${episodeId}/download`);
      expect(url.searchParams.get("u")).toBe("1");
      expect(url.searchParams.get("exp")).toBeTruthy();
      expect(url.searchParams.get("sig")).toMatch(/^[0-9a-f]{64}$/);
      expect(res.body.audioUrl).toBeUndefined();
    } finally {
      srv.db.sqlite.close();
    }
  });

  it("rechaza la emisión sin autenticación", async () => {
    const srv = setupServer({ PODCASTS_ENABLED: "true" });
    try {
      await request(srv.app).post("/api/v1/podcasts/episodes/1/download").expect(401);
    } finally {
      srv.db.sqlite.close();
    }
  });

  it("devuelve EPISODE_NOT_FOUND para un episodio inexistente", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(FEED_XML, { status: 200 })),
    );
    const srv = setupServer({ PODCASTS_ENABLED: "true" });
    try {
      const token = await registerUser(srv.app);
      const res = await request(srv.app)
        .post("/api/v1/podcasts/episodes/999999/download")
        .set("Authorization", `Bearer ${token}`)
        .expect(404);
      expect(res.body.error.code).toBe("EPISODE_NOT_FOUND");
    } finally {
      srv.db.sqlite.close();
    }
  });

  it("sirve el archivo con Content-Disposition, Content-Type y Cache-Control privado", async () => {
    stubAudioFetch();
    const srv = setupServer({ PODCASTS_ENABLED: "true" });
    try {
      const token = await registerUser(srv.app);
      const episodeId = await resolveEpisode(srv.app, token);
      const url = await issueDownload(srv.app, token, episodeId);

      const file = await request(srv.app).get(url).buffer(true).expect(200);
      expect(file.headers["content-type"]).toBe("audio/mpeg");
      expect(file.headers["content-disposition"]).toContain("attachment;");
      expect(file.headers["content-disposition"]).toContain(
        "tolocharadio_Episodio de descarga.mp3",
      );
      expect(file.headers["cache-control"]).toBe("private, no-store");
      expect(Buffer.from(file.body as Buffer).toString()).toBe("audio-completo");
    } finally {
      srv.db.sqlite.close();
    }
  });

  it("soporta Range 206 y 416 manteniendo el nombre de descarga", async () => {
    stubAudioFetch();
    const srv = setupServer({ PODCASTS_ENABLED: "true" });
    try {
      const token = await registerUser(srv.app);
      const episodeId = await resolveEpisode(srv.app, token);
      const url = await issueDownload(srv.app, token, episodeId);

      const partial = await request(srv.app)
        .get(url)
        .buffer(true)
        .set("Range", "bytes=10-19")
        .expect(206);
      expect(partial.headers["content-range"]).toBe("bytes 10-19/100");
      expect(partial.headers["accept-ranges"]).toBe("bytes");
      expect(partial.headers["content-disposition"]).toContain("attachment;");
      expect(Buffer.from(partial.body as Buffer).toString()).toBe("0123456789");

      const outOfRange = await request(srv.app)
        .get(url)
        .set("Range", "bytes=9999-")
        .expect(416);
      expect(outOfRange.headers["content-range"]).toBe("bytes */100");
      expect(outOfRange.headers["content-disposition"]).toContain("attachment;");
    } finally {
      srv.db.sqlite.close();
    }
  });

  it("responde 503 DOWNLOAD_UNAVAILABLE si el origen falla", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: unknown) => {
        if (String(input) === "https://audio.example.org/feed.xml") {
          return new Response(FEED_XML, { status: 200 });
        }
        return new Response("error", { status: 500 });
      }),
    );
    const srv = setupServer({ PODCASTS_ENABLED: "true" });
    try {
      const token = await registerUser(srv.app);
      const episodeId = await resolveEpisode(srv.app, token);
      const url = await issueDownload(srv.app, token, episodeId);
      const res = await request(srv.app).get(url).expect(503);
      expect(res.body.error.code).toBe("DOWNLOAD_UNAVAILABLE");
    } finally {
      srv.db.sqlite.close();
    }
  });

  it("rechaza una firma alterada y una firma de reproducción", async () => {
    stubAudioFetch();
    const srv = setupServer({ PODCASTS_ENABLED: "true" });
    try {
      const token = await registerUser(srv.app);
      const episodeId = await resolveEpisode(srv.app, token);
      const url = await issueDownload(srv.app, token, episodeId);

      await request(srv.app).get(`${url}00`).expect(403);

      const playback = await request(srv.app)
        .post(`/api/v1/podcasts/episodes/${episodeId}/playback`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      const playbackUrl = new URL(playback.body.url as string, "https://radio.example.org");
      const downloadWithPlaybackSignature = `/api/v1/podcasts/episodes/${episodeId}/download${playbackUrl.search}`;
      const res = await request(srv.app).get(downloadWithPlaybackSignature).expect(403);
      expect(res.body.error.code).toBe("DOWNLOAD_TOKEN_FORBIDDEN");
    } finally {
      srv.db.sqlite.close();
    }
  });

  it("fuerza el proxy aunque PODCAST_STREAM_MODE=redirect", async () => {
    stubAudioFetch();
    const srv = setupServer({
      PODCASTS_ENABLED: "true",
      PODCAST_STREAM_MODE: "redirect",
    });
    try {
      const token = await registerUser(srv.app);
      const episodeId = await resolveEpisode(srv.app, token);
      const url = await issueDownload(srv.app, token, episodeId);
      const file = await request(srv.app).get(url).buffer(true).expect(200);
      expect(file.headers["content-disposition"]).toContain("attachment;");
      expect(Buffer.from(file.body as Buffer).toString()).toBe("audio-completo");
    } finally {
      srv.db.sqlite.close();
    }
  });
});
