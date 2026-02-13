'use client';

import React, { useEffect, useMemo, useState } from 'react';

interface LongTaskRecord {
  startTime: number;
  duration: number;
  attribution?: string;
}

type NavigatorWithMemory = Navigator & {
  deviceMemory?: number;
};

type LongTaskSupportState = 'unknown' | 'supported' | 'unsupported';

const RECENT_TASK_LIMIT = 6;
const SAMPLE_WINDOW_MS = 1000;

const formatMilliseconds = (ms: number) => {
  if (ms >= 100) return `${ms.toFixed(0)} ms`;
  if (ms >= 10) return `${ms.toFixed(1)} ms`;
  return `${ms.toFixed(2)} ms`;
};

const formatSeconds = (ms: number) => `${(ms / 1000).toFixed(2)} s`;

export default function PerformanceStats() {
  const [fps, setFps] = useState<number | null>(null);
  const [avgFrameTime, setAvgFrameTime] = useState<number | null>(null);
  const [deviceMemory, setDeviceMemory] = useState<number | null>(null);
  const [longTaskSupport, setLongTaskSupport] = useState<LongTaskSupportState>('unknown');
  const [recentLongTasks, setRecentLongTasks] = useState<LongTaskRecord[]>([]);
  const [longTaskCount, setLongTaskCount] = useState(0);
  const [totalBlockingTime, setTotalBlockingTime] = useState(0);
  const [longestLongTask, setLongestLongTask] = useState(0);

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    const nav = navigator as NavigatorWithMemory;
    if (typeof nav.deviceMemory === 'number' && Number.isFinite(nav.deviceMemory)) {
      setDeviceMemory(nav.deviceMemory);
    }
  }, []);

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      typeof performance === 'undefined' ||
      typeof requestAnimationFrame === 'undefined' ||
      typeof cancelAnimationFrame === 'undefined'
    ) {
      return;
    }

    let rafId = 0;
    let frameCount = 0;
    let accumulator = 0;
    let lastSample = performance.now();
    let active = true;

    const tick = (now: number) => {
      const delta = Math.max(0, now - lastSample);
      lastSample = now;

      // Ignore extremely large gaps (e.g., tab inactive) to keep averages stable.
      const clampedDelta = Math.min(delta, SAMPLE_WINDOW_MS);
      accumulator += clampedDelta;
      frameCount += 1;

      if (accumulator >= SAMPLE_WINDOW_MS && frameCount > 0 && active) {
        const averageFrame = accumulator / frameCount;
        setAvgFrameTime(averageFrame);
        setFps(1000 / averageFrame);
        accumulator = 0;
        frameCount = 0;
      }

      if (active) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame((time) => {
      lastSample = time;
      tick(time);
    });

    return () => {
      active = false;
      cancelAnimationFrame(rafId);
    };
  }, []);

  useEffect(() => {
    if (typeof PerformanceObserver === 'undefined') {
      setLongTaskSupport('unsupported');
      return;
    }

    const ObserverWithSupport = PerformanceObserver as typeof PerformanceObserver & {
      supportedEntryTypes?: string[];
    };

    if (
      Array.isArray(ObserverWithSupport.supportedEntryTypes) &&
      !ObserverWithSupport.supportedEntryTypes.includes('longtask')
    ) {
      setLongTaskSupport('unsupported');
      return;
    }

    let active = true;

    const observer = new PerformanceObserver((list) => {
      if (!active) return;

      const entries = list.getEntries();
      if (!entries.length) return;

      const mapped: LongTaskRecord[] = entries.map((entry) => {
        const longTask = entry as PerformanceEntry & {
          attribution?: Array<{ name?: string; entryType?: string }>;
        };
        const attribution = longTask.attribution?.[0];
        return {
          startTime: entry.startTime,
          duration: entry.duration,
          attribution: attribution?.name ?? attribution?.entryType ?? undefined,
        };
      });

      const durations = mapped.map((task) => task.duration);
      const blockingDelta = mapped.reduce(
        (total, task) => total + Math.max(task.duration - 50, 0),
        0,
      );

      setLongTaskCount((count) => count + mapped.length);
      setTotalBlockingTime((time) => time + blockingDelta);
      setLongestLongTask((current) => {
        if (!durations.length) return current;
        return Math.max(current, Math.max(...durations));
      });
      setRecentLongTasks((prev) => {
        const combined = [...prev, ...mapped];
        return combined.slice(-RECENT_TASK_LIMIT);
      });
    });

    let observed = false;
    try {
      observer.observe({ type: 'longtask', buffered: true });
      observed = true;
    } catch (error) {
      try {
        observer.observe({ entryTypes: ['longtask'] });
        observed = true;
      } catch (err) {
        // Swallow error; we'll mark as unsupported below.
      }
    }

    if (!observed) {
      observer.disconnect();
      setLongTaskSupport('unsupported');
      return;
    }

    setLongTaskSupport('supported');

    return () => {
      active = false;
      observer.disconnect();
    };
  }, []);

  const recentTasksDescending = useMemo(
    () => [...recentLongTasks].sort((a, b) => b.startTime - a.startTime),
    [recentLongTasks],
  );

  return (
    <div className="p-2 text-xs text-white bg-[var(--kali-bg)]">
      <h2 className="font-bold mb-1">Runtime Metrics</h2>
      <div className="space-y-2">
        <div className="border border-gray-700 rounded bg-[var(--kali-panel)] p-2 space-y-1">
          {deviceMemory !== null && (
            <div className="flex justify-between text-gray-100">
              <span>Device memory</span>
              <span>{deviceMemory} GB</span>
            </div>
          )}
          <div className="flex justify-between text-gray-100">
            <span>Estimated FPS</span>
            <span>{fps !== null ? fps.toFixed(1) : '—'}</span>
          </div>
          <div className="flex justify-between text-gray-100">
            <span>Avg frame time</span>
            <span>{avgFrameTime !== null ? formatMilliseconds(avgFrameTime) : '—'}</span>
          </div>
        </div>
        <div className="border border-gray-700 rounded bg-[var(--kali-panel)] p-2">
          <div className="flex items-center mb-1">
            <h3 className="font-semibold text-gray-200">Long tasks</h3>
            {longTaskSupport === 'supported' && (
              <span className="ml-auto text-[0.65rem] uppercase tracking-wide text-gray-400">
                observing
              </span>
            )}
          </div>
          {longTaskSupport === 'unsupported' && (
            <p className="text-gray-400">PerformanceObserver long task entries are not supported.</p>
          )}
          {longTaskSupport === 'supported' && (
            <>
              <div className="grid grid-cols-2 gap-y-1 text-gray-100 text-[0.7rem]">
                <span>Total observed</span>
                <span className="text-right">{longTaskCount}</span>
                <span>Total blocking time</span>
                <span className="text-right">{formatMilliseconds(totalBlockingTime)}</span>
                <span>Longest duration</span>
                <span className="text-right">
                  {longestLongTask > 0 ? formatMilliseconds(longestLongTask) : '—'}
                </span>
              </div>
              <div className="mt-2 border border-gray-700 rounded bg-[var(--kali-bg)] max-h-40 overflow-auto">
                {recentTasksDescending.length === 0 ? (
                  <div className="p-2 text-gray-400">No long tasks observed yet.</div>
                ) : (
                  <ul className="divide-y divide-gray-700">
                    {recentTasksDescending.map((task, index) => (
                      <li key={`${task.startTime}-${task.duration}-${index}`} className="p-2">
                        <div className="flex justify-between text-gray-100">
                          <span>{formatMilliseconds(task.duration)}</span>
                          <span>{formatSeconds(task.startTime)}</span>
                        </div>
                        {task.attribution && (
                          <div className="text-gray-400 truncate">{task.attribution}</div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
          {longTaskSupport === 'unknown' && (
            <p className="text-gray-400">Initializing PerformanceObserver…</p>
          )}
        </div>
      </div>
    </div>
  );
}
