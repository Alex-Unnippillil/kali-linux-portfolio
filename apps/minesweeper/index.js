'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Minesweeper from '../../components/apps/minesweeper';

const LEADERBOARD_STORAGE_KEY = 'minesweeper:leaderboard';
const SELECTED_DIFFICULTY_KEY = 'minesweeper:selectedDifficulty';
const MAX_LEADERBOARD_ENTRIES = 5;

const DIFFICULTIES = {
  beginner: { label: 'Beginner' },
  intermediate: { label: 'Intermediate' },
  expert: { label: 'Expert' },
};

const createEmptyLeaderboard = () =>
  Object.fromEntries(Object.keys(DIFFICULTIES).map((key) => [key, []]));

const TimerDisplay = ({ elapsedMs }) => (
  <div className="text-lg font-mono" data-testid="timer-display">
    Time: {(elapsedMs / 1000).toFixed(2)}s
  </div>
);

const sanitizeEntries = (raw) =>
  raw
    .filter((entry) => entry && typeof entry.time === 'number' && Number.isFinite(entry.time))
    .map((entry) => ({
      name: typeof entry.name === 'string' && entry.name.trim() ? entry.name.trim() : 'Anonymous',
      time: entry.time,
      achievedAt: entry.achievedAt ?? null,
    }))
    .sort((a, b) => a.time - b.time)
    .slice(0, MAX_LEADERBOARD_ENTRIES);

