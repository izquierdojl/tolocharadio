import type { BulkSubscriptionResult } from "./types.js";

/// Número de feeds que viajan en cada petición de importación.
export const OPML_IMPORT_BATCH_SIZE = 5;

export interface OpmlImportSummary {
  imported: number;
  skipped: number;
  failed: number;
  errors: BulkSubscriptionResult["errors"];
}

export interface OpmlImportProgress {
  processed: number;
  total: number;
  imported: number;
  skipped: number;
  failed: number;
}

export interface RunOpmlImportOptions {
  feedUrls: readonly string[];
  importBatch: (feedUrls: string[]) => Promise<BulkSubscriptionResult>;
  batchSize?: number;
  isCancelled?: () => boolean;
  onProgress?: (progress: OpmlImportProgress) => void;
}

export type OpmlImportStatus = "done" | "cancelled" | "failed";

export interface OpmlImportResult {
  status: OpmlImportStatus;
  processed: number;
  summary: OpmlImportSummary;
  error?: unknown;
}

function emptySummary(): OpmlImportSummary {
  return { imported: 0, skipped: 0, failed: 0, errors: [] };
}

/// Divide las URLs en lotes consecutivos del tamaño indicado.
export function chunkFeedUrls(urls: readonly string[], size: number): string[][] {
  if (!Number.isInteger(size) || size < 1) {
    throw new RangeError("El tamaño de lote debe ser un entero positivo");
  }
  const chunks: string[][] = [];
  for (let index = 0; index < urls.length; index += size) {
    chunks.push(urls.slice(index, index + size));
  }
  return chunks;
}

/// Suma los resultados de varios lotes sin modificar los originales.
export function aggregateBulkResults(
  results: readonly BulkSubscriptionResult[],
): OpmlImportSummary {
  const summary = emptySummary();
  for (const result of results) {
    summary.imported += result.imported;
    summary.skipped += result.skipped;
    summary.failed += result.failed;
    summary.errors.push(...result.errors);
  }
  return summary;
}

/// Importa los feeds en lotes secuenciales, informando del progreso y
/// deteniéndose en el límite del lote cuando se solicita cancelar.
export async function runOpmlImport({
  feedUrls,
  importBatch,
  batchSize = OPML_IMPORT_BATCH_SIZE,
  isCancelled,
  onProgress,
}: RunOpmlImportOptions): Promise<OpmlImportResult> {
  const total = feedUrls.length;
  const batches = chunkFeedUrls(feedUrls, batchSize);
  const results: BulkSubscriptionResult[] = [];
  let processed = 0;

  for (const batch of batches) {
    if (isCancelled?.()) {
      return { status: "cancelled", processed, summary: aggregateBulkResults(results) };
    }

    try {
      results.push(await importBatch(batch));
    } catch (error) {
      return {
        status: "failed",
        processed,
        summary: aggregateBulkResults(results),
        error,
      };
    }

    processed += batch.length;
    const summary = aggregateBulkResults(results);
    onProgress?.({
      processed,
      total,
      imported: summary.imported,
      skipped: summary.skipped,
      failed: summary.failed,
    });
  }

  return {
    status: isCancelled?.() ? "cancelled" : "done",
    processed,
    summary: aggregateBulkResults(results),
  };
}
