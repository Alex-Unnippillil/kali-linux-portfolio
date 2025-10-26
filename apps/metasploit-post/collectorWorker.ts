import { buildBatches, type ArtifactPayload, type BatchResult, MAX_ARCHIVE_SIZE } from './utils/collectorWorkerCore';

interface StartMessage {
  type: 'start';
  artifacts: ArtifactPayload[];
  maxBytes?: number;
}

type CollectorMessage = StartMessage;

type WorkerResponse =
  | { type: 'progress'; completed: number; total: number; batchCount: number }
  | {
      type: 'complete';
      totalBytes: number;
      batches: Array<{ name: string; size: number; entries: number; buffer: ArrayBuffer }>;
    }
  | { type: 'error'; message: string };

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = (event: MessageEvent<CollectorMessage>) => {
  if (event.data?.type !== 'start') {
    return;
  }

  const { artifacts, maxBytes = MAX_ARCHIVE_SIZE } = event.data;

  try {
    const batches: BatchResult[] = buildBatches(artifacts, maxBytes, (completed, total, batchCount) => {
      const progressMessage: WorkerResponse = { type: 'progress', completed, total, batchCount };
      ctx.postMessage(progressMessage);
    });

    const payload: WorkerResponse = {
      type: 'complete',
      totalBytes: batches.reduce((acc, batch) => acc + batch.size, 0),
      batches: batches.map((batch) => {
        const buffer = batch.buffer.buffer.slice(batch.buffer.byteOffset, batch.buffer.byteOffset + batch.buffer.byteLength);
        return {
          name: batch.name,
          entries: batch.entries,
          size: batch.size,
          buffer,
        };
      }),
    };

    ctx.postMessage(
      payload,
      payload.batches.map((b) => b.buffer),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to build artifact archive';
    const response: WorkerResponse = { type: 'error', message };
    ctx.postMessage(response);
  }
};
