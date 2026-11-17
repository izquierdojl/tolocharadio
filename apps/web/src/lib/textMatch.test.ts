import { describe, expect, it } from "vitest";
import { filterByTitle, normalizeSearchText, textMatches } from "./textMatch.js";

describe("textMatch", () => {
  it("normaliza a minúsculas sin marcas diacríticas", () => {
    expect(normalizeSearchText("El Camión")).toBe("el camion");
    expect(normalizeSearchText("CRÓNICA")).toBe("cronica");
  });

  it("«camion» coincide con «El camión fantasma» sin distinguir mayúsculas ni acentos", () => {
    expect(textMatches("camion", "El camión fantasma")).toBe(true);
    expect(textMatches("CAMIÓN", "El camión fantasma")).toBe(true);
    expect(textMatches("fantasma", "El camión fantasma")).toBe(true);
  });

  it("es una coincidencia parcial «contiene», no exacta", () => {
    expect(textMatches("camión", "Historia de un camión de Radiodifusión")).toBe(true);
    expect(textMatches("camioneta", "El camión fantasma")).toBe(false);
  });

  it("un término vacío o en blanco no coincide con nada", () => {
    expect(textMatches("", "El camión fantasma")).toBe(false);
    expect(textMatches("   ", "El camión fantasma")).toBe(false);
  });

  it("recorta el término antes de comparar", () => {
    expect(textMatches("  camion  ", "El camión fantasma")).toBe(true);
  });

  it("deja intactos los caracteres que no son letras latinas acentuadas", () => {
    expect(normalizeSearchText("日本")).toBe("日本");
    expect(normalizeSearchText("Привет")).toBe("привет");
    expect(textMatches("привет", "Привет, mundo")).toBe(true);
  });
});

describe("filterByTitle", () => {
  const items = [
    { id: 1, title: "Zeta" },
    { id: 2, title: "álbum" },
    { id: 3, title: "Beta" },
  ];

  it("acota por título sin distinguir mayúsculas ni acentos", () => {
    expect(filterByTitle(items, "album")).toEqual([{ id: 2, title: "álbum" }]);
    expect(filterByTitle(items, "ALBUM")).toEqual([{ id: 2, title: "álbum" }]);
  });

  it("conserva el orden recibido", () => {
    expect(filterByTitle(items, "").map((i) => i.id)).toEqual([1, 2, 3]);
    expect(filterByTitle(items, "  ").map((i) => i.id)).toEqual([1, 2, 3]);
  });

  it("devuelve una copia sin filtrar con término vacío", () => {
    const copy = filterByTitle(items, "");
    expect(copy).toEqual(items);
    expect(copy).not.toBe(items);
  });

  it("sin coincidencias devuelve una lista vacía", () => {
    expect(filterByTitle(items, "inexistente")).toEqual([]);
  });
});
