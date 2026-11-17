import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EpisodeDownloadButtonView } from "./EpisodeDownloadButton.js";

describe("EpisodeDownloadButtonView", () => {
  it("muestra el icono con un nombre accesible que incluye el episodio", () => {
    const html = renderToStaticMarkup(
      <EpisodeDownloadButtonView
        episodeTitle="Crónica del bosque"
        pending={false}
        onDownload={() => {}}
      />,
    );

    expect(html).toContain('aria-label="Descargar Crónica del bosque"');
    expect(html).toContain('title="Descargar episodio"');
    expect(html).not.toContain('disabled=""');
    expect(html).not.toContain("animate-spin");
  });

  it("se deshabilita y muestra espera mientras prepara la descarga", () => {
    const html = renderToStaticMarkup(
      <EpisodeDownloadButtonView
        episodeTitle="Crónica del bosque"
        pending
        onDownload={() => {}}
      />,
    );

    expect(html).toContain('disabled=""');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('aria-label="Preparando descarga de Crónica del bosque"');
    expect(html).toContain('title="Preparando descarga"');
    expect(html).toContain("animate-spin");
  });

  it("muestra la etiqueta visible en la variante de ficha", () => {
    const html = renderToStaticMarkup(
      <EpisodeDownloadButtonView
        episodeTitle="Crónica del bosque"
        pending={false}
        variant="label"
        onDownload={() => {}}
      />,
    );

    expect(html).toContain("Descargar");
    expect(html).toContain('aria-label="Descargar Crónica del bosque"');
  });

  it("muestra el texto de espera en la variante de ficha", () => {
    const html = renderToStaticMarkup(
      <EpisodeDownloadButtonView
        episodeTitle="Crónica del bosque"
        pending
        variant="label"
        onDownload={() => {}}
      />,
    );

    expect(html).toContain("Preparando…");
    expect(html).toContain('disabled=""');
  });
});
