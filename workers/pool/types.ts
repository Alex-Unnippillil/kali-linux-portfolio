import type { WorkerMessageType } from './messages';

export interface WorkerRegistration<TPayload = unknown, TResult = unknown, TProgress = unknown> {
  /**
   * Unique identifier for the worker type.
   */
  name: string;
  /**
   * Factory responsible for creating the Web Worker instance.
   */
  create: () => Worker;
  /**
   * Maximum concurrent instances allowed for this worker type.
   */
  maxConcurrency?: number;
}

export interface WorkerJobSnapshot<TResult = unknown, TProgress = unknown> {
  id: string;
  worker: string;
  status: 'queued' | 'running' | 'completed' | 'error' | 'cancelled';
  progress?: TProgress;
  result?: TResult;
  error?: string;
}

export interface EnqueueJobOptions<TPayload, TResult, TProgress> {
  worker: string;
  payload: TPayload;
  priority?: number;
  transfer?: Transferable[];
  onProgress?: (progress: TProgress) => void;
  onStart?: () => void;
  signal?: AbortSignal | null;
}

export interface EnqueuedJob<TResult> {
  jobId: string;
  promise: Promise<TResult>;
  cancel: () => void;
}

export interface WorkerPoolEventMap {
  'job-queued': WorkerJobSnapshot;
  'job-started': WorkerJobSnapshot;
  'job-progress': WorkerJobSnapshot;
  'job-complete': WorkerJobSnapshot;
  'job-error': WorkerJobSnapshot;
  'job-cancelled': WorkerJobSnapshot;
}

export type WorkerPoolEvent = keyof WorkerPoolEventMap;

export type WorkerPoolListener = <K extends WorkerPoolEvent>(
  event: K,
  snapshot: WorkerPoolEventMap[K],
) => void;

export interface InternalJob<TPayload, TResult, TProgress>
  extends EnqueueJobOptions<TPayload, TResult, TProgress> {
  jobId: string;
  createdAt: number;
  resolve: (value: TResult) => void;
  reject: (reason?: any) => void;
  cancelled: boolean;
}

export interface WorkerInstance {
  id: string;
  worker: Worker;
  currentJobId?: string;
}

export interface WorkerEnvelope<TProgress, TResult> {
  type: WorkerMessageType;
  jobId: string;
  progress?: TProgress;
  result?: TResult;
  error?: string;
}
