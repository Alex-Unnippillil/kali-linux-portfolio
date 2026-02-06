import Head from 'next/head';
import type { GetStaticProps, NextPage } from 'next';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type TableRow = {
  id: number;
  host: string;
  service: string;
  status: 'open' | 'filtered' | 'closed';
  latencyMs: number;
};

type LogEntry = {
  id: number;
  timestamp: string;
  severity: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  message: string;
};

type FileEntry = {
  name: string;
  sizeKb: number;
  checksum: string;
};

type FeatureCardProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

const SERVICES = ['http', 'https', 'ssh', 'smtp', 'pop3', 'dns', 'ftp'];
const STATUSES: Array<TableRow['status']> = ['open', 'filtered', 'closed'];
const LOG_MESSAGES = [
  'Connection accepted',
  'Connection reset by peer',
  'Process spawned and awaiting input',
  'Warning: throttling due to rate limit',
  'Error: malformed payload detected',
  'Debug: synthetic request queued',
  'Info: background job completed',
];
const LOG_SEVERITIES: Array<LogEntry['severity']> = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
const MAX_MEMORY_MB = 64;

function pseudoRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function generateTableData(rows: number): TableRow[] {
  return Array.from({ length: rows }, (_, index) => {
    const rnd = pseudoRandom(index + 1);
    const hostOctet = Math.floor(rnd * 200) + 10;
    return {
      id: index + 1,
      host: `10.13.${(index % 255) + 1}.${hostOctet}`,
      service: SERVICES[index % SERVICES.length],
      status: STATUSES[Math.floor(rnd * STATUSES.length) % STATUSES.length],
      latencyMs: Math.round(pseudoRandom(index + 42) * 250 + 10),
    };
  });
}

function generateInitialLogs(count: number): LogEntry[] {
  return Array.from({ length: count }, (_, index) => {
    const severity = LOG_SEVERITIES[index % LOG_SEVERITIES.length];
    return {
      id: index + 1,
      timestamp: new Date(Date.now() - (count - index) * 1000).toISOString(),
      severity,
      message: LOG_MESSAGES[index % LOG_MESSAGES.length],
    };
  });
}

function createLogEntry(id: number): LogEntry {
  const now = new Date();
  const severity = LOG_SEVERITIES[id % LOG_SEVERITIES.length];
  const randomMessage = LOG_MESSAGES[id % LOG_MESSAGES.length];
  return {
    id,
    timestamp: now.toISOString(),
    severity,
    message: `${randomMessage} (trace-${id.toString(16)})`,
  };
}

function generateFileEntries(count: number): FileEntry[] {
  return Array.from({ length: count }, (_, index) => {
    const sizeSeed = pseudoRandom(index + 19);
    const sizeKb = Math.round(sizeSeed * 4096) + 64;
    const checksumSeed = Math.floor(sizeSeed * 1_000_000).toString(16).padStart(6, '0');
    return {
      name: `artifact-${index.toString().padStart(4, '0')}.log`,
      sizeKb,
      checksum: `sha256-${checksumSeed.repeat(4).slice(0, 64)}`,
    };
  });
}

function generateFilePreview(lines: number): string {
  return Array.from({ length: lines }, (_, index) => {
    const offset = index * 16;
    return `${index.toString().padStart(4, '0')}: ${'deadbeef '.repeat(4)}| offset ${offset.toString().padStart(6, '0')} | synthetic packet capture fragment`;
  }).join('\n');
}

const FeatureCard = ({ title, description, children }: FeatureCardProps) => (
  <section className="rounded-lg border border-slate-700 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/40">
    <header>
      <h2 className="text-xl font-semibold text-slate-100">{title}</h2>
      <p className="mt-2 text-sm text-slate-300">{description}</p>
    </header>
    <div className="mt-4 space-y-4 text-slate-200">{children}</div>
  </section>
);

