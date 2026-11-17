import { describe, expect, it } from "vitest";
import type { BulkSubscriptionResult } from "./types.js";
import {
  OPML_IMPORT_BATCH_SIZE,
  aggregateBulkResults,
  chunkFeedUrls,
  runOpmlImport,
  type OpmlImportProgress,
} from "./opmlImport.js";

function bulkResult(overrides: Partial<BulkSubscriptionResult> = {}): BulkSubscriptionResult {
  return { imported: 0, skipped: 0, failed: 0, items: [], errors: [], ...overrides };
}

function feedUrls(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `https://example.org/feed-${index}.xml`);
}

describe("chunkFeedUrls", () => {
  it("trocea en lotes completos y un resto", () => {
    const urls = ["a", "b", "c", "d", "e"];
    expect(chunkFeedUrls(urls, 2)).toEqual([["a", "b"], ["c", "d"], ["e"]]);
    expect(chunkFeedUrls(feedUrls(6), 3)).toEqual([
      feedUrls(6).slice(0, 3),
      feedUrls(6).slice(3, 6),
    ]);
  });

  it("devuelve un único lote cuando el tamaño supera el total", () => {
    expect(chunkFeedUrls(["a", "b"], 10)).toEqual([["a", "b"]]);
  });

  it("devuelve una lista vacía sin feeds", () => {
    expect(chunkFeedUrls([], 5)).toEqual([]);
  });

  it("no modifica la lista original", () => {
    const urls = ["a", "b", "c"];
    chunkFeedUrls(urls, 1);
    expect(urls).toEqual(["a", "b", "c"]);
  });

  it("rechaza tamaños no válidos", () => {
    expect(() => chunkFeedUrls(["a"], 0)).toThrow(RangeError);
    expect(() => chunkFeedUrls(["a"], 1.5)).toThrow(RangeError);
  });
});

describe("aggregateBulkResults", () => {
  it("suma contadores y concatena errores en orden", () => {
    const first = bulkResult({
      imported: 3,
      skipped: 1,
      failed: 1,
      errors: [{ feedUrl: "https://a.test/feed", message: "timeout" }],
    });
    const second = bulkResult({
      imported: 4,
      failed: 1,
      errors: [{ feedUrl: "https://b.test/feed", message: "404" }],
    });

    expect(aggregateBulkResults([first, second])).toEqual({
      imported: 7,
      skipped: 1,
      failed: 2,
      errors: [
        { feedUrl: "https://a.test/feed", message: "timeout" },
        { feedUrl: "https://b.test/feed", message: "404" },
      ],
    });
  });

  it("devuelve ceros sin lotes", () => {
    expect(aggregateBulkResults([])).toEqual({ imported: 0, skipped: 0, failed: 0, errors: [] });
  });

  it("no modifica los resultados de entrada", () => {
    const input = bulkResult({
      imported: 2,
      errors: [{ feedUrl: "https://a.test/feed", message: "timeout" }],
    });
    const snapshot = JSON.stringify(input);

    aggregateBulkResults([input]);

    expect(JSON.stringify(input)).toBe(snapshot);
    expect(input.errors).toHaveLength(1);
  });
});