const MinesweeperApp = () => {
  const [difficulty, setDifficulty] = useState('beginner');
  const [status, setStatus] = useState('ready');
  const [leaderboard, setLeaderboard] = useState(createEmptyLeaderboard);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [running, setRunning] = useState(false);

  const startRef = useRef(null);
  const elapsedRef = useRef(0);
  const hasLoadedLeaderboard = useRef(false);

  useEffect(() => {
    elapsedRef.current = elapsedMs;
  }, [elapsedMs]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const storedDifficulty = window.localStorage.getItem(SELECTED_DIFFICULTY_KEY);
      if (storedDifficulty && DIFFICULTIES[storedDifficulty]) {
        setDifficulty(storedDifficulty);
      }
    } catch {
      /* ignore stored difficulty errors */
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(LEADERBOARD_STORAGE_KEY);
      if (!raw) {
        hasLoadedLeaderboard.current = true;
        return;
      }
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') {
        hasLoadedLeaderboard.current = true;
        return;
      }
      const next = createEmptyLeaderboard();
      Object.keys(next).forEach((key) => {
        if (Array.isArray(parsed[key])) {
          next[key] = sanitizeEntries(parsed[key]);
        }
      });
      setLeaderboard(next);
    } catch {
      setLeaderboard(createEmptyLeaderboard());
    } finally {
      hasLoadedLeaderboard.current = true;
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedLeaderboard.current || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(leaderboard));
    } catch {
      /* ignore persistence errors */
    }
  }, [leaderboard]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(SELECTED_DIFFICULTY_KEY, difficulty);
    } catch {
      /* ignore persistence errors */
    }
  }, [difficulty]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      if (startRef.current != null) {
        setElapsedMs(Date.now() - startRef.current);
      }
    }, 100);
    return () => clearInterval(id);
  }, [running]);

  const startTimer = useCallback((elapsedSeconds = 0) => {
    const offset = Math.max(0, elapsedSeconds * 1000);
    setElapsedMs(offset);
    startRef.current = Date.now() - offset;
    setRunning(true);
  }, []);

  const stopTimer = useCallback((finalSeconds) => {
    let finalMs = elapsedRef.current;
    if (typeof finalSeconds === 'number' && Number.isFinite(finalSeconds)) {
      finalMs = Math.max(0, finalSeconds * 1000);
    } else if (startRef.current != null) {
      finalMs = Date.now() - startRef.current;
    }
    startRef.current = null;
    setElapsedMs(finalMs);
    setRunning(false);
  }, []);

  const resetTimer = useCallback(() => {
    startRef.current = null;
    setElapsedMs(0);
    setRunning(false);
  }, []);

  const pauseTimer = useCallback(() => {
    if (startRef.current == null) return;
    setElapsedMs(Date.now() - startRef.current);
    startRef.current = null;
    setRunning(false);
  }, []);

  const resumeTimer = useCallback(() => {
    const offset = elapsedRef.current;
    startRef.current = Date.now() - offset;
    setRunning(true);
  }, []);

  const handleGameStart = useCallback(
    ({ elapsed = 0 } = {}) => {
      startTimer(elapsed);
    },
    [startTimer],
  );

  const handleGameEnd = useCallback(
    ({ result, time, difficulty: eventDifficulty } = {}) => {
      stopTimer(time);
      if (result !== 'won' || typeof time !== 'number' || !Number.isFinite(time)) return;
      const diffKey = eventDifficulty && DIFFICULTIES[eventDifficulty] ? eventDifficulty : difficulty;
      setLeaderboard((prev) => {
        const entries = prev[diffKey] ?? [];
        const qualifies =
          entries.length < MAX_LEADERBOARD_ENTRIES ||
          time < entries[entries.length - 1]?.time;
        if (!qualifies) return prev;
        let name = 'Anonymous';
        if (
          typeof window !== 'undefined' &&
          typeof window.prompt === 'function'
        ) {
          const response = window.prompt('New record! Enter your name', '');
          if (typeof response === 'string') {
            const trimmed = response.trim();
            if (trimmed) name = trimmed;
          }
        }
        const updated = [...entries, { name, time, achievedAt: Date.now() }]
          .sort((a, b) => a.time - b.time)
          .slice(0, MAX_LEADERBOARD_ENTRIES);
        return { ...prev, [diffKey]: updated };
      });
    },
    [difficulty, stopTimer],
  );

  const handleStatusChange = useCallback(
    (nextStatus) => {
      setStatus(nextStatus);
      if (nextStatus === 'ready') {
        resetTimer();
      }
    },
    [resetTimer],
  );

  const handlePausedChange = useCallback(
    (isPaused) => {
      if (isPaused) {
        pauseTimer();
      } else if (status === 'playing') {
        resumeTimer();
      }
    },
    [pauseTimer, resumeTimer, status],
  );

  const handleClear = useCallback(() => {
    setLeaderboard(createEmptyLeaderboard());
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(LEADERBOARD_STORAGE_KEY);
      } catch {
        /* ignore storage errors */
      }
    }
  }, []);

  const leaderboardEntries = useMemo(
    () => leaderboard[difficulty] ?? [],
    [difficulty, leaderboard],
  );

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className="flex-1">
        <Minesweeper
          key={difficulty}
          difficulty={difficulty}
          onGameStart={handleGameStart}
          onGameEnd={handleGameEnd}
          onStatusChange={handleStatusChange}
          onPausedChange={handlePausedChange}
        />
      </div>
      <aside className="w-full rounded-lg bg-gray-900 p-4 text-white shadow-lg lg:w-72">
        <h2 className="text-xl font-semibold">Leaderboard</h2>
        <label
          htmlFor="minesweeper-difficulty"
          className="mt-3 block text-sm font-medium text-gray-300"
        >
          Difficulty
        </label>
        <select
          id="minesweeper-difficulty"
          data-testid="difficulty-select"
          className="mt-1 w-full rounded border border-gray-700 bg-gray-800 px-2 py-1 text-sm"
          value={difficulty}
          onChange={(event) => {
            const value = event.target.value;
            if (DIFFICULTIES[value]) setDifficulty(value);
          }}
        >
          {Object.entries(DIFFICULTIES).map(([value, { label }]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <TimerDisplay elapsedMs={elapsedMs} />
        <ol
          className="mt-4 space-y-1 text-sm"
          data-testid="leaderboard-list"
          aria-live="polite"
        >
          {leaderboardEntries.length === 0 ? (
            <li className="text-gray-400">No records yet.</li>
          ) : (
            leaderboardEntries.map((entry, index) => (
              <li key={`${entry.name}-${entry.time}-${entry.achievedAt ?? index}`}>
                <span className="font-mono">{String(index + 1).padStart(2, '0')}.</span>{' '}
                <span className="font-semibold">{entry.name}</span>{' '}
                <span>{entry.time.toFixed(2)}s</span>
              </li>
            ))
          )}
        </ol>
        <button
          type="button"
          className="mt-4 w-full rounded bg-red-600 px-3 py-2 text-sm font-medium hover:bg-red-500"
          onClick={handleClear}
        >
          Clear leaderboard
        </button>
      </aside>
    </div>
  );
};

export default MinesweeperApp;
