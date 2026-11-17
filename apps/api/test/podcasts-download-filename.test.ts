import { describe, expect, it } from "vitest";
import {
  extensionFromContentType,
  filenameFromContentDisposition,
  resolveDownloadFilename,
} from "../src/services/podcasts/downloadFilename.js";

function resolve(overrides: Partial<Parameters<typeof resolveDownloadFilename>[0]> = {}) {
  return resolveDownloadFilename({
    episodeId: 42,
    episodeTitle: "Episodio de prueba",
    finalUrl: "https://audio.example.org/ep1.mp3",
    contentType: "audio/mpeg",
    originContentDisposition: null,
    ...overrides,
  });
}

describe("downloadFilename", () => {
  it("extrae filename y filename* del Content-Disposition para la extensión", () => {
    expect(
      filenameFromContentDisposition(
        `attachment; filename="Cronica del bosque.mp3"; filename*=UTF-8''Cr%C3%B3nica%20del%20bosque.mp3`,
      ),
    ).toBe("Crónica del bosque.mp3");
    expect(
      filenameFromContentDisposition('attachment; filename="Mi episodio.m4a"'),
    ).toBe("Mi episodio.m4a");
  });

  it("usa el título del episodio con prefijo y conserva acentos", () => {
    const result = resolve({
      episodeTitle: "Crónica del bosque",
      originContentDisposition: 'attachment; filename="123456789.mp3"',
    });

    expect(result.filename).toBe("tolocharadio_Crónica del bosque.mp3");
    expect(result.asciiFilename).toBe("tolocharadio_Cronica del bosque.mp3");
    expect(result.contentDisposition).toContain(
      'filename="tolocharadio_Cronica del bosque.mp3"',
    );
    expect(result.contentDisposition).toContain(
      "filename*=UTF-8''tolocharadio_Cr%C3%B3nica%20del%20bosque.mp3",
    );
  });

  it("ignora el nombre numérico del origen para la base", () => {
    const result = resolve({
      episodeTitle: "Mi episodio",
      originContentDisposition: 'attachment; filename="987654321.mp3"',
    });

    expect(result.filename).toBe("tolocharadio_Mi episodio.mp3");
    expect(result.filename).not.toContain("987654321");
  });

  it("elimina componentes de navegación y separadores de ruta del título", () => {
    const result = resolve({
      episodeTitle: "../../etc/passwd",
      originContentDisposition: null,
      contentType: "audio/mpeg",
    });

    expect(result.filename).not.toContain("/");
    expect(result.filename).not.toContain("\\");
    expect(result.filename).not.toContain("..");
    expect(result.filename).toMatch(/^tolocharadio_/);
    expect(result.filename).toMatch(/\.mp3$/);
  });

  it("añade la extensión del Content-Type cuando el origen no la tiene", () => {
    const result = resolve({
      episodeTitle: "Entrevista",
      finalUrl: "https://audio.example.org/download",
      originContentDisposition: 'attachment; filename="entrevista"',
      contentType: "audio/mp4",
    });

    expect(result.filename).toBe("tolocharadio_Entrevista.m4a");
  });

  it("usa la extensión del nombre del archivo final cuando no hay Content-Disposition", () => {
    const result = resolve({
      episodeTitle: "Título distinto",
      finalUrl: "https://cdn.example.org/audio/temporada-2/episodio-7.ogg",
      originContentDisposition: null,
      contentType: "audio/ogg",
    });

    expect(result.filename).toBe("tolocharadio_Título distinto.ogg");
  });

  it("usa el prefijo y la reserva .mp3 cuando no hay título ni metadatos", () => {
    const result = resolve({
      episodeTitle: "",
      finalUrl: "https://cdn.example.org/",
      originContentDisposition: null,
      contentType: null,
    });

    expect(result.filename).toBe("tolocharadio_episodio-42.mp3");
  });

  it("no duplica la extensión si el título ya la incluye", () => {
    const result = resolve({ episodeTitle: "Episodio 1.mp3" });
    expect(result.filename).toBe("tolocharadio_Episodio 1.mp3");
  });

  it("sustituye caracteres inválidos por espacios sin dejar guiones sueltos", () => {
    const result = resolve({ episodeTitle: "182: Blackshades" });
    expect(result.filename).toBe("tolocharadio_182 Blackshades.mp3");
  });

  it("el prefijo evita nombres reservados de Windows", () => {
    const result = resolve({
      episodeTitle: "CON",
      originContentDisposition: 'attachment; filename="CON.mp3"',
      contentType: "audio/mpeg",
    });

    expect(result.filename).toBe("tolocharadio_CON.mp3");
  });

  it("limita la longitud del nombre sin perder el prefijo ni la extensión", () => {
    const result = resolve({ episodeTitle: "a".repeat(300) });

    expect(result.filename.length).toBeLessThanOrEqual(120);
    expect(result.filename.startsWith("tolocharadio_")).toBe(true);
    expect(result.filename.endsWith(".mp3")).toBe(true);
  });

  it("mapea los tipos de audio habituales", () => {
    expect(extensionFromContentType("audio/mpeg")).toBe(".mp3");
    expect(extensionFromContentType("audio/x-m4a")).toBe(".m4a");
    expect(extensionFromContentType("audio/ogg; charset=utf-8")).toBe(".ogg");
    expect(extensionFromContentType("text/html")).toBeNull();
  });
});
