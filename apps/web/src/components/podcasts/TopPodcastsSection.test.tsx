import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { PodcastSearchResult } from "../../lib/types.js";
import { TopPodcastsSection } from "./TopPodcastsSection.js";

const item = (n: number): PodcastSearchResult => ({
  title: `Programa ${n}`,
  author: `Autor ${n}`,
  feedUrl: `https://example.org/${n}.xml`,
  imageUrl: null,
  categories: ["Comedia"],
  description: null,
});

const base = {
  country: "es",
  genre: null,
  items: [item(1), item(2)],
  loading: false,
  error: null,
  genreUnavailable: false,
  subscribePending: false,
  onCountryChange: () => undefined,
  onGenreChange: () => undefined,
  onSubscribe: () => undefined,
  onRetry: () => undefined,
};

describe("TopPodcastsSection", () => {
  it("muestra el ranking numerado con España seleccionada", () => {
    const html = renderToStaticMarkup(<TopPodcastsSection {...base} />);
    expect(html).toContain("Populares");
    expect(html).toContain("Programa 1");
    expect(html).toContain("Programa 2");
    expect(html).toContain("Suscribirse");
    expect(html).toMatch(/<option value="es" selected="">España<\/option>/);
    expect(html).toContain("Todas las categorías");
  });

  it("selecciona el país y la categoría recordados", () => {
    const html = renderToStaticMarkup(<TopPodcastsSection {...base} country="mx" genre="1303" />);
    expect(html).toMatch(/<option value="mx" selected="">México<\/option>/);
    expect(html).toMatch(/<option value="1303" selected="">Comedia<\/option>/);
  });

  it("muestra el estado de carga", () => {
    const html = renderToStaticMarkup(<TopPodcastsSection {...base} items={undefined} loading />);
    expect(html).toContain("Cargando ranking");
  });

  it("muestra el error con reintento", () => {
    const html = renderToStaticMarkup(
      <TopPodcastsSection {...base} items={undefined} error="Directorio no disponible" />,
    );
    expect(html).toContain("Directorio no disponible");
    expect(html).toContain("Reintentar");
  });

  it("avisa con discreción si falla la categoría y mantiene el ranking general", () => {
    const html = renderToStaticMarkup(
      <TopPodcastsSection {...base} genre="1303" genreUnavailable />,
    );
    expect(html).toContain("ranking por categoría no está disponible");
    expect(html).toContain("Programa 1");
  });

  it("indica cuando no hay ranking", () => {
    const html = renderToStaticMarkup(<TopPodcastsSection {...base} items={[]} />);
    expect(html).toContain("No hay ranking disponible");
  });
});