const SandboxPage: NextPage = () => {
  const [rowCount, setRowCount] = useState(500);
  const [logEntries, setLogEntries] = useState(() => generateInitialLogs(300));
  const [autoLogging, setAutoLogging] = useState(false);
  const [fileCount, setFileCount] = useState(120);
  const [previewLines, setPreviewLines] = useState(80);
  const [cpuStress, setCpuStress] = useState(false);
  const [memoryAllocated, setMemoryAllocated] = useState(0);
  const memoryChunksRef = useRef<string[]>([]);
  const cpuTaskRef = useRef<number | null>(null);
  const [networkLatency, setNetworkLatency] = useState(600);
  const [networkLog, setNetworkLog] = useState<string[]>([]);
  const [longTaskDuration, setLongTaskDuration] = useState(250);
  const [lastLongTask, setLastLongTask] = useState<string | null>(null);

  const tableData = useMemo(() => generateTableData(rowCount), [rowCount]);
  const files = useMemo(() => generateFileEntries(fileCount), [fileCount]);
  const filePreview = useMemo(() => generateFilePreview(previewLines), [previewLines]);

  useEffect(() => {
    if (!autoLogging) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setLogEntries((previous) => {
        const nextId = previous.length ? previous[previous.length - 1].id + 1 : 1;
        const entry = createLogEntry(nextId);
        const merged = [...previous.slice(-999), entry];
        return merged;
      });
    }, 750);

    return () => {
      window.clearInterval(interval);
    };
  }, [autoLogging]);

  const cpuLoop = useCallback(() => {
    if (!cpuStress) {
      return;
    }
    const start = performance.now();
    while (performance.now() - start < 50) {
      Math.sqrt(start * Math.random());
    }
    cpuTaskRef.current = window.requestAnimationFrame(cpuLoop);
  }, [cpuStress]);

  useEffect(() => {
    if (cpuStress) {
      cpuTaskRef.current = window.requestAnimationFrame(cpuLoop);
    }
    return () => {
      if (cpuTaskRef.current !== null) {
        window.cancelAnimationFrame(cpuTaskRef.current);
        cpuTaskRef.current = null;
      }
    };
  }, [cpuStress, cpuLoop]);

  const allocateMemory = useCallback(
    (megabytes: number) => {
      const current = memoryChunksRef.current.length;
      const remainingCapacity = MAX_MEMORY_MB - current;
      const target = Math.min(megabytes, remainingCapacity);
      if (target <= 0) {
        return;
      }
      const chunk = '0'.repeat(1024 * 1024);
      const newChunks = Array.from({ length: target }, () => chunk);
      memoryChunksRef.current = [...memoryChunksRef.current, ...newChunks];
      setMemoryAllocated(memoryChunksRef.current.length);
    },
    []
  );

  const releaseMemory = useCallback(() => {
    memoryChunksRef.current = [];
    setMemoryAllocated(0);
  }, []);

  const handleNetworkRequest = useCallback(() => {
    const id = networkLog.length + 1;
    const startTime = new Date().toLocaleTimeString();
    setNetworkLog((prev) => [`#${id} scheduled at ${startTime} with ${networkLatency}ms latency`, ...prev].slice(0, 10));
    setTimeout(() => {
      const finishedAt = new Date().toLocaleTimeString();
      setNetworkLog((prev) => [`#${id} resolved at ${finishedAt}`, ...prev].slice(0, 10));
    }, networkLatency);
  }, [networkLatency, networkLog.length]);

  const runLongTask = useCallback(() => {
    if (typeof performance === 'undefined') {
      return;
    }
    const duration = Math.max(50, longTaskDuration);
    const start = performance.now();
    while (performance.now() - start < duration) {
      Math.log(Math.random() * 10 + 1);
    }
    setLastLongTask(new Date().toLocaleTimeString());
  }, [longTaskDuration]);

  return (
    <>
      <Head>
        <title>Developer Sandbox</title>
      </Head>
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
        <header className="space-y-3">
          <p className="text-sm uppercase tracking-wide text-indigo-300">Development only</p>
          <h1 className="text-3xl font-bold text-slate-100">Diagnostic Sandbox</h1>
          <p className="max-w-3xl text-base text-slate-300">
            This environment generates oversized UI payloads and intentionally expensive operations so you can profile layout,
            rendering, and recovery paths. Toggle the stressors below to reproduce degraded client conditions.
          </p>
        </header>

        <FeatureCard
          title="Massive table generator"
          description="Simulate reconnaissance results with adjustable payload sizes to spot render bottlenecks."
        >
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-2">
              <span>Rows:</span>
              <input
                type="range"
                min={100}
                max={1500}
                step={50}
                value={rowCount}
                aria-label="Row count"
                onChange={(event) => setRowCount(Number(event.target.value))}
              />
              <span className="w-16 text-right tabular-nums">{rowCount}</span>
            </label>
          </div>
          <div className="max-h-96 overflow-auto rounded-md border border-slate-700">
            <table className="min-w-full divide-y divide-slate-800 text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-300">
                <tr>
                  <th className="px-3 py-2 font-semibold">#</th>
                  <th className="px-3 py-2 font-semibold">Host</th>
                  <th className="px-3 py-2 font-semibold">Service</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Latency (ms)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-950/60 text-slate-200">
                {tableData.map((row) => (
                  <tr key={row.id}>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-slate-400">{row.id}</td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono">{row.host}</td>
                    <td className="whitespace-nowrap px-3 py-2">{row.service}</td>
                    <td className="whitespace-nowrap px-3 py-2 capitalize text-emerald-300">{row.status}</td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono tabular-nums">{row.latencyMs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </FeatureCard>

        <FeatureCard
          title="Log flood and artifact explorer"
          description="Use synthetic log streams and generated files to benchmark scrolling, virtualization, and search performance."
        >
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={autoLogging}
                aria-label="Toggle automatic log appends"
                onChange={(event) => setAutoLogging(event.target.checked)}
              />
              Auto append log entries
            </label>
            <button
              type="button"
              className="rounded bg-indigo-600 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white"
              onClick={() =>
                setLogEntries((previous) => {
                  const nextId = previous.length ? previous[previous.length - 1].id + 1 : 1;
                  const entry = createLogEntry(nextId);
                  return [...previous.slice(-999), entry];
                })
              }
            >
              Append entry
            </button>
            <button
              type="button"
              className="rounded border border-slate-600 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-200"
              onClick={() => setLogEntries(generateInitialLogs(300))}
            >
              Reset log buffer
            </button>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Synthetic logs</h3>
              <pre className="mt-2 h-72 overflow-auto rounded-md border border-slate-800 bg-black/80 p-4 text-[11px] leading-relaxed text-emerald-300">
                {logEntries
                  .map(
                    (entry) =>
                      `[${entry.timestamp}] ${entry.severity.padEnd(5, ' ')} :: ${entry.message}`
                  )
                  .join('\n')}
              </pre>
            </div>
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-sm">
                  <span>Files:</span>
                  <input
                    type="range"
                    min={50}
                    max={400}
                    step={10}
                    value={fileCount}
                    aria-label="File list size"
                    onChange={(event) => setFileCount(Number(event.target.value))}
                  />
                  <span className="w-16 text-right tabular-nums">{fileCount}</span>
                </label>
                <div className="mt-3 max-h-40 overflow-auto rounded-md border border-slate-800 bg-slate-950/70">
                  <table className="min-w-full divide-y divide-slate-800 text-left text-xs">
                    <thead className="bg-slate-900/70 text-slate-300">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Name</th>
                        <th className="px-3 py-2 font-semibold">Size (KB)</th>
                        <th className="px-3 py-2 font-semibold">Checksum</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 bg-slate-950/60">
                      {files.map((file) => (
                        <tr key={file.name}>
                          <td className="whitespace-nowrap px-3 py-2 font-mono">{file.name}</td>
                          <td className="whitespace-nowrap px-3 py-2 font-mono tabular-nums">{file.sizeKb}</td>
                          <td className="whitespace-nowrap px-3 py-2 font-mono">{file.checksum}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm">
                  <span>Preview lines:</span>
                  <input
                    type="range"
                    min={40}
                    max={200}
                    step={10}
                    value={previewLines}
                    aria-label="Preview line count"
                    onChange={(event) => setPreviewLines(Number(event.target.value))}
                  />
                  <span className="w-16 text-right tabular-nums">{previewLines}</span>
                </label>
                <pre className="mt-3 h-40 overflow-auto rounded-md border border-slate-800 bg-slate-950/70 p-3 text-[11px] text-blue-200">
                  {filePreview}
                </pre>
              </div>
            </div>
          </div>
        </FeatureCard>

        <FeatureCard
          title="System stress controls"
          description="Trigger CPU and memory pressure to watch for jank, hydration regressions, or crash resiliency."
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">CPU load</h3>
              <p className="text-sm text-slate-300">
                A tight loop runs inside requestAnimationFrame while enabled. Use DevTools performance panel to verify frame drops.
              </p>
              <button
                type="button"
                className={`rounded px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                  cpuStress ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-100'
                }`}
                onClick={() => setCpuStress((value) => !value)}
              >
                {cpuStress ? 'Stop CPU stress' : 'Start CPU stress'}
              </button>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Memory pressure</h3>
              <p className="text-sm text-slate-300">
                Allocate 1&nbsp;MB string chunks to simulate heap pressure. The sandbox caps usage at {MAX_MEMORY_MB} MB.
              </p>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <button
                  type="button"
                  className="rounded bg-slate-700 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-100"
                  onClick={() => allocateMemory(8)}
                >
                  +8 MB
                </button>
                <button
                  type="button"
                  className="rounded bg-slate-700 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-100"
                  onClick={() => allocateMemory(16)}
                >
                  +16 MB
                </button>
                <button
                  type="button"
                  className="rounded bg-red-700 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white"
                  onClick={releaseMemory}
                >
                  Release memory
                </button>
              </div>
              <p className="text-sm text-slate-200">
                Allocated: <span className="font-mono tabular-nums">{memoryAllocated}</span> MB / {MAX_MEMORY_MB} MB
              </p>
            </div>
          </div>
        </FeatureCard>

        <FeatureCard
          title="Network throttling simulator"
          description="Configure artificial latency and queue requests to validate retry logic and loading states without touching production APIs."
        >
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-2">
              <span>Latency (ms):</span>
              <input
                type="range"
                min={100}
                max={3000}
                step={50}
                value={networkLatency}
                aria-label="Simulated network latency"
                onChange={(event) => setNetworkLatency(Number(event.target.value))}
              />
              <span className="w-16 text-right tabular-nums">{networkLatency}</span>
            </label>
            <button
              type="button"
              className="rounded bg-slate-700 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-100"
              onClick={handleNetworkRequest}
            >
              Enqueue request
            </button>
          </div>
          <ul className="mt-3 space-y-2 text-xs text-slate-300">
            {networkLog.map((entry) => (
              <li key={entry} className="rounded border border-slate-800 bg-slate-950/70 px-3 py-2 font-mono">
                {entry}
              </li>
            ))}
            {!networkLog.length && <li className="text-slate-500">No simulated requests yet.</li>}
          </ul>
        </FeatureCard>

        <FeatureCard
          title="Main-thread blocker"
          description="Run deterministic long tasks to validate scheduler hooks, loading shimmers, and recovery UI."
        >
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-2">
              <span>Duration (ms):</span>
              <input
                type="range"
                min={50}
                max={2000}
                step={50}
                value={longTaskDuration}
                aria-label="Long task duration"
                onChange={(event) => setLongTaskDuration(Number(event.target.value))}
              />
              <span className="w-16 text-right tabular-nums">{longTaskDuration}</span>
            </label>
            <button
              type="button"
              className="rounded bg-slate-700 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-100"
              onClick={runLongTask}
            >
              Block main thread
            </button>
          </div>
          <p className="text-sm text-slate-300">
            Last run:{' '}
            {lastLongTask ? (
              <span className="font-mono text-emerald-300">{lastLongTask}</span>
            ) : (
              <span className="text-slate-500">No runs yet</span>
            )}
          </p>
        </FeatureCard>
      </main>
    </>
  );
};

export const getStaticProps: GetStaticProps = async () => {
  const flagEnabled =
    process.env.NEXT_PUBLIC_ENABLE_DEV_SANDBOX === 'true' || process.env.ENABLE_DEV_SANDBOX === 'true';
  const isDevEnvironment = process.env.NODE_ENV !== 'production';

  if (!flagEnabled || !isDevEnvironment) {
    return {
      notFound: true,
    };
  }

  return {
    props: {},
  };
};

export default SandboxPage;
