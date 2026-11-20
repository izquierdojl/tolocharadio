import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StatsResetSection } from "./StatsResetSection.js";

describe("StatsResetSection", () => {
  it("muestra las dos acciones independientes en espanol", () => {
    const html = renderToStaticMarkup(
      <StatsResetSection podcastsEnabled pending={null} onRequestReset={() => undefined} />,
    );

    expect(html).toContain("Estadísticas de escucha");
    expect(html).toContain("Reiniciar radio");
    expect(html).toContain("Reiniciar podcasts");
    expect(html).toContain("no se puede deshacer");
  });

  it("oculta la accion de podcasts cuando la seccion esta deshabilitada", () => {
    const html = renderToStaticMarkup(
      <StatsResetSection podcastsEnabled={false} pending={null} onRequestReset={() => undefined} />,
    );

    expect(html).toContain("Reiniciar radio");
    expect(html).not.toContain("Reiniciar podcasts");
  });

  it("deshabilita las acciones mientras hay un reinicio en curso", () => {
    const html = renderToStaticMarkup(
      <StatsResetSection podcastsEnabled pending="radio" onRequestReset={() => undefined} />,
    );

    expect(html.match(/disabled=""/g)).toHaveLength(2);
  });
});
