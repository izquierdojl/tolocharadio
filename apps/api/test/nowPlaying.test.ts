import { describe, expect, it } from "vitest";
import {
  NOW_PLAYING_MAX_LENGTH,
  decodeIcyText,
  extractStreamTitle,
  normalizeNowPlaying,
} from "../src/lib/icy.js";

const utf8 = (text: string) => new TextEncoder().encode(text);

function padded(text: string): Uint8Array {
  const bytes = utf8(text);
  const out = new Uint8Array(Math.ceil(bytes.length / 16) * 16);
  out.set(bytes);
  return out;
}

describe("extractStreamTitle", () => {
  it("extrae el título de un bloque con relleno de NUL", () => {
    expect(extractStreamTitle(padded("StreamTitle='Maná - Clavado en un bar';"))).toBe(
      "Maná - Clavado en un bar",
    );
  });

  it("ignora otros campos tras el título", () => {
    expect(
      extractStreamTitle(padded("StreamTitle='Roxy Music - More Than This';StreamUrl='';")),
    ).toBe("Roxy Music - More Than This");
  });

  it("admite comillas dentro del título", () => {
    expect(extractStreamTitle(padded("StreamTitle='Don't Miss The Party Line';StreamUrl='x';"))).toBe(
      "Don't Miss The Party Line",
    );
    expect(extractStreamTitle(padded("StreamTitle='It';s odd';"))).toBe("It';s odd");
  });

  it("devuelve cadena vacía para un título vacío", () => {
    expect(extractStreamTitle(padded("StreamTitle='';"))).toBe("");
  });

  it("devuelve null si no hay StreamTitle o el bloque está vacío", () => {
    expect(extractStreamTitle(new Uint8Array(0))).toBeNull();
    expect(extractStreamTitle(padded("StreamUrl='https://x';"))).toBeNull();
  });

  it("decodifica Latin-1 cuando el bloque no es UTF-8 válido", () => {
    const latin1 = Uint8Array.from(
      Buffer.from("StreamTitle='Canción de Peñíscola';", "latin1"),
    );
    expect(extractStreamTitle(latin1)).toBe("Canción de Peñíscola");
  });
});

describe("decodeIcyText", () => {
  it("prefiere UTF-8 y recorta NUL finales", () => {
    expect(decodeIcyText(Uint8Array.from([...utf8("José"), 0, 0]))).toBe("José");
  });
});

describe("normalizeNowPlaying", () => {
  const cases: Array<[string, string, string | null, string | null]> = [
    // [descripción, StreamTitle, nombre de la emisora, esperado]
    ["igual al nombre", "Loca FM", "Loca FM live", null],
    ["palabras del nombre", "Loca URBAN", "Loca FM Urban", null],
    ["aviso de directo", "Remember The Music FM - Emision en directo", "Remember the music FM 96.6", null],
    ["solo nombre (otra)", "Flaix FM", "Flaix FM", null],
    ["publicidad con dominio", "shopify.com - Ein bisschen Verbraucherinformationen ...", "__80 EXITOS", null],
    ["URL", "Escúchanos en https://radio.example.org", "Radio X", null],
    ["www", "Visita www.ejemplo", "Radio X", null],
    ["código interno", "FHR_2026_NatalieRivera_NH", "Cafe Mambo Ibiza Radio", null],
    ["token largo", "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "Radio X", null],
    ["vacío", "", "Radio X", null],
    ["separadores", " - ", "Radio X", null],
    ["canción", "Maná - Clavado en un bar", "Cadena 100", "Maná - Clavado en un bar"],
    ["programa", "con Antonio San José - FIKA CAFE ", "Radio España", "con Antonio San José - FIKA CAFE"],
    ["artista de una palabra", "Rosalía", "Radio X", "Rosalía"],
    ["con punto no dominio", "Mercer feat. Ron Carroll - Satisfy", "ElectroDanceWorld Radio", "Mercer feat. Ron Carroll - Satisfy"],
    ["marcador Triton", "Advertisement", "Onda Cero Gijón", null],
    ["marcador en mayúsculas", "ADVERT", "Radio X", null],
    ["publicidad en español", "Publicidad", "Radio X", null],
    ["cuña con tilde", "Cuña", "Radio X", null],
    ["canción con palabra de anuncio", "Advertising Space - Robbie Williams", "Radio X", "Advertising Space - Robbie Williams"],
  ];

  it.each(cases)("%s", (_desc, raw, stationName, expected) => {
    expect(normalizeNowPlaying(raw, { stationName: stationName ?? "" })).toBe(expected);
  });

  it("descarta el texto igual a icy-name aunque difiera del nombre", () => {
    expect(normalizeNowPlaying("LOCA urban", { stationName: "Loca FM", icyName: "Loca Urban" })).toBeNull();
  });

  it("ignora mayúsculas y tildes al comparar con el nombre", () => {
    expect(normalizeNowPlaying("RADIOLE", { stationName: "Radiolé" })).toBeNull();
  });

  it("limpia controles y espacios y limita la longitud", () => {
    expect(normalizeNowPlaying("  Uno\t\n  Dos  ", { stationName: "X" })).toBe("Uno Dos");
    const long = "palabra ".repeat(60);
    const result = normalizeNowPlaying(long, { stationName: "X" });
    expect(result!.length).toBeLessThanOrEqual(NOW_PLAYING_MAX_LENGTH);
  });

  it("devuelve null para null", () => {
    expect(normalizeNowPlaying(null, { stationName: "X" })).toBeNull();
  });
});
