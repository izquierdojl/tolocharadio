export const RAW_STATION = {
  stationuuid: "11111111-2222-3333-4444-555555555555",
  name: "Radio Test  <script>alert(1)</script>",
  url: "https://stream.example.org/live.mp3",
  url_resolved: "https://cdn.example.org/live.mp3",
  homepage: "https://example.org/",
  favicon: "https://example.org/favicon.png",
  country: "Spain",
  countrycode: "ES",
  language: "spanish",
  tags: "pop, rock, pop",
  codec: "MP3",
  bitrate: 128,
  is_ssl: 1,
  lastcheckok: true,
  votes: 42,
  clickcount: 7,
};

export const RAW_STATION_TWO = {
  ...JSON.parse(JSON.stringify(RAW_STATION)),
  stationuuid: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  name: "Radio Dos",
  url: "https://stream-two.example.org/live.aac",
  codec: "AAC",
  votes: 99,
};

export function rawFromJson(json: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(json)) as Record<string, unknown>;
}