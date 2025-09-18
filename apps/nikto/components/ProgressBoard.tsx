'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import type { NiktoFinding, NiktoSeverity } from '../types';

export type ProgressStatus = 'idle' | 'running' | 'paused' | 'finished';

export interface SeverityCounts {
  High: number;
  Medium: number;
  Low: number;
  Info: number;
}

export interface ProgressState {
  status: ProgressStatus;
  requestsCompleted: number;
  totalRequests: number;
  severityCounts: SeverityCounts;
  totalDurationMs: number;
  expectedTotalMs: number;
  estimatedRemainingMs: number;
}

export type ProgressAction =
  | { type: 'reset'; totalRequests: number; expectedTotalMs: number }
  | { type: 'start' }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'tick'; severity: NiktoSeverity | null; durationMs: number }
  | { type: 'complete' };

export const severityList: NiktoSeverity[] = ['High', 'Medium', 'Low', 'Info'];

export const initialProgressState: ProgressState = {
  status: 'idle',
  requestsCompleted: 0,
  totalRequests: 0,
  severityCounts: {
    High: 0,
    Medium: 0,
    Low: 0,
    Info: 0,
  },
  totalDurationMs: 0,
  expectedTotalMs: 0,
  estimatedRemainingMs: 0,
};

export const progressReducer = (
  state: ProgressState,
  action: ProgressAction
): ProgressState => {
  switch (action.type) {
    case 'reset':
      return {
        ...initialProgressState,
        severityCounts: {
          High: 0,
          Medium: 0,
          Low: 0,
          Info: 0,
        },
        totalRequests: action.totalRequests,
        expectedTotalMs: action.expectedTotalMs,
        estimatedRemainingMs: action.expectedTotalMs,
      };
    case 'start':
      if (!state.totalRequests || state.status === 'running') {
        return state;
      }
      return {
        ...state,
        status: 'running',
        estimatedRemainingMs: state.estimatedRemainingMs || state.expectedTotalMs,
      };
    case 'pause':
      if (state.status !== 'running') return state;
      return { ...state, status: 'paused' };
    case 'resume':
      if (state.status !== 'paused') return state;
      return { ...state, status: 'running' };
    case 'tick': {
      const requestsCompleted = Math.min(
        state.requestsCompleted + 1,
        state.totalRequests
      );
      const severityCounts = { ...state.severityCounts };
      if (action.severity && severityCounts[action.severity] !== undefined) {
        severityCounts[action.severity] += 1;
      }
      const totalDurationMs = state.totalDurationMs + action.durationMs;
      const estimatedRemainingMs = Math.max(
        state.expectedTotalMs - totalDurationMs,
        0
      );
      const status:
        | ProgressStatus =
        requestsCompleted >= state.totalRequests && state.totalRequests > 0
          ? 'finished'
          : state.status;
      return {
        ...state,
        requestsCompleted,
        severityCounts,
        totalDurationMs,
        estimatedRemainingMs,
        status,
      };
    }
    case 'complete':
      if (state.status === 'finished') return state;
      return {
        ...state,
        status: 'finished',
        requestsCompleted: state.totalRequests,
        estimatedRemainingMs: 0,
        totalDurationMs: Math.max(state.totalDurationMs, state.expectedTotalMs),
      };
    default:
      return state;
  }
};

interface ProgressBoardProps {
  findings: NiktoFinding[];
}

interface QueueItem {
  id: string;
  severity: NiktoSeverity | null;
  path: string;
  durationMs: number;
}

interface RequestPlan {
  queue: QueueItem[];
  totalDuration: number;
}

const MIN_DURATION = 320;
const MAX_DURATION = 1100;

const rollDuration = () =>
  Math.floor(MIN_DURATION + Math.random() * (MAX_DURATION - MIN_DURATION));

const normalizeSeverity = (severity: string): NiktoSeverity => {
  const upper = severity.trim().toLowerCase();
  switch (upper) {
    case 'high':
      return 'High';
    case 'medium':
      return 'Medium';
    case 'low':
      return 'Low';
    case 'info':
    default:
      return 'Info';
  }
};

