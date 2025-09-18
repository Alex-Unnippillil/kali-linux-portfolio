import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ConsoleLogEntry } from './sanitizedConsoleLogs';
import { sanitizedConsoleLogs as defaultLogs } from './sanitizedConsoleLogs';

type OutputSetter = React.Dispatch<React.SetStateAction<string>>;

interface SessionSimulatorProps {
  /** Logs to replay. Defaults to the bundled sanitized console transcript. */
  logs?: ConsoleLogEntry[];
  /** Setter hooked to the metasploit output history. */
  onOutputChange: OutputSetter;
}

const speedOptions = [0.5, 1, 1.5, 2];

const sanitizeLine = (line: string) =>
  line
    .replace(/\u001b\[[0-9;]*m/g, '')
    .replace(/[\u0000-\u0019\u007f-\u009f]/g, '');

/**
 * Replays sanitized console logs over time, wiring into the metasploit output history.
 */
const SessionSimulator: React.FC<SessionSimulatorProps> = ({
  logs = defaultLogs,
  onOutputChange,
}) => {
  const sanitizedLogs = useMemo(
    () =>
      logs
        .map((entry) => ({
          timestamp: entry.timestamp,
          line: sanitizeLine(entry.line),
        }))
        .sort((a, b) => a.timestamp - b.timestamp),
    [logs],
  );

  const [visibleCount, setVisibleCount] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const logsRef = useRef(sanitizedLogs);
  const timerRef = useRef<number | null>(null);
  const remainingRef = useRef(0);
  const lastTickRef = useRef(0);
  const visibleCountRef = useRef(visibleCount);
  const isPlayingRef = useRef(isPlaying);
  const speedRef = useRef(speed);
  const prevSpeedRef = useRef(speed);
  const sessionLinesRef = useRef<string[]>([]);

  useEffect(() => {
    logsRef.current = sanitizedLogs;
    remainingRef.current = 0;
    sessionLinesRef.current = [];
    visibleCountRef.current = 0;
    setVisibleCount(0);
    setIsPlaying(false);
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, [sanitizedLogs]);

  useEffect(() => {
    visibleCountRef.current = visibleCount;
  }, [visibleCount]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }
  }, []);

  const updateOutput = useCallback(
    (count: number) => {
      const activeLines = sanitizedLogs
        .slice(0, count)
        .map((entry) => entry.line);
      onOutputChange((prev) => {
        const prevLines = prev === '' ? [] : prev.split('\n');
        const existing = sessionLinesRef.current;
        let baseLines = prevLines;
        if (
          existing.length > 0 &&
          prevLines.slice(-existing.length).every((line, idx) => line === existing[idx])
        ) {
          baseLines = prevLines.slice(0, prevLines.length - existing.length);
        }
        const combined = [...baseLines, ...activeLines];
        sessionLinesRef.current = activeLines;
        return combined.join('\n');
      });
    },
    [onOutputChange, sanitizedLogs],
  );

  useEffect(() => {
    updateOutput(visibleCount);
  }, [updateOutput, visibleCount]);

  const pauseTimer = useCallback(() => {
    if (!timerRef.current) return;
    const elapsed = Date.now() - lastTickRef.current;
    const consumed = elapsed * speedRef.current;
    remainingRef.current = Math.max(0, remainingRef.current - consumed);
    window.clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  function advance() {
    if (!isPlayingRef.current) return;
    const logsList = logsRef.current;
    const nextIndex = Math.min(visibleCountRef.current + 1, logsList.length);
    visibleCountRef.current = nextIndex;
    setVisibleCount(nextIndex);
    if (nextIndex >= logsList.length) {
      setIsPlaying(false);
      return;
    }
    remainingRef.current = 0;
    startTimer();
  }

  function startTimer() {
    if (!isPlayingRef.current) return;
    const logsList = logsRef.current;
    const idx = visibleCountRef.current;
    if (idx >= logsList.length) {
      setIsPlaying(false);
      return;
    }
    const prevTime = idx === 0 ? 0 : logsList[idx - 1].timestamp;
    const nextTime = logsList[idx].timestamp;
    const baseDelay = Math.max(0, nextTime - prevTime);
    const delay = remainingRef.current || baseDelay;
    remainingRef.current = delay;
    lastTickRef.current = Date.now();
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }
    const realDelay = delay / speedRef.current;
    if (realDelay <= 0) {
      remainingRef.current = 0;
      advance();
      return;
    }
    timerRef.current = window.setTimeout(() => {
      remainingRef.current = 0;
      advance();
    }, realDelay);
  }

  useEffect(() => {
    if (isPlaying) {
      startTimer();
    } else {
      pauseTimer();
    }
  }, [isPlaying, pauseTimer]);

  useEffect(() => {
    const prev = prevSpeedRef.current;
    prevSpeedRef.current = speed;
    if (!isPlayingRef.current || !timerRef.current) return;
    const elapsed = Date.now() - lastTickRef.current;
    const consumed = elapsed * prev;
    remainingRef.current = Math.max(0, remainingRef.current - consumed);
    window.clearTimeout(timerRef.current);
    timerRef.current = null;
    if (remainingRef.current <= 0) {
      advance();
    } else {
      startTimer();
    }
  }, [speed]);

  const handleToggle = () => {
    if (!sanitizedLogs.length) return;
    if (isPlayingRef.current) {
      setIsPlaying(false);
      return;
    }
    if (visibleCountRef.current >= sanitizedLogs.length) {
      remainingRef.current = 0;
      visibleCountRef.current = 0;
      setVisibleCount(0);
    }
    setIsPlaying(true);
  };

  const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = Number(event.target.value);
    if (Number.isNaN(raw)) return;
    const clamped = Math.min(Math.max(raw, 0), sanitizedLogs.length);
    visibleCountRef.current = clamped;
    setVisibleCount(clamped);
    remainingRef.current = 0;
    if (clamped < sanitizedLogs.length) {
      const logsList = logsRef.current;
      const prevTime = clamped === 0 ? 0 : logsList[clamped - 1].timestamp;
      remainingRef.current = Math.max(0, logsList[clamped].timestamp - prevTime);
    }
    if (isPlayingRef.current) {
      startTimer();
    }
  };

  const handleSpeedChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const next = Number(event.target.value);
    if (!Number.isNaN(next)) {
      setSpeed(next);
    }
  };

  const maxPosition = sanitizedLogs.length;
  const positionLabel = `${visibleCount}/${maxPosition}`;

  return (
    <div className="mt-4 space-y-2" aria-label="session simulator">
      <div className="flex items-center space-x-2">
        <button
          type="button"
          onClick={handleToggle}
          disabled={!maxPosition}
          className="px-2 py-1 rounded bg-ub-orange text-black disabled:opacity-50"
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <label className="sr-only" htmlFor="session-position">
          Session position
        </label>
        <input
          id="session-position"
          type="range"
          min={0}
          max={maxPosition}
          value={visibleCount}
          onChange={handleSeek}
          disabled={!maxPosition}
          aria-label="Session position"
          className="flex-1"
        />
        <span className="text-xs" aria-live="polite">
          {positionLabel}
        </span>
        <label className="sr-only" htmlFor="session-speed">
          Playback speed
        </label>
        <select
          id="session-speed"
          value={speed}
          onChange={handleSpeedChange}
          className="bg-ub-grey text-white p-1 rounded"
          aria-label="Playback speed"
        >
          {speedOptions.map((opt) => (
            <option key={opt} value={opt}>{`${opt}x`}</option>
          ))}
        </select>
      </div>
      <p className="text-xs text-gray-300">
        Playback uses sanitized demo logs so no live exploitation occurs.
      </p>
    </div>
  );
};

export default SessionSimulator;
