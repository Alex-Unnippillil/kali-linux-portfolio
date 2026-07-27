"use client";

import React, { useEffect, useMemo, useState } from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';

export const WINDOW_MANAGER_EVENT = 'window-manager:lifecycle';
export const FRAME_HISTORY_LIMIT = 120;
export const HEAP_HISTORY_LIMIT = 32;

type BaseLifecycleEvent = {
  id: string;
  timestamp?: number;
  title?: string;
};

export type LifecycleEventDetail =
  | (BaseLifecycleEvent & { type: 'mount' })
  | (BaseLifecycleEvent & { type: 'unmount' })
  | (BaseLifecycleEvent & { type: 'raf'; duration: number })
  | (BaseLifecycleEvent & {
      type: 'heap';
      usedJSHeapSize: number;
      totalJSHeapSize?: number;
    });

type HeapSample = {
  used: number;
  total?: number;
  timestamp: number;
};

type WindowMetrics = {
  id: string;
  title: string;
  mountAt?: number;
  unmountAt?: number;
  frameDurations: number[];
  lastFrameAt?: number;
  heapSnapshots: HeapSample[];
};

export type TaskRow = {
  id: string;
  title: string;
  status: 'Running' | 'Closed';
  uptimeMs: number;
  mountAt: number;
  unmountAt?: number;
  avgFrame: number;
  lastFrame: number;
  frameSamples: number;
  heapUsed: number;
  heapTotal?: number;
  heapSampleCount: number;
  heapAgeMs?: number;
};

type Listener = () => void;

const nowFallback = (): number => {
  if (typeof performance !== 'undefined' && performance.now) {
    return performance.now();
  }
  return Date.now();
};

export class TaskManagerStore {
  private metrics = new Map<string, WindowMetrics>();
  private listeners = new Set<Listener>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  handleLifecycle(detail: LifecycleEventDetail): void {
    const timestamp = detail.timestamp ?? nowFallback();

    switch (detail.type) {
      case 'mount': {
        const title =
          detail.title ?? this.metrics.get(detail.id)?.title ?? detail.id;
        this.metrics.set(detail.id, {
          id: detail.id,
          title,
          mountAt: timestamp,
          unmountAt: undefined,
          frameDurations: [],
          lastFrameAt: undefined,
          heapSnapshots: [],
        });
        break;
      }
      case 'unmount': {
        const entry = this.ensure(detail.id);
        entry.unmountAt = timestamp;
        break;
      }
      case 'raf': {
        if (!Number.isFinite(detail.duration)) break;
        const entry = this.ensure(detail.id);
        entry.frameDurations.push(detail.duration);
        if (entry.frameDurations.length > FRAME_HISTORY_LIMIT) {
          entry.frameDurations.shift();
        }
        entry.lastFrameAt = timestamp;
        break;
      }
      case 'heap': {
        if (!Number.isFinite(detail.usedJSHeapSize)) break;
        const entry = this.ensure(detail.id);
        entry.heapSnapshots.push({
          used: detail.usedJSHeapSize,
          total: detail.totalJSHeapSize,
          timestamp,
        });
        if (entry.heapSnapshots.length > HEAP_HISTORY_LIMIT) {
          entry.heapSnapshots.shift();
        }
        break;
      }
      default:
        break;
    }

    this.emit();
  }

  getRows(now: number): TaskRow[] {
    const rows: TaskRow[] = [];
    this.metrics.forEach((entry) => {
      if (entry.mountAt == null) return;
      const status = entry.unmountAt ? 'Closed' : 'Running';
      const uptimeMs = Math.max(
        0,
        (entry.unmountAt ?? now) - entry.mountAt,
      );
      const frameSamples = entry.frameDurations.length;
      const avgFrame =
        frameSamples > 0
          ? entry.frameDurations.reduce((acc, val) => acc + val, 0) /
            frameSamples
          : 0;
      const lastFrame = entry.frameDurations[frameSamples - 1] ?? 0;
      const heap = entry.heapSnapshots[entry.heapSnapshots.length - 1];
      const heapAgeMs = heap ? Math.max(0, now - heap.timestamp) : undefined;

      rows.push({
        id: entry.id,
        title: entry.title,
        status,
        uptimeMs,
        mountAt: entry.mountAt,
        unmountAt: entry.unmountAt,
        avgFrame,
        lastFrame,
        frameSamples,
        heapUsed: heap?.used ?? 0,
        heapTotal: heap?.total,
        heapSampleCount: entry.heapSnapshots.length,
        heapAgeMs,
      });
    });

    rows.sort((a, b) => {
      if (a.status === 'Running' && b.status !== 'Running') return -1;
      if (a.status !== 'Running' && b.status === 'Running') return 1;
      return (b.mountAt ?? 0) - (a.mountAt ?? 0);
    });

    return rows;
  }

  private ensure(id: string): WindowMetrics {
    let entry = this.metrics.get(id);
    if (!entry) {
      entry = {
        id,
        title: id,
        frameDurations: [],
        heapSnapshots: [],
      };
      this.metrics.set(id, entry);
    }
    if (!entry.title) entry.title = id;
    return entry;
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }
}

const store = new TaskManagerStore();

