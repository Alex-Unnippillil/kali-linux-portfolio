export interface CopyProgress {
  jobId: string;
  bytesProcessed: number;
  totalBytes: number;
  throughput: number;
  etaMs: number | null;
  startedAt: number;
  updatedAt: number;
}

export interface CopyPersistenceState {
  jobId: string;
  bytesProcessed: number;
  totalBytes: number;
  startedAt: number;
  updatedAt: number;
}

export interface CopySink {
  write: (chunk: Uint8Array) => Promise<void> | void;
  close?: () => Promise<void> | void;
  abort?: () => Promise<void> | void;
}

export interface CopyStreamOptions {
  jobId: string;
  totalBytes: number;
  signal?: AbortSignal;
  onProgress?: (progress: CopyProgress) => void;
  onPersist?: (state: CopyPersistenceState) => void | Promise<void>;
  persistIntervalMs?: number;
  schedule?: (cb: (timestamp: number) => void) => void;
  now?: () => number;
  startTime?: number;
  resumeFromBytes?: number;
}

const defaultNow = () =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

const waitForNextFrame = (schedule?: (cb: (timestamp: number) => void) => void) =>
  new Promise<void>((resolve) => {
    if (schedule) {
      schedule(() => resolve());
      return;
    }
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => resolve());
      return;
    }
    setTimeout(() => resolve(), 16);
  });

export const computeThroughput = (bytesProcessed: number, elapsedMs: number) => {
  if (elapsedMs <= 0) return 0;
  return bytesProcessed / (elapsedMs / 1000);
};

export const computeEta = (
  bytesProcessed: number,
  totalBytes: number,
  throughput: number,
): number | null => {
  if (!Number.isFinite(throughput) || throughput <= 0) return null;
  const remaining = Math.max(totalBytes - bytesProcessed, 0);
  return (remaining / throughput) * 1000;
};

export const formatBytes = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** exponent;
  const formatted =
    value >= 10 || exponent === 0 || Number.isInteger(value)
      ? value.toFixed(0)
      : value.toFixed(1);
  return `${formatted} ${units[exponent]}`;
};

export const formatEta = (etaMs: number | null) => {
  if (!Number.isFinite(etaMs) || etaMs === null || etaMs < 0) return '—';
  const totalSeconds = Math.max(0, Math.round(etaMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
};

export async function copyStreamWithProgress(
  source: AsyncIterable<Uint8Array>,
  sink: CopySink,
  options: CopyStreamOptions,
): Promise<CopyProgress> {
  const {
    jobId,
    totalBytes,
    signal,
    onProgress,
    onPersist,
    persistIntervalMs = 500,
    schedule,
    now = defaultNow,
    startTime,
    resumeFromBytes = 0,
  } = options;

  const startedAt = startTime ?? now();
  let bytesProcessed = resumeFromBytes;
  let lastPersistAt = startedAt;

  const emitProgress = (timestamp: number) => {
    const elapsed = Math.max(timestamp - startedAt, 0);
    const throughput = computeThroughput(bytesProcessed, elapsed);
    const etaMs = computeEta(bytesProcessed, totalBytes, throughput);
    const progress: CopyProgress = {
      jobId,
      bytesProcessed,
      totalBytes,
      throughput,
      etaMs,
      startedAt,
      updatedAt: timestamp,
    };
    onProgress?.(progress);
    return progress;
  };

  const persistState = async (timestamp: number) => {
    if (!onPersist) return;
    await onPersist({
      jobId,
      bytesProcessed,
      totalBytes,
      startedAt,
      updatedAt: timestamp,
    });
  };

  try {
    for await (const chunk of source) {
      if (signal?.aborted) {
        throw new DOMException('Copy aborted', 'AbortError');
      }
      await sink.write(chunk);
      bytesProcessed += chunk.byteLength;
      const timestamp = now();
      emitProgress(timestamp);
      if (persistIntervalMs && timestamp - lastPersistAt >= persistIntervalMs) {
        await persistState(timestamp);
        lastPersistAt = timestamp;
      }
      await waitForNextFrame(schedule);
    }
    const finalTimestamp = now();
    const finalProgress = emitProgress(finalTimestamp);
    await sink.close?.();
    await persistState(finalTimestamp);
    return finalProgress;
  } catch (error) {
    try {
      await sink.abort?.();
    } catch {
      /* ignore */
    }
    if (signal?.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
      throw new DOMException('Copy aborted', 'AbortError');
    }
    throw error;
  }
}

