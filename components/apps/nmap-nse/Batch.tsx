import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

type ParameterSet = {
  id: string;
  target: string;
  scripts: string[];
  portFlag: string;
  args: string;
  command: string;
};

type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';

type Job = {
  id: string;
  label: string;
  parameters: ParameterSet;
  status: JobStatus;
  attempts: number;
  progress: number;
  log: string[];
  error?: string;
};

type BatchProps = {
  target: string;
  selectedScripts: string[];
  scriptArgs: Record<string, string | undefined>;
  portFlag: string;
  command: string;
};

type SimulationCallbacks = {
  onProgress: (progress: number, detail?: string) => void;
  onLog: (entry: string) => void;
};

type SimulationResult = {
  summary: string;
};

const MAX_RETRIES = 2;
const MAX_LOG_ENTRIES = 40;
const DEFAULT_CONCURRENCY = 2;

const idFactory = (() => {
  let counter = 0;
  return () => {
    counter += 1;
    return `nmap-batch-${Date.now()}-${counter}`;
  };
})();

const limitLogEntries = (entries: string[]) =>
  entries.length > MAX_LOG_ENTRIES
    ? entries.slice(entries.length - MAX_LOG_ENTRIES)
    : entries;

const summariseScripts = (scripts: string[]) =>
  (scripts.length ? scripts.join(', ') : 'default discovery').slice(0, 80);

const createArgsString = (
  scripts: string[],
  scriptArgs: Record<string, string | undefined>
) =>
  scripts
    .map((name) => scriptArgs[name])
    .filter((value): value is string => Boolean(value && value.trim()))
    .join(', ');

const runSimulation = (
  params: ParameterSet,
  attempt: number,
  signal: AbortSignal,
  callbacks: SimulationCallbacks
) => {
  const { onProgress, onLog } = callbacks;
  const timers: ReturnType<typeof setTimeout>[] = [];
  const totalSteps = Math.max(3, params.scripts.length + 2);
  const baseDelay = 250 + params.scripts.length * 50;
  let completed = false;
  let rejectRef: ((reason?: unknown) => void) | null = null;

  const failOnFirstAttempt =
    params.scripts.includes('dns-brute') && attempt === 1;

  const cleanup = () => {
    timers.forEach((timer) => clearTimeout(timer));
    timers.length = 0;
    signal.removeEventListener('abort', handleAbort);
  };

  const handleAbort = () => {
    if (completed) return;
    completed = true;
    cleanup();
    rejectRef?.(new Error('cancelled'));
  };

  const promise = new Promise<SimulationResult>((resolve, reject) => {
    rejectRef = reject;
    let step = 0;

    const dispatchStep = () => {
      if (completed) return;
      if (signal.aborted) {
        completed = true;
        cleanup();
        reject(new Error('cancelled'));
        return;
      }

      step += 1;
      const progress = Math.min(100, Math.round((step / totalSteps) * 100));
      onProgress(progress, `Progressed to phase ${step} of ${totalSteps}`);

      if (step < totalSteps) {
        const timer = setTimeout(dispatchStep, baseDelay);
        timers.push(timer);
        return;
      }

      completed = true;
      cleanup();

      if (failOnFirstAttempt) {
        const error = new Error(
          'Simulated DNS brute script timed out – real scans require throttling and permission.'
        );
        reject(error);
        return;
      }

      resolve({
        summary: `Simulated ${params.scripts.length || 'default'} script(s) on ${
          params.target
        }`,
      });
    };

    onLog(
      `Worker prepared for ${params.target} using ${params.scripts.length} script(s).`
    );
    const timer = setTimeout(dispatchStep, baseDelay);
    timers.push(timer);
  });

  signal.addEventListener('abort', handleAbort);

  return promise;
};