describe("runOpmlImport", () => {
  it("envía lotes secuenciales e informa del progreso acumulado", async () => {
    const calls: string[][] = [];
    const progress: OpmlImportProgress[] = [];

    const result = await runOpmlImport({
      feedUrls: feedUrls(12),
      importBatch: async (batch) => {
        calls.push(batch);
        return bulkResult({ imported: batch.length });
      },
      onProgress: (value) => progress.push(value),
    });

    expect(calls).toHaveLength(3);
    expect(calls.map((batch) => batch.length)).toEqual([5, 5, 2]);
    expect(calls.map((batch) => batch.length)).toEqual([
      OPML_IMPORT_BATCH_SIZE,
      OPML_IMPORT_BATCH_SIZE,
      2,
    ]);
    expect(progress.map((value) => value.processed)).toEqual([5, 10, 12]);
    expect(progress.at(-1)).toMatchObject({ total: 12, imported: 12, failed: 0 });
    expect(result).toMatchObject({ status: "done", processed: 12 });
    expect(result.summary).toEqual({ imported: 12, skipped: 0, failed: 0, errors: [] });
  });

  it("cuenta los fallos por feed sin detener la importación", async () => {
    const result = await runOpmlImport({
      feedUrls: feedUrls(4),
      batchSize: 2,
      importBatch: async (batch) =>
        bulkResult({
          imported: batch.length - 1,
          failed: 1,
          errors: [{ feedUrl: batch[0] ?? "", message: "feed inválido" }],
        }),
    });

    expect(result.status).toBe("done");
    expect(result.summary).toMatchObject({ imported: 2, failed: 2 });
    expect(result.summary.errors).toHaveLength(2);
  });

  it("cancela entre lotes sin enviar el siguiente", async () => {
    let cancelled = false;
    const calls: number[] = [];

    const result = await runOpmlImport({
      feedUrls: feedUrls(6),
      batchSize: 2,
      importBatch: async (batch) => {
        calls.push(batch.length);
        cancelled = true;
        return bulkResult({ imported: batch.length });
      },
      isCancelled: () => cancelled,
    });

    expect(calls).toEqual([2]);
    expect(result).toMatchObject({ status: "cancelled", processed: 2 });
    expect(result.summary.imported).toBe(2);
  });

  it("marca como cancelada la importación cancelada durante el último lote", async () => {
    let cancelled = false;
    const calls: number[] = [];

    const result = await runOpmlImport({
      feedUrls: feedUrls(4),
      batchSize: 2,
      importBatch: async (batch) => {
        calls.push(batch.length);
        if (calls.length === 2) cancelled = true;
        return bulkResult({ imported: batch.length });
      },
      isCancelled: () => cancelled,
    });

    expect(calls).toEqual([2, 2]);
    expect(result).toMatchObject({ status: "cancelled", processed: 4 });
    expect(result.summary.imported).toBe(4);
  });

  it("no arranca si ya estaba cancelada", async () => {
    const calls: string[][] = [];

    const result = await runOpmlImport({
      feedUrls: feedUrls(3),
      importBatch: async (batch) => {
        calls.push(batch);
        return bulkResult({ imported: batch.length });
      },
      isCancelled: () => true,
    });

    expect(calls).toEqual([]);
    expect(result).toMatchObject({ status: "cancelled", processed: 0 });
    expect(result.summary).toEqual({ imported: 0, skipped: 0, failed: 0, errors: [] });
  });

  it("se detiene ante un fallo intermedio conservando los lotes previos", async () => {
    const calls: number[] = [];
    const failure = new Error("sin conexión");

    const result = await runOpmlImport({
      feedUrls: feedUrls(6),
      batchSize: 2,
      importBatch: async (batch) => {
        calls.push(batch.length);
        if (calls.length === 2) throw failure;
        return bulkResult({ imported: batch.length });
      },
    });

    expect(calls).toEqual([2, 2]);
    expect(result.status).toBe("failed");
    expect(result.processed).toBe(2);
    expect(result.summary).toMatchObject({ imported: 2, failed: 0 });
    expect(result.error).toBe(failure);
  });

  it("falla en el primer lote sin contadores alterados", async () => {
    const result = await runOpmlImport({
      feedUrls: feedUrls(4),
      batchSize: 2,
      importBatch: async () => {
        throw new Error("HTTP 500");
      },
    });

    expect(result).toMatchObject({ status: "failed", processed: 0 });
    expect(result.summary).toEqual({ imported: 0, skipped: 0, failed: 0, errors: [] });
    expect(result.error).toBeInstanceOf(Error);
  });
});
