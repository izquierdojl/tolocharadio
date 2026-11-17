import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EpisodeFavoriteButton } from "./EpisodeFavoriteButton.js";

describe("EpisodeFavoriteButton", () => {
  it("muestra el estado no favorito con el nombre accesible para añadir", () => {
    const html = renderToStaticMarkup(
      <EpisodeFavoriteButton isFavorite={false} onToggle={() => {}} />,
    );

    expect(html).toContain('aria-label="Añadir a favoritos"');
    expect(html).toContain('aria-pressed="false"');
    expect(html).not.toContain("fill-current");
    expect(html).not.toContain('disabled=""');
  });

  it("muestra el estado favorito con el corazón relleno", () => {
    const html = renderToStaticMarkup(
      <EpisodeFavoriteButton isFavorite onToggle={() => {}} />,
    );

    expect(html).toContain('aria-label="Quitar de favoritos"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("fill-current");
  });

  it("se deshabilita mientras la operación está pendiente", () => {
    const html = renderToStaticMarkup(
      <EpisodeFavoriteButton isFavorite={false} pending onToggle={() => {}} />,
    );

    expect(html).toContain('disabled=""');
    expect(html).toContain("disabled:opacity-50");
  });
});
