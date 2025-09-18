export type SimulatedDownloadStatus =
  | 'idle'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface SimulatedDownloadCallbacks {
  onProgress: (downloadedBytes: number) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

export interface SimulatedDownloadOptions extends SimulatedDownloadCallbacks {
  totalBytes: number;
  /**
   * Number of bytes transferred per interval. Defaults to a twentieth of the
   * total size (min 1 byte).
   */
  chunkSize?: number;
  /** Interval in milliseconds between progress updates. Defaults to 250ms. */
  intervalMs?: number;
  /**
   * Optional byte offset that will trigger a simulated failure once the
   * transfer reaches or exceeds it.
   */
  failAtBytes?: number;
  /**
   * Optional seed for resuming an existing download. Allows the simulation to
   * start from a non-zero offset.
   */
  startingBytes?: number;
  /** Custom error message when the simulation fails. */
  errorMessage?: string;
}

export interface SimulatedDownloadController {
  start: () => void;
  pause: () => void;
  resume: () => void;
  cancel: () => void;
  status: () => SimulatedDownloadStatus;
  downloadedBytes: () => number;
}

const DEFAULT_INTERVAL = 250;

export function createSimulatedDownload({
  totalBytes,
  chunkSize,
  intervalMs,
  failAtBytes,
  startingBytes = 0,
  errorMessage = 'Simulated network error',
  onProgress,
  onComplete,
  onError,
}: SimulatedDownloadOptions): SimulatedDownloadController {
  const clampedTotal = Math.max(0, Math.floor(totalBytes));
  const sizePerChunk = Math.max(
    1,
    chunkSize && chunkSize > 0
      ? Math.floor(chunkSize)
      : Math.max(1, Math.floor(clampedTotal / 20))
  );
  const interval = intervalMs && intervalMs > 0 ? intervalMs : DEFAULT_INTERVAL;
  let downloaded = Math.max(0, Math.min(clampedTotal, Math.floor(startingBytes)));
  let timer: ReturnType<typeof setInterval> | null = null;
  let state: SimulatedDownloadStatus = 'idle';
  let failed = false;

  const clearTimer = () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };

  const finalize = (nextState: SimulatedDownloadStatus) => {
    state = nextState;
    clearTimer();
  };

  const step = () => {
    if (state !== 'running') return;
    const nextBytes = Math.min(clampedTotal, downloaded + sizePerChunk);

    if (
      typeof failAtBytes === 'number' &&
      !failed &&
      nextBytes >= failAtBytes &&
      failAtBytes >= 0
    ) {
      failed = true;
      downloaded = Math.min(clampedTotal, Math.max(downloaded, Math.floor(failAtBytes)));
      onProgress(downloaded);
      finalize('failed');
      onError(new Error(errorMessage));
      return;
    }

    downloaded = nextBytes;
    onProgress(downloaded);

    if (downloaded >= clampedTotal) {
      finalize('completed');
      onComplete();
    }
  };

  const startInterval = () => {
    if (timer || state === 'completed' || state === 'failed' || state === 'cancelled') {
      return;
    }
    state = 'running';
    timer = setInterval(step, interval);
  };

  return {
    start: () => {
      if (state === 'idle' || state === 'paused') {
        startInterval();
      }
    },
    pause: () => {
      if (state === 'running') {
        state = 'paused';
        clearTimer();
      }
    },
    resume: () => {
      if (state === 'paused' || state === 'idle') {
        startInterval();
      }
    },
    cancel: () => {
      if (state === 'completed' || state === 'failed' || state === 'cancelled') {
        return;
      }
      finalize('cancelled');
    },
    status: () => state,
    downloadedBytes: () => downloaded,
  };
}
