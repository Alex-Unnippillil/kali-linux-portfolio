import { useCallback, useEffect, useMemo, useState } from 'react';
import { workerPool } from '../workers/pool/WorkerPool';
import type {
  EnqueueJobOptions,
  EnqueuedJob,
  WorkerJobSnapshot,
  WorkerPoolListener,
} from '../workers/pool/types';

export type UseWorkerPoolJobs<TResult, TProgress> = Record<
  string,
  WorkerJobSnapshot<TResult, TProgress>
>;

type LocalEnqueueOptions<TPayload, TResult, TProgress> = Omit<
  EnqueueJobOptions<TPayload, TResult, TProgress>,
  'worker'
>;

export interface UseWorkerPoolResult<TPayload, TResult, TProgress> {
  jobs: UseWorkerPoolJobs<TResult, TProgress>;
  enqueueJob: (
    options: LocalEnqueueOptions<TPayload, TResult, TProgress>,
  ) => EnqueuedJob<TResult>;
  cancelJob: (jobId: string) => void;
  getJob: (jobId: string) => WorkerJobSnapshot<TResult, TProgress> | undefined;
}

export function useWorkerPool<TPayload = unknown, TResult = unknown, TProgress = unknown>(
  worker: string,
): UseWorkerPoolResult<TPayload, TResult, TProgress> {
  const [jobs, setJobs] = useState<UseWorkerPoolJobs<TResult, TProgress>>({});

  const listener = useMemo<WorkerPoolListener>(
    () => (event, snapshot) => {
      if (snapshot.worker !== worker) return;
      setJobs((prev) => {
        const next = { ...prev };
        const typedSnapshot = snapshot as WorkerJobSnapshot<TResult, TProgress>;
        next[typedSnapshot.id] = typedSnapshot;
        return next;
      });
    },
    [worker],
  );

  useEffect(() => workerPool.addListener(listener), [listener]);

  const enqueueJob = useCallback(
    (
      options: LocalEnqueueOptions<TPayload, TResult, TProgress>,
    ): EnqueuedJob<TResult> => {
      const { onProgress, ...rest } = options;
      return workerPool.enqueue<TPayload, TResult, TProgress>({
        ...rest,
        worker,
        onProgress: (progress) => {
          onProgress?.(progress);
        },
      });
    },
    [worker],
  );

  const cancelJob = useCallback((jobId: string) => {
    workerPool.cancelJob(jobId);
  }, []);

  const getJob = useCallback(
    (jobId: string) => jobs[jobId],
    [jobs],
  );

  return { jobs, enqueueJob, cancelJob, getJob };
}
