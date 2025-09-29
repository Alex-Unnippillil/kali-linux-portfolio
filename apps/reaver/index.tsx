'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import TabbedWindow, { TabDefinition } from '../../components/ui/TabbedWindow';
import RouterProfiles, {
  ROUTER_PROFILES,
  RouterProfile,
} from './components/RouterProfiles';
import APList from './components/APList';
import ProgressDonut from './components/ProgressDonut';
import { AttemptStatus, useScheduler } from './components/Scheduler';

const PlayIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 20 20" fill="currentColor" {...props}>
    <path d="M6 4l12 6-12 6V4z" />
  </svg>
);

const StopIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 20 20" fill="currentColor" {...props}>
    <path d="M6 6h8v8H6V6z" />
  </svg>
);

interface RouterMeta {
  model: string;
  notes: string;
}

interface LogEntry {
  id: string;
  level: 'info' | 'warn' | 'success' | 'error';
  text: string;
  timestamp: string;
  status?: AttemptStatus;
}

const stages = [
  {
    title: 'Discovery',
    detail:
      'Scanning for WPS-enabled access points. Retries with incremental backoff when none are found.',
  },
  {
    title: 'Association',
    detail:
      'Associates with the target AP. Failed attempts are retried with exponential backoff.',
  },
  {
    title: 'Handshake (M1–M8)',
    detail:
      'Exchanges WPS messages. NACK responses trigger delays before retrying.',
  },
  {
    title: 'PIN Brute Force',
    detail:
      'Cycles through possible PINs. Routers may lock WPS or impose delays after repeated failures.',
  },
];

const TOTAL_PINS = 11000; // example PIN space for demonstration
const FOUND_PIN = '12345670';

const formatTime = (seconds: number) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return [hrs, mins, secs]
    .map((v) => String(v).padStart(2, '0'))
    .join(':');
};

