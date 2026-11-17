import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SubscriptionSearchBar } from "./SubscriptionSearchBar.js";

function render(overrides: Partial<Parameters<typeof SubscriptionSearchBar>[0]> = {}): string {
  return renderToStaticMarkup(
    <SubscriptionSearchBar
      term=""
      scope="podcasts"
      onTermChange={() => {}}
      onScopeChange={() => {}}
      onSubmit={() => {}}
      {...overrides}
    />,
  );
}

describe("SubscriptionSearchBar", () => {
  it("muestra el toggle de ámbito con el activo marcado", () => {
    const html = render({ scope: "podcasts" });
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain('bg-surface-soft text-foreground">Podcasts<');
    expect(html).toContain('text-muted hover:text-foreground">Episodios<');
  });

  it("el botón de buscar solo aparece en el ámbito de episodios", () => {
    const podcastHtml = render({ scope: "podcasts" });
    expect(podcastHtml).not.toContain("Buscar</button>");

    const episodeHtml = render({ scope: "episodios", term: "camion" });
    expect(episodeHtml).toContain("Buscar</button>");
    expect(episodeHtml).not.toContain('disabled=""');
  });

  it("sin término el botón de buscar episodios queda deshabilitado", () => {
    const html = render({ scope: "episodios", term: "" });
    expect(html).toContain('disabled=""');
  });

  it("el placeholder y el nombre accesible cambian con el ámbito", () => {
    const podcastHtml = render({ scope: "podcasts" });
    expect(podcastHtml).toContain('placeholder="Buscar en tus podcasts"');
    expect(podcastHtml).toContain('aria-label="Buscar podcasts por nombre"');

    const episodeHtml = render({ scope: "episodios" });
    expect(episodeHtml).toContain('placeholder="Buscar episodios en tus suscripciones"');
    expect(episodeHtml).toContain(
      'aria-label="Buscar episodios por título en tus suscripciones"',
    );
  });
});
