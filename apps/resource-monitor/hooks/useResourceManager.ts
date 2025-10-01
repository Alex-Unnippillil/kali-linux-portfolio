'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import {
  AutoPauseReason,
  SchedulerSnapshot,
  createJobScheduler,
  JobScheduler,
} from '../scheduler';

interface ResourceState extends SchedulerSnapshot {
  cpuUsage: number;
}

interface ResourceControls {
  setParallelism: (value: number) => void;
  pause: () => void;
  resume: () => void;
}

interface CpuWorker {
  postMessage: (message: any) => void;
  addEventListener: typeof Worker.prototype.addEventListener;
  removeEventListener: typeof Worker.prototype.removeEventListener;
  terminate: () => void;
}

type Action =
  | { type: 'snapshot'; snapshot: SchedulerSnapshot }
  | { type: 'cpu'; value: number };

const initialState: ResourceState = {
  queued: 0,
  running: 0,
  completed: 0,
  maxParallel: 3,
  userPaused: false,
  autoPaused: false,
  autoPauseReason: null,
  cpuUsage: 18,
};

const reducer = (state: ResourceState, action: Action): ResourceState => {
  switch (action.type) {
    case 'snapshot':
      return {
        ...state,
        ...action.snapshot,
      };
    case 'cpu':
      return {
        ...state,
        cpuUsage: action.value,
      };
    default:
      return state;
  }
};

const CPU_THRESHOLD = 82;
const RESUME_THRESHOLD = 58;
const JOB_INJECTION_INTERVAL = 1400;

export interface ResourceManagerHook {
  state: ResourceState;
  controls: ResourceControls;
  autoPauseReason: AutoPauseReason;
}

export const useResourceManager = (): ResourceManagerHook => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const schedulerRef = useRef<JobScheduler | null>(null);
  const workerRef = useRef<CpuWorker | null>(null);
  const queueIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return () => {};

    const scheduler = createJobScheduler({
      maxParallel: initialState.maxParallel,
      cpuThreshold: CPU_THRESHOLD,
      resumeThreshold: RESUME_THRESHOLD,
      onStateChange: (snapshot) => {
        dispatch({ type: 'snapshot', snapshot });
        workerRef.current?.postMessage({
          type: 'updateLoad',
          running: snapshot.running,
          maxParallel: snapshot.maxParallel,
        });
      },
    });
    schedulerRef.current = scheduler;
    dispatch({ type: 'snapshot', snapshot: scheduler.getState() });

    if (typeof Worker !== 'undefined') {
      const worker = new Worker(
        new URL('../../../workers/resourceCpu.worker.ts', import.meta.url)
      ) as unknown as CpuWorker;
      workerRef.current = worker;
      const handleMessage = (event: MessageEvent<{ type: string; cpu?: number }>) => {
        if (!event.data || event.data.type !== 'metrics') return;
        const cpu = typeof event.data.cpu === 'number' ? event.data.cpu : 0;
        scheduler.updateCpuUsage(cpu);
        dispatch({ type: 'cpu', value: cpu });
      };
      worker.addEventListener('message', handleMessage);
      const snapshot = scheduler.getState();
      worker.postMessage({
        type: 'updateLoad',
        running: snapshot.running,
        maxParallel: snapshot.maxParallel,
      });
      worker.postMessage({ type: 'start', interval: 900 });

      const cleanupWorker = () => {
        worker?.postMessage({ type: 'stop' });
        worker?.removeEventListener('message', handleMessage);
        worker?.terminate();
      };

      queueIntervalRef.current = setInterval(() => {
        const burst = Math.random() < 0.3 ? 3 : 1;
        scheduler.enqueueJobs(burst);
      }, JOB_INJECTION_INTERVAL);

      return () => {
        cleanupWorker();
        if (queueIntervalRef.current) {
          clearInterval(queueIntervalRef.current);
          queueIntervalRef.current = null;
        }
        scheduler.dispose();
        schedulerRef.current = null;
        workerRef.current = null;
      };
    }

    // Fallback if Worker is unavailable (unlikely in browser, but useful for SSR/tests)
    let fallbackCpu = initialState.cpuUsage;
    const fallbackInterval = setInterval(() => {
      fallbackCpu = Math.min(95, Math.max(5, fallbackCpu + (Math.random() - 0.4) * 6));
      scheduler.updateCpuUsage(fallbackCpu);
      dispatch({ type: 'cpu', value: fallbackCpu });
    }, 1000);

    queueIntervalRef.current = setInterval(() => {
      scheduler.enqueueJobs(Math.random() < 0.3 ? 3 : 1);
    }, JOB_INJECTION_INTERVAL);

    return () => {
      clearInterval(fallbackInterval);
      if (queueIntervalRef.current) {
        clearInterval(queueIntervalRef.current);
        queueIntervalRef.current = null;
      }
      scheduler.dispose();
      schedulerRef.current = null;
    };
  }, []);

  const setParallelism = useCallback((value: number) => {
    schedulerRef.current?.setMaxParallel(value);
  }, []);

  const pause = useCallback(() => {
    schedulerRef.current?.pauseUser();
  }, []);

  const resume = useCallback(() => {
    schedulerRef.current?.resumeUser();
  }, []);

  return useMemo(
    () => ({
      state,
      controls: { setParallelism, pause, resume },
      autoPauseReason: state.autoPauseReason,
    }),
    [state, setParallelism, pause, resume]
  );
};

export default useResourceManager;