const Batch: React.FC<BatchProps> = ({
  target,
  selectedScripts,
  scriptArgs,
  portFlag,
  command,
}) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [running, setRunning] = useState(false);
  const [concurrency, setConcurrency] = useState(DEFAULT_CONCURRENCY);
  const [logs, setLogs] = useState<string[]>([]);
  const controllers = useRef<Map<string, AbortController>>(new Map());
  const isMounted = useRef(true);

  useEffect(() => () => {
    isMounted.current = false;
    controllers.current.forEach((controller) => controller.abort());
    controllers.current.clear();
  }, []);

  const addLog = useCallback((entry: string) => {
    if (!isMounted.current) return;
    setLogs((prev) => limitLogEntries([...prev, entry]));
  }, []);

  const queueCurrent = useCallback(() => {
    if (!target.trim() || selectedScripts.length === 0) return;
    const argsString = createArgsString(selectedScripts, scriptArgs);
    const id = idFactory();
    const label = `${target.trim()} (${summariseScripts(selectedScripts)})`;

    const job: Job = {
      id,
      label,
      parameters: {
        id,
        target: target.trim(),
        scripts: [...selectedScripts],
        portFlag,
        args: argsString,
        command,
      },
      status: 'queued',
      attempts: 0,
      progress: 0,
      log: [`Queued with command: ${command}`],
    };

    setJobs((prev) => [...prev, job]);
    addLog(`Queued ${label}`);
  }, [addLog, command, portFlag, scriptArgs, selectedScripts, target]);

  const updateJobLog = useCallback((jobId: string, message: string) => {
    if (!isMounted.current) return;
    setJobs((prev) =>
      prev.map((job) =>
        job.id === jobId
          ? { ...job, log: [...job.log, message] }
          : job
      )
    );
  }, []);

  const setJob = useCallback(
    (jobId: string, transform: (job: Job) => Job) => {
      if (!isMounted.current) return;
      setJobs((prev) =>
        prev.map((job) => (job.id === jobId ? transform(job) : job))
      );
    },
    []
  );

  const startJob = useCallback(
    (job: Job) => {
      const controller = new AbortController();
      controllers.current.set(job.id, controller);

      const attempt = job.attempts + 1;
      const attemptMessage = `Attempt ${attempt} started`;

      setJob(job.id, (current) => ({
        ...current,
        status: 'running',
        attempts: attempt,
        progress: 0,
        error: undefined,
      }));
      updateJobLog(job.id, attemptMessage);
      addLog(`${job.label} – ${attemptMessage}`);

      runSimulation(job.parameters, attempt, controller.signal, {
        onProgress: (progress, detail) => {
          if (!isMounted.current) return;
          setJob(job.id, (item) => ({
            ...item,
            progress,
            log:
              detail && !item.log.includes(detail)
                ? [...item.log, detail]
                : item.log,
          }));
        },
        onLog: (entry) => {
          updateJobLog(job.id, entry);
          addLog(`${job.label} – ${entry}`);
        },
      })
        .then((result) => {
          controllers.current.delete(job.id);
          if (!isMounted.current) return;
          setJob(job.id, (current) => ({
            ...current,
            status: 'succeeded',
            progress: 100,
            log: [...current.log, result.summary],
          }));
          addLog(`${job.label} completed.`);
        })
        .catch((error: Error) => {
          controllers.current.delete(job.id);
          if (!isMounted.current) return;
          if (controller.signal.aborted || error.message === 'cancelled') {
            updateJobLog(job.id, 'Cancelled by user');
            setJob(job.id, (current) => ({
              ...current,
              status: 'cancelled',
              progress: 0,
              error: 'Cancelled by user',
            }));
            addLog(`${job.label} cancelled.`);
            return;
          }

          const shouldRetry = attempt < MAX_RETRIES;
          const nextLog = `Attempt ${attempt} failed: ${error.message}`;
          updateJobLog(job.id, nextLog);
          addLog(`${job.label} failed: ${error.message}`);

          if (shouldRetry) {
            updateJobLog(job.id, `Retrying (attempt ${attempt + 1} of ${MAX_RETRIES})`);
            setJob(job.id, (current) => ({
              ...current,
              status: 'queued',
              progress: 0,
              error: undefined,
            }));
          } else {
            setJob(job.id, (current) => ({
              ...current,
              status: 'failed',
              error: error.message,
            }));
          }
        });
    },
    [addLog, setJob, updateJobLog]
  );

  const startProcessing = useCallback(() => {
    if (running) return;
    if (!jobs.some((job) => job.status === 'queued')) {
      addLog('No queued parameter sets to execute.');
      return;
    }
    setRunning(true);
    addLog('Batch execution started.');
  }, [addLog, jobs, running]);

  const cancelJob = useCallback(
    (job: Job) => {
      if (job.status === 'queued') {
        updateJobLog(job.id, 'Cancelled before execution');
        setJob(job.id, (current) => ({
          ...current,
          status: 'cancelled',
          error: 'Cancelled before execution',
        }));
        addLog(`${job.label} removed from queue.`);
        return;
      }

      const controller = controllers.current.get(job.id);
      if (controller) {
        controller.abort();
        controllers.current.delete(job.id);
      }
    },
    [addLog, setJob, updateJobLog]
  );

  const cancelAll = useCallback(() => {
    controllers.current.forEach((controller) => controller.abort());
    controllers.current.clear();
    setJobs((prev) =>
      prev.map((job) =>
        job.status === 'queued'
          ? {
              ...job,
              status: 'cancelled',
              error: 'Cancelled before execution',
              log: [...job.log, 'Cancelled before execution'],
            }
          : job
      )
    );
    addLog('Batch cancellation requested. Running jobs will stop shortly.');
    setRunning(false);
  }, [addLog]);

  useEffect(() => {
    if (!running) return;

    const active = jobs.filter((job) => job.status === 'running').length;
    const availableSlots = Math.max(1, concurrency) - active;
    if (availableSlots <= 0) return;

    const queued = jobs.filter((job) => job.status === 'queued');
    if (queued.length === 0 && active === 0) {
      setRunning(false);
      addLog('Batch execution completed.');
      return;
    }

    queued.slice(0, availableSlots).forEach((job) => startJob(job));
  }, [addLog, concurrency, jobs, running, startJob]);

  useEffect(() => {
    if (!running) return;
    const active = jobs.some((job) => job.status === 'running');
    const queued = jobs.some((job) => job.status === 'queued');
    if (!active && !queued) {
      setRunning(false);
      addLog('Batch execution completed.');
    }
  }, [addLog, jobs, running]);

  const summary = useMemo(() => {
    const total = jobs.length;
    const completed = jobs.filter((job) => job.status === 'succeeded').length;
    const failed = jobs.filter((job) => job.status === 'failed').length;
    const cancelled = jobs.filter((job) => job.status === 'cancelled').length;
    const runningCount = jobs.filter((job) => job.status === 'running').length;
    return { total, completed, failed, cancelled, runningCount };
  }, [jobs]);

  return (
    <section className="mt-4 p-3 bg-ub-dark border border-gray-700 rounded">
      <header className="mb-2">
        <h3 className="text-base font-semibold text-white">Batch simulator</h3>
        <p className="text-xs text-gray-300">
          Queue multiple simulated runs with controlled concurrency. This tool
          never sends network traffic; it replays curated scenarios for
          educational use only.
        </p>
      </header>
      <div className="flex flex-col gap-2 mb-3">
        <button
          type="button"
          onClick={queueCurrent}
          disabled={!target.trim() || selectedScripts.length === 0}
          className="px-2 py-1 text-sm rounded bg-ub-grey text-black disabled:opacity-50"
        >
          Queue current selection
        </button>
        <div className="flex flex-wrap gap-2 items-center text-xs text-gray-200">
          <label htmlFor="batch-concurrency" className="font-semibold">
            Concurrent workers
          </label>
          <input
            id="batch-concurrency"
            type="number"
            min={1}
            max={4}
            value={concurrency}
            onChange={(event) => {
              const next = Number(event.target.value) || 1;
              setConcurrency(Math.min(4, Math.max(1, next)));
            }}
            className="w-16 px-1 py-0.5 rounded text-black"
            aria-label="Concurrent worker slots"
          />
          <span>Retries per job: {MAX_RETRIES}</span>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-gray-200">
          <button
            type="button"
            onClick={startProcessing}
            disabled={running || !jobs.some((job) => job.status === 'queued')}
            className="px-2 py-1 rounded bg-ub-grey text-black disabled:opacity-50"
          >
            Run batch
          </button>
          <button
            type="button"
            onClick={cancelAll}
            disabled={
              !running && !jobs.some((job) => job.status === 'queued' || job.status === 'running')
            }
            className="px-2 py-1 rounded bg-ub-grey text-black disabled:opacity-50"
          >
            Cancel all
          </button>
          <span>
            {summary.completed} completed / {summary.total} queued •{' '}
            {summary.runningCount} running • {summary.failed} failed •{' '}
            {summary.cancelled} cancelled
          </span>
        </div>
      </div>
      <div className="space-y-3">
        <div>
          <h4 className="text-sm font-semibold text-white mb-1">
            Parameter queue
          </h4>
          {jobs.length === 0 ? (
            <p className="text-xs text-gray-300">
              Queue a parameter set to rehearse batch operations safely.
            </p>
          ) : (
            <ul className="space-y-2">
              {jobs.map((job) => (
                <li
                  key={job.id}
                  data-testid="batch-job"
                  className="p-2 bg-black border border-gray-700 rounded"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="text-sm font-mono text-blue-200">
                        {job.parameters.target}
                      </p>
                      <p className="text-xs text-gray-300">
                        Scripts: {summariseScripts(job.parameters.scripts)}
                      </p>
                      <p className="text-xs text-gray-400 break-words">
                        {job.parameters.command}
                      </p>
                    </div>
                    <div className="text-right text-xs text-gray-200 whitespace-nowrap">
                      <span className="font-semibold capitalize">{job.status}</span>
                      <button
                        type="button"
                        onClick={() => cancelJob(job)}
                        disabled={
                          !['queued', 'running'].includes(job.status)
                        }
                        className="ml-2 px-1 py-0.5 rounded bg-ub-grey text-black disabled:opacity-30"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                    <div
                      className="mt-1 h-2 bg-gray-800 rounded"
                      role="progressbar"
                      aria-label={`Progress for ${job.parameters.target}`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={job.progress}
                    >
                    <div
                      className={`h-full rounded ${
                        job.status === 'succeeded'
                          ? 'bg-green-500'
                          : job.status === 'failed'
                          ? 'bg-red-500'
                          : job.status === 'cancelled'
                          ? 'bg-yellow-500'
                          : 'bg-blue-500'
                      }`}
                      style={{ width: `${job.progress}%` }}
                    />
                  </div>
                  {job.error && (
                    <p className="mt-1 text-xs text-red-300">
                      {job.error}
                    </p>
                  )}
                  <details className="mt-1">
                    <summary className="text-xs text-gray-200 cursor-pointer">
                      Logs ({job.log.length})
                    </summary>
                    <ul className="mt-1 space-y-0.5 text-xs text-gray-300">
                      {job.log.map((entry, index) => (
                        <li key={index}>{entry}</li>
                      ))}
                    </ul>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h4 className="text-sm font-semibold text-white mb-1">Activity</h4>
          {logs.length === 0 ? (
            <p className="text-xs text-gray-300">
              Activity log will appear here. Each entry documents simulated
              execution, retry behaviour, and cancellation decisions.
            </p>
          ) : (
            <ol className="space-y-1 text-xs text-gray-300" aria-live="polite">
              {logs.map((entry, index) => (
                <li key={`${entry}-${index}`} data-testid="batch-log-entry">
                  {entry}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </section>
  );
};

export default Batch;
