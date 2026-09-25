export interface WorkerRequest<TPayload = unknown> {
  type: string;
  id: string;
  payload: TPayload;
}

export interface WorkerErrorPayload {
  name?: string;
  message: string;
  stack?: string;
  cause?: string;
}

export interface WorkerSuccess<TResult = unknown> {
  ok: true;
  id: string;
  result: TResult;
}

export interface WorkerFailure {
  ok: false;
  id: string;
  error: WorkerErrorPayload;
}

export type WorkerResponse<TResult = unknown> =
  | WorkerSuccess<TResult>
  | WorkerFailure;

export interface WorkerMessageTarget {
  postMessage(message: unknown): void;
  terminate?(): void;
}

export const serializeError = (error: unknown): WorkerErrorPayload => {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
      cause: error.cause ? String(error.cause) : undefined,
    };
  }

  if (typeof error === 'string') {
    return { message: error };
  }

  try {
    return { message: JSON.stringify(error) };
  } catch {
    return { message: 'Unknown worker error' };
  }
};

export const createSuccessResponse = <TResult = unknown>(
  id: string,
  result: TResult
): WorkerSuccess<TResult> => ({
  ok: true,
  id,
  result,
});

export const createErrorResponse = (
  id: string,
  error: unknown
): WorkerFailure => ({
  ok: false,
  id,
  error: serializeError(error),
});

export interface TimeoutOptions {
  timeoutMs: number;
  cancelMessageType?: string;
  onTimeout?: (id: string) => void;
  terminateOnTimeout?: boolean;
}

export const startWorkerTimeout = (
  worker: WorkerMessageTarget,
  requestId: string,
  options: TimeoutOptions
): (() => void) => {
  const { timeoutMs, cancelMessageType = 'cancel', onTimeout, terminateOnTimeout } = options;
  const timer = setTimeout(() => {
    onTimeout?.(requestId);
    try {
      worker.postMessage({ type: cancelMessageType, id: requestId, payload: null });
    } catch {
      // ignore failures when sending cancellation
    }
    if (terminateOnTimeout && typeof worker.terminate === 'function') {
      worker.terminate();
    }
  }, timeoutMs);

  return () => clearTimeout(timer);
};

export const cancelWorkerRequest = (
  worker: WorkerMessageTarget,
  requestId: string,
  cancelMessageType = 'cancel'
) => {
  worker.postMessage({ type: cancelMessageType, id: requestId, payload: null });
};
