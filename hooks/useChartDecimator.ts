import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type {
  ChartDecimatorOptions,
  ChartDecimatorRequest,
  ChartDecimatorWorkerMessage,
  ChartPoint,
  DecimatorStrategy,
} from '../types/chart-decimator';
import {
  decimatePoints,
  normalizePoints,
} from '../utils/charting/decimator';

interface PendingRequest {
  resolve: (points: ChartPoint[]) => void;
  reject: (error: Error) => void;
}

export function useChartDecimator() {
  const workerRef = useRef<Worker | null>(null);
  const pending = useRef<Map<number, PendingRequest>>(new Map());
  const idRef = useRef(0);
  const [ready, setReady] = useState(false);

  const fallbackDecimate = useCallback(
    (points: ReadonlyArray<ChartPoint>, options: ChartDecimatorOptions) =>
      decimatePoints(points, options).map((point) => ({ ...point })),
    []
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof Worker !== 'function') {
      return undefined;
    }

    const worker = new Worker(new URL('../workers/chart-decimator.worker.ts', import.meta.url));
    workerRef.current = worker;
    const pendingRequests = pending.current;

    const handleMessage = (event: MessageEvent<ChartDecimatorWorkerMessage>) => {
      const data = event.data;
      if (!data) {
        return;
      }
      if (data.type === 'ready') {
        setReady(true);
        return;
      }
      if (data.type === 'decimated') {
        const request = pending.current.get(data.id);
        if (request) {
          request.resolve(data.points);
          pending.current.delete(data.id);
        }
        return;
      }
      if (data.type === 'error') {
        if (typeof data.id === 'number') {
          const request = pending.current.get(data.id);
          if (request) {
            request.reject(new Error(data.message));
            pending.current.delete(data.id);
          }
        }
      }
    };

    worker.addEventListener('message', handleMessage);

    return () => {
      worker.removeEventListener('message', handleMessage);
      worker.terminate();
      workerRef.current = null;
      setReady(false);
      pendingRequests.forEach((request) => {
        request.reject(new Error('Chart decimator worker terminated'));
      });
      pendingRequests.clear();
    };
  }, []);

  const decimate = useCallback(
    (points: ReadonlyArray<ChartPoint>, options: ChartDecimatorOptions) => {
      const normalized = normalizePoints(points);
      if (!options.threshold || normalized.length <= options.threshold) {
        return Promise.resolve(normalized.slice());
      }

      const worker = workerRef.current;
      if (!worker) {
        return Promise.resolve(fallbackDecimate(normalized, options));
      }

      const requestId = idRef.current + 1;
      idRef.current = requestId;

      return new Promise<ChartPoint[]>((resolve, reject) => {
        pending.current.set(requestId, { resolve, reject });
        const payload: ChartDecimatorRequest = {
          type: 'decimate',
          id: requestId,
          points: normalized,
          threshold: options.threshold,
          strategy: options.strategy,
        };
        worker.postMessage(payload);
      }).catch((error) => {
        if (pending.current.has(requestId)) {
          pending.current.delete(requestId);
        }
        return fallbackDecimate(normalized, options);
      });
    },
    [fallbackDecimate]
  );

  return useMemo(
    () => ({
      ready,
      decimate,
      fallbackDecimate: (points: ReadonlyArray<ChartPoint>, options: ChartDecimatorOptions) =>
        fallbackDecimate(normalizePoints(points), options),
    }),
    [decimate, fallbackDecimate, ready]
  );
}

export type UseChartDecimatorResult = ReturnType<typeof useChartDecimator> & {
  decimate: (
    points: ReadonlyArray<ChartPoint>,
    options: ChartDecimatorOptions
  ) => Promise<ChartPoint[]>;
  fallbackDecimate: (
    points: ReadonlyArray<ChartPoint>,
    options: ChartDecimatorOptions
  ) => ChartPoint[];
  ready: boolean;
  strategy?: DecimatorStrategy;
};