const buildRequestPlan = (findings: NiktoFinding[]): RequestPlan => {
  if (!findings.length) {
    return { queue: [], totalDuration: 0 };
  }

  const queue: QueueItem[] = [];

  findings.forEach((finding, index) => {
    queue.push({
      id: `finding-${index}`,
      severity: normalizeSeverity(finding.severity),
      path: finding.path,
      durationMs: rollDuration(),
    });
    // interleave a safe request after each finding for rhythm
    queue.push({
      id: `noise-${index}`,
      severity: null,
      path: `/static/${index}`,
      durationMs: rollDuration(),
    });
  });

  // add a few extra safe requests to mimic a deeper crawl
  const fillerCount = Math.max(3, Math.round(findings.length * 0.6));
  for (let i = 0; i < fillerCount; i += 1) {
    queue.push({
      id: `noise-extra-${i}`,
      severity: null,
      path: `/health/${i}`,
      durationMs: rollDuration(),
    });
  }

  const totalDuration = queue.reduce((sum, item) => sum + item.durationMs, 0);

  return { queue, totalDuration };
};

const formatDuration = (ms: number): string => {
  if (ms <= 0) return '0s';
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) {
    return `${seconds}s`;
  }
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
};

const severityColors: Record<NiktoSeverity, string> = {
  High: 'bg-red-700',
  Medium: 'bg-yellow-700',
  Low: 'bg-orange-600',
  Info: 'bg-blue-700',
};

