import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type AttemptStatus = 'success' | 'retry' | 'locked';

export interface AttemptOutcome {
  status: AttemptStatus;
  message?: string;
  overrideDelayMs?: number;
  completed?: boolean;
}

export interface AttemptLogEntry {
  attempt: number;
  timestamp: string;
  status: AttemptStatus;
  delayMs: number;
  message: string;
}

export interface SchedulerConfig {
  baseIntervalMs: number;
  maxIntervalMs: number;
  maxAttempts?: number;
  now?: () => number;
}

const DEFAULT_MESSAGES: Record<AttemptStatus, string> = {
  success: 'Attempt succeeded',
  retry: 'Retry scheduled after failure',
  locked: 'Router enforced lockout',
};

export class BackoffController {
  private baseIntervalMs: number;
  private maxIntervalMs: number;
  private maxAttempts: number;
  private now: () => number;
  private attemptCount = 0;
  private backoffStep = 0;
  private logs: AttemptLogEntry[] = [];

  public currentDelayMs: number;

  constructor({
    baseIntervalMs,
    maxIntervalMs,
    maxAttempts = Number.POSITIVE_INFINITY,
    now,
  }: SchedulerConfig) {
    if (baseIntervalMs <= 0) {
      throw new Error('baseIntervalMs must be greater than 0');
    }

    this.baseIntervalMs = baseIntervalMs;
    this.maxIntervalMs = Math.max(maxIntervalMs, baseIntervalMs);
    this.maxAttempts = maxAttempts;
    this.now = now ?? (() => Date.now());
    this.currentDelayMs = this.baseIntervalMs;
  }

  get attempts(): number {
    return this.attemptCount;
  }

  getLogs(): AttemptLogEntry[] {
    return this.logs;
  }

  reset(): void {
    this.attemptCount = 0;
    this.backoffStep = 0;
    this.logs = [];
    this.currentDelayMs = this.baseIntervalMs;
  }

  record(outcome: AttemptOutcome): { shouldContinue: boolean; nextDelayMs: number | null } {
    if (this.attemptCount >= this.maxAttempts) {
      return { shouldContinue: false, nextDelayMs: null };
    }

    this.attemptCount += 1;

    const timestamp = new Date(this.now()).toISOString();
    const message = outcome.message ?? DEFAULT_MESSAGES[outcome.status];

    this.logs = [
      ...this.logs,
      {
        attempt: this.attemptCount,
        timestamp,
        status: outcome.status,
        delayMs: this.currentDelayMs,
        message,
      },
    ];

    const reachedLimit =
      outcome.completed === true || this.attemptCount >= this.maxAttempts;

    if (reachedLimit) {
      this.backoffStep = 0;
      this.currentDelayMs = this.baseIntervalMs;
      return { shouldContinue: false, nextDelayMs: null };
    }

    if (outcome.status === 'success') {
      this.backoffStep = 0;
      this.currentDelayMs = this.baseIntervalMs;
      return { shouldContinue: true, nextDelayMs: this.currentDelayMs };
    }

    if (outcome.status === 'locked' && typeof outcome.overrideDelayMs === 'number') {
      this.backoffStep = 0;
      this.currentDelayMs = Math.min(outcome.overrideDelayMs, this.maxIntervalMs);
      return { shouldContinue: true, nextDelayMs: this.currentDelayMs };
    }

    // Default: retry with exponential backoff capped at maxIntervalMs.
    this.backoffStep += 1;
    const exponentialDelay = this.baseIntervalMs * 2 ** this.backoffStep;
    this.currentDelayMs = Math.min(exponentialDelay, this.maxIntervalMs);

    return { shouldContinue: true, nextDelayMs: this.currentDelayMs };
  }
}

export interface UseSchedulerOptions {
  running: boolean;
  resolver: () => AttemptOutcome;
  baseIntervalMs: number;
  maxIntervalMs: number;
  maxAttempts?: number;
  onAttempt?: (attempt: number, outcome: AttemptOutcome) => void;
  now?: () => number;
}

export interface UseSchedulerResult {
  attempt: number;
  logs: AttemptLogEntry[];
  currentDelayMs: number;
  reset: () => void;
}

const createController = (options: SchedulerConfig) =>
  new BackoffController(options);

export const useScheduler = ({
  running,
  resolver,
  baseIntervalMs,
  maxIntervalMs,
  maxAttempts,
  onAttempt,
  now,
}: UseSchedulerOptions): UseSchedulerResult => {
  const controllerRef = useRef<BackoffController>(
    createController({ baseIntervalMs, maxIntervalMs, maxAttempts, now })
  );
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runningRef = useRef(running);
  const resolverRef = useRef(resolver);
  const onAttemptRef = useRef(onAttempt);

  const [attempt, setAttempt] = useState(0);
  const [logs, setLogs] = useState<AttemptLogEntry[]>([]);
  const [currentDelayMs, setCurrentDelayMs] = useState(
    controllerRef.current.currentDelayMs
  );

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const runAttempt = useCallback(() => {
    const controller = controllerRef.current;

    if (!runningRef.current) {
      return;
    }

    const outcome = resolverRef.current();
    const { shouldContinue, nextDelayMs } = controller.record(outcome);

    setAttempt(controller.attempts);
    setLogs(controller.getLogs());
    setCurrentDelayMs(controller.currentDelayMs);
    onAttemptRef.current?.(controller.attempts, outcome);

    if (!shouldContinue || !runningRef.current || typeof nextDelayMs !== 'number') {
      clearTimer();
      return;
    }

    clearTimer();
    timerRef.current = setTimeout(runAttempt, nextDelayMs);
  }, [clearTimer]);

  const reset = useCallback(() => {
    clearTimer();
    controllerRef.current = createController({
      baseIntervalMs,
      maxIntervalMs,
      maxAttempts,
      now,
    });
    setAttempt(0);
    setLogs([]);
    setCurrentDelayMs(controllerRef.current.currentDelayMs);
  }, [baseIntervalMs, maxIntervalMs, maxAttempts, now, clearTimer]);

  useEffect(() => {
    resolverRef.current = resolver;
  }, [resolver]);

  useEffect(() => {
    onAttemptRef.current = onAttempt;
  }, [onAttempt]);

  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  useEffect(() => {
    controllerRef.current = createController({
      baseIntervalMs,
      maxIntervalMs,
      maxAttempts,
      now,
    });
    setAttempt(0);
    setLogs([]);
    setCurrentDelayMs(controllerRef.current.currentDelayMs);
    clearTimer();

    if (runningRef.current) {
      timerRef.current = setTimeout(runAttempt, controllerRef.current.currentDelayMs);
    }

    return clearTimer;
  }, [baseIntervalMs, maxIntervalMs, maxAttempts, now, clearTimer, runAttempt]);

  useEffect(() => {
    if (!running) {
      clearTimer();
      return undefined;
    }

    clearTimer();
    timerRef.current = setTimeout(runAttempt, controllerRef.current.currentDelayMs);

    return clearTimer;
  }, [running, runAttempt, clearTimer]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const stableLogs = useMemo(() => logs, [logs]);

  return {
    attempt,
    logs: stableLogs,
    currentDelayMs,
    reset,
  };
};

export default useScheduler;
