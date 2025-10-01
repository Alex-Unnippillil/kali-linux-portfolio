export const enum WorkerMessageType {
  Execute = 'pool/execute',
  Cancel = 'pool/cancel',
  Progress = 'pool/progress',
  Result = 'pool/result',
  Error = 'pool/error',
}

export interface ExecuteJobMessage<TPayload> {
  type: WorkerMessageType.Execute;
  jobId: string;
  payload: TPayload;
}

export interface CancelJobMessage {
  type: WorkerMessageType.Cancel;
  jobId: string;
}

export type WorkerIncomingMessage<TPayload> =
  | ExecuteJobMessage<TPayload>
  | CancelJobMessage;

export interface ProgressMessage<TProgress> {
  type: WorkerMessageType.Progress;
  jobId: string;
  progress: TProgress;
}

export interface ResultMessage<TResult> {
  type: WorkerMessageType.Result;
  jobId: string;
  result: TResult;
}

export interface ErrorMessage {
  type: WorkerMessageType.Error;
  jobId: string;
  error: string;
}

export type WorkerOutgoingMessage<TProgress, TResult> =
  | ProgressMessage<TProgress>
  | ResultMessage<TResult>
  | ErrorMessage;

export interface WorkerTaskContext<TProgress> {
  reportProgress: (progress: TProgress) => void;
  isCancelled: () => boolean;
}

/**
 * Utility to register a worker handler that understands the pool protocol.
 * @param handler The async handler that performs the heavy work.
 */
export const registerWorkerHandler = <TPayload, TResult, TProgress = unknown>(
  handler: (
    payload: TPayload,
    context: WorkerTaskContext<TProgress>,
  ) => Promise<TResult> | TResult,
) => {
  const cancelledJobs = new Set<string>();

  self.onmessage = async (
    event: MessageEvent<WorkerIncomingMessage<TPayload>>,
  ) => {
    const message = event.data;
    if (!message) return;

    if (message.type === WorkerMessageType.Cancel) {
      cancelledJobs.add(message.jobId);
      return;
    }

    if (message.type !== WorkerMessageType.Execute) return;

    const { jobId, payload } = message;
    cancelledJobs.delete(jobId);

    const context: WorkerTaskContext<TProgress> = {
      reportProgress(progress) {
        if (cancelledJobs.has(jobId)) return;
        (self as unknown as WorkerGlobalScope).postMessage({
          type: WorkerMessageType.Progress,
          jobId,
          progress,
        } as ProgressMessage<TProgress>);
      },
      isCancelled() {
        return cancelledJobs.has(jobId);
      },
    };

    try {
      const result = await handler(payload, context);
      if (cancelledJobs.has(jobId)) {
        cancelledJobs.delete(jobId);
        return;
      }
      (self as unknown as WorkerGlobalScope).postMessage({
        type: WorkerMessageType.Result,
        jobId,
        result,
      } as ResultMessage<TResult>);
    } catch (error: any) {
      if (cancelledJobs.has(jobId)) {
        cancelledJobs.delete(jobId);
        return;
      }
      (self as unknown as WorkerGlobalScope).postMessage({
        type: WorkerMessageType.Error,
        jobId,
        error:
          typeof error?.message === 'string'
            ? error.message
            : 'Worker task failed',
      } as ErrorMessage);
    }
  };
};
