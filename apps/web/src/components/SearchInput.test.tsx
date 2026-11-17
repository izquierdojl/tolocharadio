import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SearchInput } from "./SearchInput.js";

function render(overrides: Partial<Parameters<typeof SearchInput>[0]> = {}): string {
  return renderToStaticMarkup(
    <SearchInput
      value=""
      onChange={() => {}}
      placeholder="Buscar episodios"
      ariaLabel="Buscar episodios por título"
      {...overrides}
    />,
  );
}

describe("SearchInput", () => {
  it("muestra el icono, el placeholder y el nombre accesible", () => {
    const html = render();
    expect(html).toContain('placeholder="Buscar episodios"');
    expect(html).toContain('aria-label="Buscar episodios por título"');
    expect(html).toContain('value=""');
  });

  it("muestra el botón de limpiar solo cuando hay texto", () => {
    const withText = render({ value: "camion" });
    expect(withText).toContain('value="camion"');
    expect(withText).toContain('aria-label="Limpiar búsqueda"');

    const withoutText = render({ value: "" });
    expect(withoutText).toContain('value=""');
    expect(withoutText).not.toContain('aria-label="Limpiar búsqueda"');
  });

  it("expone el id recibido para etiquetas externas", () => {
    const html = render({ id: "buscar-suscripciones" });
    expect(html).toContain('id="buscar-suscripciones"');
  });
});