const formatDuration = (ms: number | undefined): string => {
  if (!Number.isFinite(ms) || ms == null) return '–';
  if (ms < 1000) return `${(ms / 1000).toFixed(1)}s`;
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

const formatRelative = (ms?: number): string => {
  if (!Number.isFinite(ms) || ms == null) return 'never';
  if (ms < 1000) return 'moments ago';
  if (ms < 60_000) return `${Math.round(ms / 1000)}s ago`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m ago`;
  return `${Math.round(ms / 3_600_000)}h ago`;
};

const formatBytes = (bytes?: number): string => {
  if (!Number.isFinite(bytes) || bytes == null) return '–';
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const Row = ({
  index,
  style,
  data,
}: ListChildComponentProps<TaskRow[]>): React.JSX.Element => {
  const row = data[index];
  const statusClasses =
    row.status === 'Running' ? 'text-green-300' : 'text-rose-300';
  const avgFrame = row.avgFrame
    ? `${row.avgFrame.toFixed(1)} ms (${(1000 / row.avgFrame).toFixed(1)} fps)`
    : '–';
  const lastFrame = row.lastFrame
    ? `${row.lastFrame.toFixed(1)} ms`
    : '–';
  const heapLine = row.heapTotal
    ? `${formatBytes(row.heapUsed)} / ${formatBytes(row.heapTotal)}`
    : formatBytes(row.heapUsed);

  return (
    <div
      style={style}
      className={`grid grid-cols-[1.4fr,0.8fr,0.8fr,0.9fr,1fr] items-center gap-2 border-b border-white/5 px-4 py-3 text-sm ${
        index % 2 === 0 ? 'bg-black/10' : 'bg-black/20'
      }`}
    >
      <div className="truncate">
        <div className="truncate font-semibold">{row.title}</div>
        <div className="text-xs text-white/60 truncate">{row.id}</div>
      </div>
      <div className={`font-semibold ${statusClasses}`}>{row.status}</div>
      <div>{formatDuration(row.uptimeMs)}</div>
      <div className="text-xs leading-tight text-white/80">
        <div>{avgFrame}</div>
        <div className="text-white/60">Last: {lastFrame}</div>
        <div className="text-white/60">Samples: {row.frameSamples}</div>
      </div>
      <div className="text-xs leading-tight text-white/80">
        <div>{heapLine}</div>
        <div className="text-white/60">
          Snapshots: {row.heapSampleCount} • Updated {formatRelative(row.heapAgeMs)}
        </div>
      </div>
    </div>
  );
};

const TaskManagerApp: React.FC = () => {
  const [version, setVersion] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const unsubscribe = store.subscribe(() => setVersion((v) => v + 1));
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<LifecycleEventDetail>).detail;
      if (!detail || typeof detail !== 'object') return;
      if (!('type' in detail) || !('id' in detail)) return;
      store.handleLifecycle(detail as LifecycleEventDetail);
    };
    window.addEventListener(
      WINDOW_MANAGER_EVENT,
      handler as EventListener,
    );
    return () => {
      window.removeEventListener(
        WINDOW_MANAGER_EVENT,
        handler as EventListener,
      );
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    setNow(Date.now());
    const id = window.setInterval(() => {
      setNow(Date.now());
    }, 2000);
    return () => window.clearInterval(id);
  }, []);

  const rows = useMemo(() => store.getRows(now), [now, version]);

  const summary = useMemo(() => {
    if (rows.length === 0) {
      return { tracked: 0, active: 0, avgFrame: 0 };
    }
    let active = 0;
    let avgFrame = 0;
    let count = 0;
    rows.forEach((row) => {
      if (row.status === 'Running') active += 1;
      if (row.avgFrame > 0) {
        avgFrame += row.avgFrame;
        count += 1;
      }
    });
    return {
      tracked: rows.length,
      active,
      avgFrame: count ? avgFrame / count : 0,
    };
  }, [rows]);

  return (
    <div className="flex h-full w-full flex-col bg-ub-cool-grey font-ubuntu text-white">
      <header className="flex flex-wrap items-center gap-4 border-b border-white/10 bg-black/30 px-4 py-3 text-sm">
        <span>
          Tracked windows: <strong>{summary.tracked}</strong>
        </span>
        <span>
          Active: <strong>{summary.active}</strong>
        </span>
        <span>
          Avg frame:{' '}
          {summary.avgFrame
            ? `${summary.avgFrame.toFixed(1)} ms (${(1000 / summary.avgFrame).toFixed(1)} fps)`
            : '–'}
        </span>
        <span className="ml-auto text-xs text-white/70">
          Last update: {new Date(now).toLocaleTimeString()}
        </span>
      </header>
      <div className="flex-1 overflow-hidden">
        {rows.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-white/70">
            Waiting for window activity…
          </div>
        ) : (
          <div className="flex h-full flex-col">
            <div className="grid grid-cols-[1.4fr,0.8fr,0.8fr,0.9fr,1fr] border-b border-white/10 bg-black/40 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white/60">
              <span>Window</span>
              <span>Status</span>
              <span>Uptime</span>
              <span>Frames</span>
              <span>Heap usage</span>
            </div>
            <div className="flex-1">
              <AutoSizer>
                {({ height, width }) => (
                  <List
                    height={height}
                    width={width}
                    itemCount={rows.length}
                    itemSize={72}
                    itemData={rows}
                  >
                    {Row}
                  </List>
                )}
              </AutoSizer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskManagerApp;

