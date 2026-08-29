import { describe, expect, it } from "vitest";
import { normalizeOptions } from "../src/services/normalize.js";

describe("normalizeOptions", () => {
  it("extrae nombres unicos ordenados alfabeticamente", () => {
    const raw = [
      { name: "Spain", stationcount: 100 },
      { name: "Argentina", stationcount: 50 },
      { name: "Brazil", stationcount: 75 },
    ];
    expect(normalizeOptions(raw)).toEqual(["Argentina", "Brazil", "Spain"]);
  });

  it("descarta valores vacios, nulos y no-strings", () => {
    const raw = [
      { name: "", stationcount: 10 },
      { name: "  ", stationcount: 10 },
      { name: null, stationcount: 10 },
      { name: 42, stationcount: 10 },
      { name: "Spain", stationcount: 10 },
    ];
    expect(normalizeOptions(raw)).toEqual(["Spain"]);
  });

  it("descarta entradas con stationcount 0 cuando el origen la informa", () => {
    const raw = [
      { name: "Spain", stationcount: 0 },
      { name: "Spain", stationcount: "0" },
      { name: "Italy", stationcount: -3 },
      { name: "Portugal", stationcount: 1 },
      { name: "France" },
    ];
    expect(normalizeOptions(raw)).toEqual(["France", "Portugal"]);
  });

  it("deduplica nombres (insensible a mayusculas) e ignora dosificacion de mando", () => {
    const raw = [
      { name: "Spanish", stationcount: 10 },
      { name: "spanish", stationcount: 20 },
      { name: "Spanish", stationcount: 30 },
    ];
    expect(normalizeOptions(raw)).toEqual(["Spanish"]);
  });

  it("acepta entradas de solo string y degenera a lista vacia si no es array", () => {
    expect(normalizeOptions(["spanish", "english", "spanish"])).toEqual(["english", "spanish"]);
    expect(normalizeOptions({ name: "x" })).toEqual([]);
    expect(normalizeOptions(null)).toEqual([]);
  });

  it("ordena por estaciones (descendente) con desempate alfabetico", () => {
    const raw = [
      { name: "Pop", stationcount: 900 },
      { name: "rock", stationcount: 3000 },
      { name: "news", stationcount: 900 },
      { name: "junk", stationcount: 1 },
      { name: "older-dead", stationcount: 0 },
    ];
    expect(normalizeOptions(raw, "stationcount")).toEqual(["rock", "news", "Pop", "junk"]);
  });

  it("sin datos de estaciones ordena estacioncount solo con entradas de objeto", () => {
    expect(normalizeOptions(["rock", "jazz"], "stationcount")).toEqual(["jazz", "rock"]);
  });
});