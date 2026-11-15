import { describe, expect, it } from "vitest";
import {
  parsePodcastDate,
  parsePodcastDuration,
  parsePodcastFeedXml,
  resolveSafeHttpUrl,
} from "../src/services/podcasts/feedParser.js";

const SAMPLE_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>Ecos de la Sierra</title>
    <link>https://sierra.example.org</link>
    <description>Crónicas sonoras de montaña</description>
    <language>es-ES</language>
    <itunes:author>Asociación Tolocha</itunes:author>
    <itunes:image href="https://sierra.example.org/cover.jpg" />
    <itunes:category text="Society &amp; Culture">
      <itunes:category text="History" />
    </itunes:category>
    <item>
      <title>Episodio 1: Los pinares</title>
      <guid isPermaLink="false">ep-001</guid>
      <pubDate>Wed, 21 Oct 2026 10:00:00 GMT</pubDate>
      <description><![CDATA[<p>Un paseo por el pinar.</p>]]></description>
      <enclosure url="/audio/ep1.mp3" length="123456" type="audio/mpeg" />
      <itunes:duration>01:05:30</itunes:duration>
      <itunes:episode>1</itunes:episode>
      <itunes:season>2</itunes:season>
      <itunes:explicit>no</itunes:explicit>
    </item>
    <item>
      <title>Episodio sin guid explícito</title>
      <pubDate>Thu, 22 Oct 2026 10:00:00 GMT</pubDate>
      <enclosure url="https://sierra.example.org/audio/ep2.m4a" type="audio/x-m4a" />
      <itunes:duration>15:20</itunes:duration>
      <itunes:image href="javascript:alert(1)" />
      <itunes:explicit>true</itunes:explicit>
    </item>
    <item>
      <title>Vídeo descartado</title>
      <guid>vid-1</guid>
      <enclosure url="https://sierra.example.org/video/v1.mp4" type="video/mp4" />
    </item>
  </channel>
</rss>`;

const SAMPLE_ATOM = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="es">
  <title>Podcast Atom</title>
  <subtitle>Subtítulo Atom</subtitle>
  <link href="https://atom.example.org" rel="alternate" />
  <author><name>Autor Atom</name></author>
  <entry>
    <title>Entrada 1</title>
    <id>urn:uuid:atom-1</id>
    <published>2026-10-24T12:00:00Z</published>
    <summary>Resumen de entrada</summary>
    <link rel="enclosure" type="audio/ogg" href="https://atom.example.org/ep1.ogg" />
  </entry>
</feed>`;

describe("feedParser", () => {
  it("convierte duraciones HH:MM:SS, MM:SS y segundos", () => {
    expect(parsePodcastDuration("01:05:30")).toBe(3930);
    expect(parsePodcastDuration("15:20")).toBe(920);
    expect(parsePodcastDuration("1800")).toBe(1800);
    expect(parsePodcastDuration("invalido")).toBeNull();
  });

  it("parsea fechas RFC 822 e ISO 8601", () => {
    expect(parsePodcastDate("Wed, 21 Oct 2026 10:00:00 GMT")).toBe(
      Date.parse("2026-10-21T10:00:00Z"),
    );
    expect(parsePodcastDate("2026-10-24T12:00:00Z")).toBe(Date.parse("2026-10-24T12:00:00Z"));
    expect(parsePodcastDate("no-es-fecha")).toBeNull();
  });

  it("valida esquemas http(s) en resolveSafeHttpUrl", () => {
    expect(resolveSafeHttpUrl("/cover.png", "https://sierra.example.org/feed.xml")).toBe(
      "https://sierra.example.org/cover.png",
    );
    expect(resolveSafeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(resolveSafeHttpUrl("data:image/png;base64,AAA")).toBeNull();
  });

  it("parsea un feed RSS 2.0 con namespace iTunes, resuelve URLs relativas, filtra video y genera guid estable", () => {
    const feed = parsePodcastFeedXml(SAMPLE_RSS, "https://sierra.example.org/feed.xml");
    expect(feed.title).toBe("Ecos de la Sierra");
    expect(feed.author).toBe("Asociación Tolocha");
    expect(feed.imageUrl).toBe("https://sierra.example.org/cover.jpg");
    expect(feed.categories).toEqual(["Society & Culture", "History"]);
    expect(feed.episodes).toHaveLength(2);

    const ep1 = feed.episodes[0]!;
    expect(ep1.guid).toBe("ep-001");
    expect(ep1.audioUrl).toBe("https://sierra.example.org/audio/ep1.mp3");
    expect(ep1.durationSec).toBe(3930);
    expect(ep1.episodeNumber).toBe(1);
    expect(ep1.seasonNumber).toBe(2);
    expect(ep1.explicit).toBe(false);
    expect(ep1.description).toBe("Un paseo por el pinar.");

    const ep2 = feed.episodes[1]!;
    expect(ep2.guid).toMatch(/^[0-9a-f]{64}$/);
    expect(ep2.durationSec).toBe(920);
    expect(ep2.explicit).toBe(true);
    // La imagen javascript: del episodio se descarta y cae al cover del canal
    expect(ep2.imageUrl).toBe("https://sierra.example.org/cover.jpg");
  });

  it("parsea un feed Atom con link rel=enclosure", () => {
    const feed = parsePodcastFeedXml(SAMPLE_ATOM, "https://atom.example.org/atom.xml");
    expect(feed.title).toBe("Podcast Atom");
    expect(feed.author).toBe("Autor Atom");
    expect(feed.episodes).toHaveLength(1);
    expect(feed.episodes[0]!.guid).toBe("urn:uuid:atom-1");
    expect(feed.episodes[0]!.audioUrl).toBe("https://atom.example.org/ep1.ogg");
  });

  it("rechaza documentos vacios o que no son RSS/Atom", () => {
    expect(() => parsePodcastFeedXml("", "https://a.example/f.xml")).toThrow();
    expect(() => parsePodcastFeedXml("<html><body>hola</body></html>", "https://a.example/f.xml")).toThrow();
  });
});