const ProgressBoard: React.FC<ProgressBoardProps> = ({ findings }) => {
  const [state, dispatch] = useReducer(progressReducer, initialProgressState);
  const statusRef = useRef<ProgressStatus>('idle');
  const basePlanRef = useRef<RequestPlan>({ queue: [], totalDuration: 0 });
  const queueRef = useRef<QueueItem[]>([]);
  const currentItemRef = useRef<QueueItem | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const abortedRequestRef = useRef(false);

  useEffect(() => {
    statusRef.current = state.status;
  }, [state.status]);

  const primeQueue = useCallback(() => {
    const queueCopy = basePlanRef.current.queue.map((item) => ({ ...item }));
    queueRef.current = queueCopy;
    currentItemRef.current = null;
    abortedRequestRef.current = false;
    return queueCopy.length;
  }, []);

  useEffect(() => {
    const plan = buildRequestPlan(findings);
    basePlanRef.current = plan;
    primeQueue();
    dispatch({
      type: 'reset',
      totalRequests: plan.queue.length,
      expectedTotalMs: plan.totalDuration,
    });
  }, [findings, primeQueue]);

  const cleanupTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (controllerRef.current) {
      controllerRef.current.abort();
      controllerRef.current = null;
    }
  }, []);

  const runNext = useCallback(() => {
    if (statusRef.current !== 'running') return;
    if (!currentItemRef.current) {
      currentItemRef.current = queueRef.current[0] || null;
    }
    const item = currentItemRef.current;
    if (!item) {
      dispatch({ type: 'complete' });
      return;
    }

    timeoutRef.current = setTimeout(async () => {
      timeoutRef.current = null;
      if (statusRef.current !== 'running') return;
      abortedRequestRef.current = false;

      if (process.env.NODE_ENV !== 'production') {
        controllerRef.current = new AbortController();
        try {
          await fetch(
            `/demo-data/nikto/report.json?mock=${encodeURIComponent(item.id)}`,
            {
              signal: controllerRef.current.signal,
            }
          );
        } catch (error) {
          if ((error as DOMException).name === 'AbortError') {
            abortedRequestRef.current = true;
          }
        } finally {
          controllerRef.current = null;
        }
      }

      if (statusRef.current !== 'running') return;
      if (abortedRequestRef.current) {
        // keep the same item for the next resume
        return;
      }

      queueRef.current.shift();
      currentItemRef.current = null;
      dispatch({
        type: 'tick',
        severity: item.severity,
        durationMs: item.durationMs,
      });
    }, item.durationMs);
  }, []);

  useEffect(() => {
    if (state.status === 'running') {
      if (!timeoutRef.current && !controllerRef.current) {
        runNext();
      }
    } else {
      cleanupTimers();
    }
    return () => {
      cleanupTimers();
    };
  }, [state.status, state.requestsCompleted, cleanupTimers, runNext]);

  const handleStart = () => {
    primeQueue();
    dispatch({
      type: 'reset',
      totalRequests: basePlanRef.current.queue.length,
      expectedTotalMs: basePlanRef.current.totalDuration,
    });
    dispatch({ type: 'start' });
  };

  const handlePauseResume = () => {
    if (state.status === 'running') {
      dispatch({ type: 'pause' });
    } else if (state.status === 'paused') {
      dispatch({ type: 'resume' });
    }
  };

  const handleReset = () => {
    primeQueue();
    dispatch({
      type: 'reset',
      totalRequests: basePlanRef.current.queue.length,
      expectedTotalMs: basePlanRef.current.totalDuration,
    });
  };

  const averageDuration = useMemo(() => {
    if (!state.requestsCompleted) return 0;
    return state.totalDurationMs / state.requestsCompleted;
  }, [state.requestsCompleted, state.totalDurationMs]);

  const percentComplete = useMemo(() => {
    if (!state.totalRequests) return 0;
    return Math.round((state.requestsCompleted / state.totalRequests) * 100);
  }, [state.requestsCompleted, state.totalRequests]);

  return (
    <div className="bg-gray-800 p-4 rounded shadow space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Progress Board</h2>
        <span className="text-xs uppercase tracking-wide text-gray-400">
          {state.status}
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-4 text-sm">
        <div className="bg-gray-900 p-3 rounded" data-testid="requests-count">
          <div className="text-xs text-gray-400">Requests</div>
          <div className="text-xl font-mono">
            {state.requestsCompleted} / {state.totalRequests}
          </div>
        </div>
        <div className="bg-gray-900 p-3 rounded" data-testid="percent-complete">
          <div className="text-xs text-gray-400">Complete</div>
          <div className="text-xl font-mono">{percentComplete}%</div>
        </div>
        <div className="bg-gray-900 p-3 rounded" data-testid="eta">
          <div className="text-xs text-gray-400">ETA</div>
          <div className="text-xl font-mono">{formatDuration(state.estimatedRemainingMs)}</div>
        </div>
        <div className="bg-gray-900 p-3 rounded" data-testid="avg">
          <div className="text-xs text-gray-400">Avg / req</div>
          <div className="text-xl font-mono">
            {averageDuration ? `${(averageDuration / 1000).toFixed(1)}s` : '—'}
          </div>
        </div>
      </div>
      <div>
        <h3 className="text-xs uppercase text-gray-400 mb-2">Findings</h3>
        <div className="grid gap-2 grid-cols-2 md:grid-cols-4 text-xs">
          {severityList.map((severity) => (
            <div
              key={severity}
              className={`p-2 rounded flex items-center justify-between ${severityColors[severity]}`}
              data-testid={`severity-${severity.toLowerCase()}`}
            >
              <span className="font-semibold">{severity}</span>
              <span className="font-mono text-base">
                {state.severityCounts[severity]}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="bg-blue-600 hover:bg-blue-500 transition rounded px-3 py-1 text-sm disabled:opacity-50"
          onClick={handleStart}
          disabled={!state.totalRequests || state.status === 'running'}
        >
          Start run
        </button>
        <button
          type="button"
          className="bg-yellow-600 hover:bg-yellow-500 transition rounded px-3 py-1 text-sm disabled:opacity-50"
          onClick={handlePauseResume}
          disabled={state.status !== 'running' && state.status !== 'paused'}
        >
          {state.status === 'running' ? 'Pause' : 'Resume'}
        </button>
        <button
          type="button"
          className="bg-gray-700 hover:bg-gray-600 transition rounded px-3 py-1 text-sm"
          onClick={handleReset}
        >
          Reset
        </button>
      </div>
    </div>
  );
};

export default ProgressBoard;
