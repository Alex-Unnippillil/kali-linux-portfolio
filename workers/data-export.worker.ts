import {
  DATA_EXPORT_DEFAULT_MIME,
  DATA_EXPORT_STAGES,
  DataExportArchive,
  DataExportOptions,
  DataExportStage,
  DataExportWorkerCompleteEvent,
  DataExportWorkerErrorEvent,
  DataExportWorkerProgressEvent,
  DataExportWorkerRequest,
  formatExportFileName,
  gatherDataExport,
  serializeArchive,
  StageCallback,
  toArrayBuffer,
} from '../lib/dataExport';

export interface RunDataExportOptions extends Omit<DataExportOptions, 'onStageComplete'> {
  onStageComplete?: StageCallback;
}

export interface RunDataExportResult {
  archive: DataExportArchive;
  buffer: ArrayBuffer;
  bytes: number;
}

export const runDataExport = async (
  options: RunDataExportOptions = {},
): Promise<RunDataExportResult> => {
  const { onStageComplete, ...rest } = options;
  const archive = await gatherDataExport({
    ...rest,
    onStageComplete: (stage, summary) => {
      onStageComplete?.(stage, summary);
    },
  });
  const encoded = serializeArchive(archive);
  const buffer = toArrayBuffer(encoded);
  return {
    archive,
    buffer,
    bytes: encoded.byteLength,
  };
};

const emitProgress = (
  stage: DataExportStage,
  summary: Parameters<StageCallback>[1],
  requestId: string | undefined,
): DataExportWorkerProgressEvent => ({
  type: 'progress',
  stage,
  completed: DATA_EXPORT_STAGES.indexOf(stage) + 1,
  total: DATA_EXPORT_STAGES.length,
  items: summary.items,
  bytes: summary.bytes,
  requestId,
});

const emitComplete = (
  archive: DataExportArchive,
  buffer: ArrayBuffer,
  bytes: number,
  requestId: string | undefined,
): DataExportWorkerCompleteEvent => ({
  type: 'complete',
  archive,
  buffer,
  bytes,
  mime: DATA_EXPORT_DEFAULT_MIME,
  suggestedName: formatExportFileName(archive.generatedAt),
  requestId,
});

const emitError = (
  error: unknown,
  requestId: string | undefined,
): DataExportWorkerErrorEvent => ({
  type: 'error',
  error: error instanceof Error ? error.message : String(error),
  requestId,
});

const isWorkerScope =
  typeof self !== 'undefined' && typeof (self as any).importScripts === 'function';

if (isWorkerScope) {
  const scope = self as DedicatedWorkerGlobalScope;
  scope.onmessage = async ({ data }) => {
    const message = data as DataExportWorkerRequest;
    if (!message || message.type !== 'start') return;
    const { requestId } = message;
    try {
      const result = await runDataExport({
        onStageComplete: (stage, summary) => {
          const progress: DataExportWorkerProgressEvent = emitProgress(
            stage,
            summary,
            requestId,
          );
          scope.postMessage(progress);
        },
      });
      const complete: DataExportWorkerCompleteEvent = emitComplete(
        result.archive,
        result.buffer,
        result.bytes,
        requestId,
      );
      scope.postMessage(complete, [result.buffer]);
    } catch (err) {
      scope.postMessage(emitError(err, requestId));
    }
  };
}

export type { DataExportWorkerRequest } from '../lib/dataExport';

export type { DataExportWorkerEvent } from '../lib/dataExport';
