'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import clsx from 'clsx';

import webDelivery from './logs/web_delivery.json';
import lateralMovement from './logs/lateral_movement.json';

interface SessionEvent {
  timestamp: number;
  output: string;
}

interface SessionLog {
  id: string;
  title: string;
  description: string;
  events: SessionEvent[];
}

const LOGS: SessionLog[] = [
  webDelivery as SessionLog,
  lateralMovement as SessionLog,
];

const formatTime = (seconds: number) => {
  const totalSeconds = Math.max(0, seconds);
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

interface SandboxedTerminalProps {
  lines: string[];
  className?: string;
}

const SandboxedTerminal = React.forwardRef<HTMLDivElement, SandboxedTerminalProps>(
  ({ lines, className }, ref) => (
    <div
      ref={ref}
      role="log"
      aria-live="polite"
      aria-relevant="additions"
      className={clsx(
        'h-full w-full overflow-auto rounded border border-gray-700 bg-black p-2 font-mono text-sm text-green-300',
        className,
      )}
    >
      {lines.length ? (
        <ol className="space-y-1">
          {lines.map((line, idx) => (
            <li key={`${idx}-${line}`}>{line || '\u00A0'}</li>
          ))}
        </ol>
      ) : (
        <p>No output yet.</p>
      )}
    </div>
  ),
);

SandboxedTerminal.displayName = 'SandboxedTerminal';

export interface SessionSimulatorProps {
  isActive?: boolean;
}

interface PlaybackState {
  logId: string;
  currentTime: number;
  isPlaying: boolean;
  speed: number;
}

const defaultState: PlaybackState = {
  logId: LOGS[0]?.id ?? '',
  currentTime: 0,
  isPlaying: false,
  speed: 1,
};

const clampTime = (log: SessionLog, value: number) => {
  if (!log.events.length) return 0;
  const last = log.events[log.events.length - 1].timestamp;
  return Math.min(Math.max(0, value), last);
};

const SessionSimulator: React.FC<SessionSimulatorProps> = ({ isActive = true }) => {
  const [state, setState] = useState<PlaybackState>(() => ({ ...defaultState }));
  const terminalRef = useRef<HTMLDivElement | null>(null);

  const logsById = useMemo(() => {
    const map = new Map<string, SessionLog>();
    LOGS.forEach((log) => {
      map.set(log.id, log);
    });
    return map;
  }, []);

  const currentLog = logsById.get(state.logId) ?? LOGS[0];
  const duration = currentLog?.events.length
    ? currentLog.events[currentLog.events.length - 1].timestamp
    : 0;

  useEffect(() => {
    if (!currentLog) return;
    setState((prev) => {
      if (!prev.logId && currentLog) {
        return { ...prev, logId: currentLog.id };
      }
      const clampedTime = clampTime(currentLog, prev.currentTime);
      if (clampedTime !== prev.currentTime) {
        return { ...prev, currentTime: clampedTime, isPlaying: false };
      }
      return prev;
    });
  }, [currentLog]);

  useEffect(() => {
    if (!state.isPlaying || !isActive || !currentLog || !duration) return;
    const interval = window.setInterval(() => {
      setState((prev) => {
        const activeLog = logsById.get(prev.logId) ?? currentLog;
        if (!activeLog.events.length) {
          return { ...prev, isPlaying: false, currentTime: 0 };
        }
        const last = activeLog.events[activeLog.events.length - 1].timestamp;
        const next = prev.currentTime + 0.1 * prev.speed;
        if (next >= last) {
          return { ...prev, currentTime: last, isPlaying: false };
        }
        if (next === prev.currentTime) {
          return prev;
        }
        return { ...prev, currentTime: Number(next.toFixed(2)) };
      });
    }, 100);
    return () => window.clearInterval(interval);
  }, [state.isPlaying, state.speed, state.logId, isActive, currentLog, duration, logsById]);

  const lines = useMemo(() => {
    if (!currentLog) return [];
    return currentLog.events
      .filter((event) => event.timestamp <= state.currentTime + 1e-3)
      .map((event) => event.output);
  }, [currentLog, state.currentTime]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines.length]);

  if (!currentLog) {
    return (
      <div className="p-4 text-sm text-white">
        <p>No session logs available.</p>
      </div>
    );
  }

  const handlePlayPause = () => {
    setState((prev) => {
      if (prev.isPlaying) {
        return { ...prev, isPlaying: false };
      }
      const log = logsById.get(prev.logId) ?? currentLog;
      const last = log.events.length ? log.events[log.events.length - 1].timestamp : 0;
      const time = prev.currentTime >= last ? 0 : prev.currentTime;
      return { ...prev, currentTime: time, isPlaying: true };
    });
  };

  const handleSeek = (value: number) => {
    const log = logsById.get(state.logId) ?? currentLog;
    const next = clampTime(log, value);
    setState((prev) => ({ ...prev, currentTime: next }));
  };

  const handleSpeedChange = (value: number) => {
    setState((prev) => ({ ...prev, speed: value }));
  };

  const handleLogChange = (id: string) => {
    const nextLog = logsById.get(id);
    if (!nextLog) return;
    setState({ logId: id, currentTime: 0, isPlaying: false, speed: 1 });
  };

  return (
    <div className="flex h-full flex-col bg-black/70 text-white">
      <header className="flex flex-col gap-2 border-b border-gray-700 p-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold">Session Simulator</h3>
          <span className="rounded bg-ub-orange px-2 py-0.5 text-xs text-black">
            Training Mode
          </span>
        </div>
        <p className="text-xs text-gray-300">{currentLog.description}</p>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <label className="flex items-center gap-2">
            <span className="text-gray-300">Session:</span>
            <select
              aria-label="Session log"
              value={currentLog.id}
              onChange={(e) => handleLogChange(e.target.value)}
              className="rounded border border-gray-700 bg-black px-2 py-1 text-white"
            >
              {LOGS.map((log) => (
                <option key={log.id} value={log.id}>
                  {log.title}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            <span className="text-gray-300">Speed:</span>
            <select
              aria-label="Playback speed"
              value={state.speed}
              onChange={(e) => handleSpeedChange(Number(e.target.value))}
              className="rounded border border-gray-700 bg-black px-2 py-1 text-white"
            >
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={1.5}>1.5x</option>
              <option value={2}>2x</option>
            </select>
          </label>
          <div className="ml-auto flex items-center gap-3">
            <button
              type="button"
              onClick={handlePlayPause}
              className="rounded bg-ub-orange px-3 py-1 text-xs font-semibold text-black"
              aria-label={state.isPlaying ? 'Pause session playback' : 'Play session playback'}
            >
              {state.isPlaying ? 'Pause' : 'Play'}
            </button>
            <div className="flex items-center gap-2 text-gray-300">
              <span aria-label="Elapsed time" className="font-mono text-sm">
                {formatTime(state.currentTime)}
              </span>
              <span className="text-gray-500">/</span>
              <span aria-label="Session duration" className="font-mono text-sm">
                {formatTime(duration)}
              </span>
            </div>
          </div>
        </div>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={state.currentTime}
          onChange={(e) => handleSeek(Number(e.target.value))}
          aria-label="Seek session timeline"
          className="w-full"
        />
      </header>
      <div className="flex-1 p-3">
        <SandboxedTerminal ref={terminalRef} lines={lines} />
      </div>
    </div>
  );
};

export default SessionSimulator;
