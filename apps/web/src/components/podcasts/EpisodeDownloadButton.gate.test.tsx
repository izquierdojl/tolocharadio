import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("./useEpisodeDownload.js", () => ({
  usePodcastDownloadsEnabled: () => false,
  useEpisodeDownload: () => ({ pending: false, download: vi.fn() }),
}));

import { EpisodeDownloadButton } from "./EpisodeDownloadButton.js";

describe("EpisodeDownloadButton", () => {
  it("no renderiza el botón cuando features.podcastDownloads está desactivado", () => {
    const html = renderToStaticMarkup(
      <EpisodeDownloadButton episodeId={1} episodeTitle="Episodio de prueba" />,
    );

    expect(html).toBe("");
  });
});
