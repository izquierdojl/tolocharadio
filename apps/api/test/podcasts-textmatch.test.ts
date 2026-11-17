import { describe, expect, it } from "vitest";
import { normalizeSearchText, textMatches } from "../src/services/podcasts/textMatch.js";

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