const ReaverPanel: React.FC = () => {
  const [routers, setRouters] = useState<RouterMeta[]>([]);
  const [routerIdx, setRouterIdx] = useState(0);
  const [rate, setRate] = useState(1);
  const [profile, setProfile] = useState<RouterProfile>(ROUTER_PROFILES[0]);
  const [attempts, setAttempts] = useState(0);
  const [running, setRunning] = useState(false);
  const [lockRemaining, setLockRemaining] = useState(0);
  const [stageIdx, setStageIdx] = useState(-1);
  const burstRef = useRef(0);
  const lockRef = useRef(0);
  const attemptsRef = useRef(0);
  const cycleRef = useRef(0);
  const [eventLogs, setEventLogs] = useState<LogEntry[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  const createLogEntry = useCallback(
    (text: string, level: LogEntry['level'], status?: AttemptStatus): LogEntry => {
      const timestamp = new Date().toISOString();
      return {
        id: `${timestamp}-${Math.random().toString(16).slice(2, 8)}`,
        level,
        text,
        timestamp,
        status,
      };
    },
    []
  );

  const appendEventLog = useCallback(
    (text: string, level: LogEntry['level'], status?: AttemptStatus) => {
      const entry = createLogEntry(text, level, status);
      setEventLogs((prev) => [...prev, entry]);
    },
    [createLogEntry]
  );

  useEffect(() => {
    fetch('/demo-data/reaver/routers.json')
      .then((r) => r.json())
      .then(setRouters)
      .catch(() => setRouters([]));
  }, []);

  useEffect(() => {
    attemptsRef.current = attempts;
  }, [attempts]);

  useEffect(() => {
    burstRef.current = 0;
    lockRef.current = 0;
    cycleRef.current = 0;
    setLockRemaining(0);
  }, [profile]);

  useEffect(() => {
    if (!running || lockRemaining <= 0) {
      return;
    }
    const timer = setInterval(() => {
      setLockRemaining((prev) => {
        if (prev <= 1) {
          lockRef.current = 0;
          return 0;
        }
        lockRef.current = prev - 1;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockRemaining, running]);

  const baseIntervalMs = useMemo(
    () => Math.max(250, Math.floor(1000 / Math.max(rate, 1))),
    [rate]
  );

  const maxIntervalMs = useMemo(() => {
    const lockMs = profile.lockDuration > 0 ? profile.lockDuration * 1000 : 0;
    return Math.max(baseIntervalMs * 16, lockMs || baseIntervalMs * 4);
  }, [baseIntervalMs, profile.lockDuration]);

  const maxSchedulerAttempts = useMemo(
    () => Math.ceil(TOTAL_PINS / Math.max(rate, 1)),
    [rate]
  );

  const resolveAttempt = useCallback(() => {
    if (lockRef.current > 0) {
      return {
        status: 'locked' as AttemptStatus,
        message: `Lockout active (${lockRef.current}s remaining)`,
        overrideDelayMs: lockRef.current * 1000,
      };
    }

    cycleRef.current += 1;

    const nextAttempts = Math.min(attemptsRef.current + rate, TOTAL_PINS);
    attemptsRef.current = nextAttempts;
    setAttempts(nextAttempts);

    if (nextAttempts % 1000 === 0) {
      appendEventLog(`Tried ${nextAttempts} PINs`, 'info');
    }

    burstRef.current += 1;

    if (
      profile.lockAttempts !== Infinity &&
      burstRef.current >= profile.lockAttempts
    ) {
      burstRef.current = 0;
      if (profile.lockDuration > 0) {
        lockRef.current = profile.lockDuration;
        setLockRemaining(profile.lockDuration);
        appendEventLog(`WPS locked for ${profile.lockDuration}s`, 'warn', 'locked');
        return {
          status: 'locked' as AttemptStatus,
          message: `WPS locked for ${profile.lockDuration}s`,
          overrideDelayMs: profile.lockDuration * 1000,
        };
      }
    }

    if (nextAttempts >= TOTAL_PINS) {
      setRunning(false);
      setStageIdx(stages.length);
      return {
        status: 'success' as AttemptStatus,
        message: `PIN found: ${FOUND_PIN}`,
        completed: true,
      };
    }

    if (cycleRef.current % 5 === 0) {
      return {
        status: 'retry' as AttemptStatus,
        message: 'Handshake rejected, retrying with backoff',
      };
    }

    return {
      status: 'success' as AttemptStatus,
      message: `Processed ${rate} PINs`,
    };
  }, [appendEventLog, profile.lockAttempts, profile.lockDuration, rate]);

  const { logs: attemptLogs, currentDelayMs, reset: resetScheduler } = useScheduler({
    running,
    resolver: resolveAttempt,
    baseIntervalMs,
    maxIntervalMs,
    maxAttempts: maxSchedulerAttempts,
  });

  const attemptLogEntries = useMemo<LogEntry[]>(() => {
    return attemptLogs.map((log) => {
      const level: LogEntry['level'] =
        log.status === 'locked'
          ? 'warn'
          : log.status === 'retry'
          ? 'info'
          : 'success';
      return {
        id: `attempt-${log.attempt}`,
        level,
        text: `Attempt ${log.attempt}: ${log.message}`,
        timestamp: log.timestamp,
        status: log.status,
      };
    });
  }, [attemptLogs]);

  const combinedLogs = useMemo(
    () =>
      [...eventLogs, ...attemptLogEntries].sort((a, b) =>
        a.timestamp.localeCompare(b.timestamp)
      ),
    [attemptLogEntries, eventLogs]
  );

  const start = () => {
    resetScheduler();
    setAttempts(0);
    attemptsRef.current = 0;
    burstRef.current = 0;
    cycleRef.current = 0;
    lockRef.current = 0;
    setLockRemaining(0);
    setStageIdx(0);
    setEventLogs([createLogEntry('Attack started', 'info')]);
    setRunning(true);
  };

  const stop = () => {
    setRunning(false);
    setStageIdx(-1);
    appendEventLog('Attack stopped', 'warn');
  };

  useEffect(() => {
    if (!running) return;
    if (stageIdx >= 0 && stageIdx < stages.length - 1) {
      const timer = setTimeout(() => setStageIdx((s) => s + 1), 2000);
      return () => clearTimeout(timer);
    }
  }, [running, stageIdx]);

  useEffect(() => {
    if (stageIdx >= 0 && stageIdx < stages.length) {
      appendEventLog(`Stage: ${stages[stageIdx].title}`, 'info');
    } else if (stageIdx === stages.length) {
      appendEventLog('Attack complete', 'success');
    }
  }, [appendEventLog, stageIdx]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [combinedLogs]);

  const stageStatus = (i: number) => {
    if (i < stageIdx) return 'completed';
    if (i === stageIdx && running) return 'running';
    return 'pending';
  };

  const stripColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'warn':
        return 'bg-yellow-500';
      case 'success':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'info':
      default:
        return 'bg-blue-500';
    }
  };

  const timeRemaining = useMemo(() => {
    const remainingPins = Math.max(TOTAL_PINS - attempts, 0);
    const baseSeconds = remainingPins / Math.max(rate, 1);
    const multiplier = baseIntervalMs > 0 ? currentDelayMs / baseIntervalMs : 1;
    const normalizedMultiplier = Number.isFinite(multiplier) ? multiplier : 1;
    return baseSeconds * normalizedMultiplier + lockRemaining;
  }, [attempts, rate, lockRemaining, currentDelayMs, baseIntervalMs]);

  return (
    <div className="p-4 bg-gray-900 text-white h-full overflow-y-auto">
      <h1 className="text-2xl mb-4">Reaver WPS Simulator</h1>
      <p className="text-sm text-yellow-300 mb-4">
        Educational simulation. No real Wi-Fi traffic is generated.
      </p>

      <div className="mb-6">
        <h2 className="text-lg mb-2">Access Points</h2>
        <APList />
      </div>

      <div className="mb-6">
        <h2 className="text-lg mb-2">Attack Stages</h2>
        <div className="flex mb-4">
          {stages.map((s, i) => {
            const status = stageStatus(i);
            const color =
              status === 'completed'
                ? 'bg-green-500'
                : status === 'running'
                ? 'bg-yellow-500'
                : 'bg-gray-600';
            return (
              <div
                key={s.title}
                className="flex-1 flex flex-col items-center mr-2 last:mr-0"
              >
                <div className={`w-full h-2 ${color}`} />
                <span className="mt-1 text-xs text-center">{s.title}</span>
              </div>
            );
          })}
        </div>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          {stages.map((s) => (
            <li key={s.title}>
              <span className="font-semibold">{s.title}:</span> {s.detail}
            </li>
          ))}
        </ol>
      </div>

      <div className="mb-6">
        <h2 className="text-lg mb-2">PIN Brute-force Simulator</h2>
        <RouterProfiles onChange={setProfile} />
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label htmlFor="rate" className="text-sm">
              Attempts/sec
            </label>
            <input
              id="rate"
              type="number"
              min="1"
              value={rate}
              onChange={(e) => setRate(Number(e.target.value) || 1)}
              className="w-20 p-1 bg-gray-800 rounded text-white"
            />
            <button
              type="button"
              onClick={running ? stop : start}
              className={`w-12 h-12 flex items-center justify-center rounded disabled:opacity-50 ${
                running ? 'bg-red-700' : 'bg-green-700'
              }`}
              aria-label={running ? 'Stop attack' : 'Start attack'}
            >
              {running ? (
                <StopIcon className="w-6 h-6" />
              ) : (
                <PlayIcon className="w-6 h-6" />
              )}
            </button>
          </div>
          <ProgressDonut value={attempts} total={TOTAL_PINS} />
        </div>
        <div className="text-sm mb-1">
          Attempts: {attempts} / {TOTAL_PINS}
        </div>
        <div className="w-full bg-gray-700 h-2 mb-1" aria-hidden="true">
          <div
            className="bg-green-500 h-2"
            style={{ width: `${(attempts / TOTAL_PINS) * 100}%` }}
          />
        </div>
        {lockRemaining > 0 && (
          <div className="text-sm text-red-400 mb-1">
            WPS locked. Resuming in {lockRemaining}s
          </div>
        )}
        <div className="text-sm mb-2">
          Est. time remaining: {formatTime(timeRemaining)}
        </div>
        <div className="text-xs text-gray-400 mb-2">
          Current retry delay: {(currentDelayMs / 1000).toFixed(2)}s
        </div>
        <div
          ref={logRef}
          className="h-32 bg-gray-800 rounded p-2 overflow-y-auto text-xs font-mono mb-4"
        >
          {combinedLogs.map((log) => (
            <div key={log.id} className="flex items-start gap-2">
              <span
                className={`w-1 h-4 rounded ${stripColor(log.level)}`}
                aria-hidden="true"
              />
              <div>
                <div className="text-[10px] text-gray-400 uppercase tracking-wide">
                  {new Date(log.timestamp).toLocaleTimeString()} {log.status ? `· ${log.status}` : ''}
                </div>
                <div>{log.text}</div>
              </div>
            </div>
          ))}
        </div>
        {stageIdx === stages.length && (
          <div className="mt-4 p-4 bg-gray-800 rounded">
            <h3 className="text-lg mb-2">Attack Summary</h3>
            <p className="mb-2">
              WPS PIN: <code className="text-green-400">{FOUND_PIN}</code>
            </p>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(FOUND_PIN)}
              className="px-2 py-1 bg-blue-600 rounded"
            >
              Copy PIN
            </button>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg mb-2">Router Metadata</h2>
        {routers.length > 0 ? (
          <>
            <select
              className="mb-2 p-2 rounded bg-gray-800 text-white"
              value={routerIdx}
              onChange={(e) => setRouterIdx(Number(e.target.value))}
            >
              {routers.map((r, i) => (
                <option key={r.model} value={i}>
                  {r.model}
                </option>
              ))}
            </select>
            <p className="text-sm">{routers[routerIdx]?.notes}</p>
          </>
        ) : (
          <p className="text-sm">No router metadata loaded.</p>
        )}
      </div>
    </div>
  );
};

const ReaverApp: React.FC = () => {
  return <ReaverPanel />;
};

const ReaverPage: React.FC = () => {
  const countRef = useRef(1);

  const createTab = (): TabDefinition => {
    const id = Date.now().toString();
    return { id, title: `Session ${countRef.current++}`, content: <ReaverApp /> };
  };

  return (
    <TabbedWindow
      className="min-h-screen bg-gray-900 text-white"
      initialTabs={[createTab()]}
      onNewTab={createTab}
    />
  );
};

export default ReaverPage;

