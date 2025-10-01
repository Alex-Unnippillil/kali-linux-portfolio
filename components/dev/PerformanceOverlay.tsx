'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useId } from 'react';
import { logDevEvent, registerOverlayBridge, type InstrumentationEvent } from '../../utils/devInstrumentation';

interface OverlaySettings {
  showOverlay: boolean;
  showFps: boolean;
  showLongTasks: boolean;
  showWorkerQueue: boolean;
  fpsWarning: number;
  longTaskWarning: number;
  workerQueueWarning: number;
}

interface WorkerMeta {
  label: string;
  pending: number;
  lastPost?: number;
}

interface OverlayMetrics {
  fps: number;
  frameDuration: number;
  longTaskSamples: Array<{ timestamp: number; duration: number }>;
  lastLongTaskDuration: number;
  workerQueueDepth: number;
  workerQueuePeak: number;
  workerBreakdown: string[];
  lastRenderDuration: number;
}

const DEFAULT_SETTINGS: OverlaySettings = {
  showOverlay: true,
  showFps: true,
  showLongTasks: true,
  showWorkerQueue: true,
  fpsWarning: 50,
  longTaskWarning: 50,
  workerQueueWarning: 5,
};

const clampThreshold = (value: number, fallback: number) => {
  if (Number.isNaN(value) || !Number.isFinite(value)) return fallback;
  return Math.max(0, value);
};

const getWorkerLabel = (input: ConstructorParameters<typeof Worker>[0]): string => {
  if (typeof input === 'string') {
    try {
      const url = new URL(input, window.location.href);
      const segment = url.pathname.split('/').pop();
      return segment || url.pathname || input;
    } catch (err) {
      return input;
    }
  }
  if (input instanceof URL) {
    const segment = input.pathname.split('/').pop();
    return segment || input.pathname;
  }
  return 'worker';
};

const PerformanceOverlay = () => {
  const [expanded, setExpanded] = useState(false);
  const [settings, setSettings] = useState<OverlaySettings>(DEFAULT_SETTINGS);
  const settingsRef = useRef(settings);
  const idBase = useId();
  const inputIds = useMemo(
    () => ({
      showOverlay: `${idBase}-show-overlay`,
      showFps: `${idBase}-show-fps`,
      showLong: `${idBase}-show-long`,
      showWorker: `${idBase}-show-worker`,
      fpsWarning: `${idBase}-fps-warning`,
      longWarning: `${idBase}-long-warning`,
      workerWarning: `${idBase}-worker-warning`,
    }),
    [idBase],
  );
  const metricsRef = useRef<OverlayMetrics>({
    fps: 0,
    frameDuration: 0,
    longTaskSamples: [],
    lastLongTaskDuration: 0,
    workerQueueDepth: 0,
    workerQueuePeak: 0,
    workerBreakdown: [],
    lastRenderDuration: 0,
  });
  const [uiStats, setUiStats] = useState({
    fps: 0,
    frameDuration: 0,
    longTaskCount: 0,
    lastLongTaskDuration: 0,
    workerQueueDepth: 0,
    workerQueuePeak: 0,
  });
  const [logs, setLogs] = useState<InstrumentationEvent[]>([]);
  const logsRef = useRef<InstrumentationEvent[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenCanvasRef = useRef<OffscreenCanvas | null>(null);
  const bitmapContextRef = useRef<ImageBitmapRenderingContext | null>(null);
  const offscreenFailedRef = useRef(false);
  const workerRegistryRef = useRef<Map<Worker, WorkerMeta>>(new Map());
  const animationRef = useRef<number>();
  const lastStatsEmitRef = useRef<number>(0);
  const fpsAlertRef = useRef(false);
  const workerAlertRef = useRef(false);
  const renderAlertRef = useRef(false);
  const [visible, setVisible] = useState(true);

  settingsRef.current = settings;

  const appendLog = useCallback((event: InstrumentationEvent) => {
    logsRef.current = [event, ...logsRef.current].slice(0, 30);
    setLogs(logsRef.current);
  }, []);

  useEffect(() => {
    const unregister = registerOverlayBridge(appendLog);
    return unregister;
  }, [appendLog]);

  useEffect(() => {
    logDevEvent('dev-overlay:mounted', { settings: settingsRef.current });
    return () => {
      logDevEvent('dev-overlay:unmounted');
    };
  }, []);

  const updateWorkerMetrics = useCallback(() => {
    const metrics = metricsRef.current;
    const registry = workerRegistryRef.current;
    let total = 0;
    const breakdown: Array<{ label: string; pending: number }> = [];
    registry.forEach((meta) => {
      total += meta.pending;
      if (meta.pending > 0) breakdown.push({ label: meta.label, pending: meta.pending });
    });
    breakdown.sort((a, b) => b.pending - a.pending);
    metrics.workerBreakdown = breakdown.slice(0, 3).map((item) => `${item.label}: ${item.pending}`);
    metrics.workerQueueDepth = total;
    metrics.workerQueuePeak = Math.max(metrics.workerQueuePeak, total);
    return total;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (typeof Worker === 'undefined') return undefined;

    const registry = workerRegistryRef.current;
    const OriginalWorker = Worker;

    const PatchedWorker = function WorkerPatched(
      this: Worker,
      ...args: ConstructorParameters<typeof Worker>
    ) {
      const worker = new OriginalWorker(...args);
      const label = getWorkerLabel(args[0]);
      registry.set(worker, { label, pending: 0 });

      const originalPost = worker.postMessage.bind(worker);
      worker.postMessage = ((message: unknown, transfer?: Transferable[] | StructuredSerializeOptions) => {
        const meta = registry.get(worker);
        if (meta) {
          meta.pending += 1;
          meta.lastPost =
            typeof performance !== 'undefined' && typeof performance.now === 'function'
              ? performance.now()
              : Date.now();
        }
        updateWorkerMetrics();
        return originalPost(message as never, transfer as never);
      }) as typeof worker.postMessage;

      const settle = () => {
        const meta = registry.get(worker);
        if (meta && meta.pending > 0) {
          meta.pending -= 1;
        }
        updateWorkerMetrics();
      };

      worker.addEventListener('message', settle);
      worker.addEventListener('messageerror', settle);

      const originalTerminate = worker.terminate.bind(worker);
      worker.terminate = () => {
        registry.delete(worker);
        updateWorkerMetrics();
        return originalTerminate();
      };

      return worker;
    } as unknown as typeof Worker;

    PatchedWorker.prototype = OriginalWorker.prototype;
    // @ts-expect-error - overriding for instrumentation in dev.
    window.Worker = PatchedWorker;

    return () => {
      // @ts-expect-error - restore original worker constructor.
      window.Worker = OriginalWorker;
      registry.clear();
    };
  }, [updateWorkerMetrics]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (typeof PerformanceObserver === 'undefined') return undefined;

    const metrics = metricsRef.current;
    const observer = new PerformanceObserver((entryList) => {
      const now =
        typeof performance !== 'undefined' && typeof performance.now === 'function'
          ? performance.now()
          : Date.now();
      entryList.getEntries().forEach((entry) => {
        const duration = entry.duration;
        metrics.longTaskSamples.push({ timestamp: now, duration });
        metrics.lastLongTaskDuration = duration;
        const threshold = settingsRef.current.longTaskWarning;
        if (duration >= threshold) {
          const attribution = (entry as PerformanceEntry & {
            attribution?: Array<{ containerType?: string | undefined }>;
          }).attribution;
          logDevEvent(
            'dev-overlay:long-task',
            {
              duration,
              name: entry.name,
              startTime: entry.startTime,
              attribution: attribution?.map((item) => item.containerType) ?? [],
            },
            {
              longTaskDuration: duration,
              fps: metrics.fps,
              workerQueueDepth: metrics.workerQueueDepth,
            },
          );
        }
      });
    });

    try {
      observer.observe({ entryTypes: ['longtask'] });
    } catch (error) {
      console.warn('Long task observer unavailable', error);
    }

    return () => observer.disconnect();
  }, []);

  const pruneLongTasks = useCallback((now: number) => {
    const metrics = metricsRef.current;
    const cutoff = now - 10000;
    if (metrics.longTaskSamples.length === 0) return;
    metrics.longTaskSamples = metrics.longTaskSamples.filter((sample) => sample.timestamp >= cutoff);
  }, []);

  const drawOverlay = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const metrics = metricsRef.current;
    const rows: string[] = [];

    if (settingsRef.current.showFps) {
      rows.push(`FPS: ${metrics.fps.toFixed(1)} (${metrics.frameDuration.toFixed(1)}ms)`);
    }
    if (settingsRef.current.showLongTasks) {
      rows.push(`Long tasks (10s): ${metrics.longTaskSamples.length}`);
      if (metrics.lastLongTaskDuration > 0) {
        rows.push(`Last long task: ${metrics.lastLongTaskDuration.toFixed(1)}ms`);
      }
    }
    if (settingsRef.current.showWorkerQueue) {
      rows.push(`Worker queue: ${metrics.workerQueueDepth} (peak ${metrics.workerQueuePeak})`);
      metrics.workerBreakdown.forEach((item) => {
        rows.push(`  ${item}`);
      });
    }

    if (!rows.length) return;

    const padding = 12;
    const lineHeight = 18;
    const width = 280;
    const height = padding * 2 + rows.length * lineHeight;

    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;

    const start =
      typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();

    if (typeof OffscreenCanvas !== 'undefined' && !offscreenFailedRef.current) {
      if (!offscreenCanvasRef.current) {
        offscreenCanvasRef.current = new OffscreenCanvas(width, height);
        const bitmapContext = canvas.getContext('bitmaprenderer');
        if (bitmapContext) {
          bitmapContextRef.current = bitmapContext;
        } else {
          offscreenCanvasRef.current = null;
          offscreenFailedRef.current = true;
        }
      } else {
        const offscreen = offscreenCanvasRef.current;
        if (offscreen && (offscreen.width !== width || offscreen.height !== height)) {
          offscreen.width = width;
          offscreen.height = height;
        }
      }
    }

    if (offscreenCanvasRef.current && bitmapContextRef.current) {
      const offscreen = offscreenCanvasRef.current;
      const ctx = offscreen.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = 'rgba(17, 24, 39, 0.82)';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#f9fafb';
      ctx.font = '12px Ubuntu, system-ui, -apple-system, sans-serif';
      ctx.textBaseline = 'top';
      let offsetY = padding;
      rows.forEach((row) => {
        ctx.fillText(row, padding, offsetY);
        offsetY += lineHeight;
      });
      const bitmap = offscreen.transferToImageBitmap();
      bitmapContextRef.current.transferFromImageBitmap(bitmap);
      bitmap.close();
    } else {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = 'rgba(17, 24, 39, 0.82)';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#f9fafb';
      ctx.font = '12px Ubuntu, system-ui, -apple-system, sans-serif';
      ctx.textBaseline = 'top';
      let offsetY = padding;
      rows.forEach((row) => {
        ctx.fillText(row, padding, offsetY);
        offsetY += lineHeight;
      });
    }

    const duration =
      (typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now()) - start;
    metrics.lastRenderDuration = duration;
    if (duration > 5 && !renderAlertRef.current) {
      renderAlertRef.current = true;
      logDevEvent(
        'dev-overlay:render-budget-exceeded',
        { duration },
        {
          frameDuration: duration,
          fps: metrics.fps,
          workerQueueDepth: metrics.workerQueueDepth,
        },
      );
    } else if (duration <= 5 && renderAlertRef.current) {
      renderAlertRef.current = false;
      logDevEvent('dev-overlay:render-budget-recovered', { duration }, { frameDuration: duration });
    }
  }, []);

  useEffect(() => {
    if (!visible) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const metrics = metricsRef.current;
    let frames = 0;
    let lastFpsTime =
      typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();
    let lastFrame = lastFpsTime;

    const tick = (now: number) => {
      frames += 1;
      const delta = now - lastFrame;
      metrics.frameDuration = delta;
      lastFrame = now;

      if (now - lastFpsTime >= 500) {
        const fps = (frames * 1000) / (now - lastFpsTime);
        metrics.fps = Math.max(0, Math.round(fps * 10) / 10);
        frames = 0;
        lastFpsTime = now;
        if (settingsRef.current.showFps) {
          const belowThreshold = metrics.fps < settingsRef.current.fpsWarning;
          if (belowThreshold && !fpsAlertRef.current) {
            fpsAlertRef.current = true;
            logDevEvent(
              'dev-overlay:fps-warning',
              { fps: metrics.fps, threshold: settingsRef.current.fpsWarning },
              {
                fps: metrics.fps,
                frameDuration: metrics.frameDuration,
                workerQueueDepth: metrics.workerQueueDepth,
              },
            );
          } else if (!belowThreshold && fpsAlertRef.current) {
            fpsAlertRef.current = false;
            logDevEvent('dev-overlay:fps-recovered', { fps: metrics.fps }, { fps: metrics.fps });
          }
        }
      }

      pruneLongTasks(now);
      const longTaskCount = metrics.longTaskSamples.length;

      updateWorkerMetrics();
      const queueDepth = metrics.workerQueueDepth;
      if (settingsRef.current.showWorkerQueue) {
        const queueExceeded = queueDepth > settingsRef.current.workerQueueWarning;
        if (queueExceeded && !workerAlertRef.current) {
          workerAlertRef.current = true;
          logDevEvent(
            'dev-overlay:worker-queue-warning',
            { queueDepth, threshold: settingsRef.current.workerQueueWarning },
            {
              workerQueueDepth: queueDepth,
              workerQueuePeak: metrics.workerQueuePeak,
              fps: metrics.fps,
            },
          );
        } else if (!queueExceeded && workerAlertRef.current) {
          workerAlertRef.current = false;
          logDevEvent('dev-overlay:worker-queue-recovered', { queueDepth }, { workerQueueDepth: queueDepth });
        }
      }

      if (settingsRef.current.showOverlay) {
        drawOverlay();
      }

      if (now - lastStatsEmitRef.current > 500) {
        lastStatsEmitRef.current = now;
        setUiStats({
          fps: metrics.fps,
          frameDuration: metrics.frameDuration,
          longTaskCount,
          lastLongTaskDuration: metrics.lastLongTaskDuration,
          workerQueueDepth: queueDepth,
          workerQueuePeak: metrics.workerQueuePeak,
        });
      }

      animationRef.current = requestAnimationFrame(tick);
    };

    animationRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [drawOverlay, pruneLongTasks, updateWorkerMetrics, visible]);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const handleToggleSetting = useCallback((key: keyof OverlaySettings) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      logDevEvent('dev-overlay:toggle', { key, value: next[key] });
      return next;
    });
  }, []);

  const handleThresholdChange = useCallback((key: keyof OverlaySettings, value: number) => {
    setSettings((prev) => {
      const nextValue = clampThreshold(value, prev[key] as number);
      const next = { ...prev, [key]: nextValue };
      logDevEvent('dev-overlay:threshold', { key, value: nextValue });
      return next;
    });
  }, []);

  const formattedLogs = useMemo(() => {
    const origin =
      typeof performance !== 'undefined' && typeof performance.timeOrigin === 'number'
        ? performance.timeOrigin
        : Date.now();
    return logs.map((log) => {
      const absolute = origin + log.timestamp;
      const date = new Date(absolute);
      const timePart = date.toISOString().split('T')[1] ?? '';
      return {
        ...log,
        label: `${timePart.replace('Z', '')} — ${log.event}`,
      };
    });
  }, [logs]);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        right: '1.5rem',
        zIndex: 5000,
        pointerEvents: 'none',
        fontFamily: 'Ubuntu, system-ui, -apple-system, sans-serif',
      }}
      aria-hidden={!visible}
    >
      <div
        style={{
          background: 'rgba(17, 24, 39, 0.88)',
          color: '#f9fafb',
          borderRadius: '0.75rem',
          boxShadow: '0 10px 40px rgba(0,0,0,0.45)',
          padding: '0.75rem',
          minWidth: '260px',
          pointerEvents: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
          <strong>Dev Performance HUD</strong>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => {
                setVisible((prev) => {
                  const next = !prev;
                  logDevEvent('dev-overlay:visibility', { visible: next });
                  return next;
                });
              }}
              style={{
                background: 'rgba(59,130,246,0.25)',
                color: '#bfdbfe',
                border: '1px solid rgba(147,197,253,0.35)',
                borderRadius: '0.5rem',
                padding: '0.25rem 0.5rem',
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
            >
              {visible ? 'Hide' : 'Show'}
            </button>
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              style={{
                background: 'rgba(55,65,81,0.65)',
                color: '#f9fafb',
                border: '1px solid rgba(75,85,99,0.75)',
                borderRadius: '0.5rem',
                padding: '0.25rem 0.5rem',
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
            >
              {expanded ? 'Collapse' : 'Expand'}
            </button>
          </div>
        </div>

        {visible && (
          <div style={{ marginTop: '0.75rem' }}>
            <canvas
              ref={canvasRef}
              style={{
                width: '280px',
                height: 'auto',
                display: settings.showOverlay ? 'block' : 'none',
              }}
              aria-hidden="true"
            />
            <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', lineHeight: 1.5 }}>
              <div>FPS: {uiStats.fps.toFixed(1)}</div>
              <div>Frame time: {uiStats.frameDuration.toFixed(1)}ms</div>
              <div>
                Long tasks (10s): {uiStats.longTaskCount} · Last: {uiStats.lastLongTaskDuration.toFixed(1)}ms
              </div>
              <div>
                Worker queue: {uiStats.workerQueueDepth} · Peak: {uiStats.workerQueuePeak}
              </div>
              <div>Overlay render: {metricsRef.current.lastRenderDuration.toFixed(2)}ms</div>
            </div>
          </div>
        )}

        {expanded && (
          <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', display: 'grid', gap: '0.75rem' }}>
            <fieldset style={{ border: '1px solid rgba(75,85,99,0.75)', borderRadius: '0.5rem', padding: '0.75rem' }}>
              <legend style={{ padding: '0 0.35rem' }}>Display</legend>
              <div style={{ display: 'grid', gap: '0.35rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    id={inputIds.showOverlay}
                    type="checkbox"
                    checked={settings.showOverlay}
                    onChange={() => handleToggleSetting('showOverlay')}
                    aria-label="Overlay enabled"
                  />
                  <label htmlFor={inputIds.showOverlay}>Overlay enabled</label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    id={inputIds.showFps}
                    type="checkbox"
                    checked={settings.showFps}
                    onChange={() => handleToggleSetting('showFps')}
                    aria-label="Toggle FPS row"
                  />
                  <label htmlFor={inputIds.showFps}>FPS</label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    id={inputIds.showLong}
                    type="checkbox"
                    checked={settings.showLongTasks}
                    onChange={() => handleToggleSetting('showLongTasks')}
                    aria-label="Toggle long task metrics"
                  />
                  <label htmlFor={inputIds.showLong}>Long tasks</label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    id={inputIds.showWorker}
                    type="checkbox"
                    checked={settings.showWorkerQueue}
                    onChange={() => handleToggleSetting('showWorkerQueue')}
                    aria-label="Toggle worker queue metrics"
                  />
                  <label htmlFor={inputIds.showWorker}>Worker queue depth</label>
                </div>
              </div>
            </fieldset>

            <fieldset style={{ border: '1px solid rgba(75,85,99,0.75)', borderRadius: '0.5rem', padding: '0.75rem' }}>
              <legend style={{ padding: '0 0.35rem' }}>Thresholds</legend>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label htmlFor={inputIds.fpsWarning}>FPS warning (less than)</label>
                  <input
                    id={inputIds.fpsWarning}
                    type="number"
                    value={settings.fpsWarning}
                    min={0}
                    step={1}
                    onChange={(event) => handleThresholdChange('fpsWarning', Number(event.target.value))}
                    style={{
                      borderRadius: '0.35rem',
                      border: '1px solid rgba(147,197,253,0.45)',
                      padding: '0.25rem 0.5rem',
                      background: 'rgba(17,24,39,0.6)',
                      color: '#f9fafb',
                    }}
                    aria-label="FPS warning threshold"
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label htmlFor={inputIds.longWarning}>Long task warning (ms)</label>
                  <input
                    id={inputIds.longWarning}
                    type="number"
                    value={settings.longTaskWarning}
                    min={0}
                    step={5}
                    onChange={(event) => handleThresholdChange('longTaskWarning', Number(event.target.value))}
                    style={{
                      borderRadius: '0.35rem',
                      border: '1px solid rgba(147,197,253,0.45)',
                      padding: '0.25rem 0.5rem',
                      background: 'rgba(17,24,39,0.6)',
                      color: '#f9fafb',
                    }}
                    aria-label="Long task warning threshold"
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label htmlFor={inputIds.workerWarning}>Worker queue warning (pending messages)</label>
                  <input
                    id={inputIds.workerWarning}
                    type="number"
                    value={settings.workerQueueWarning}
                    min={0}
                    step={1}
                    onChange={(event) => handleThresholdChange('workerQueueWarning', Number(event.target.value))}
                    style={{
                      borderRadius: '0.35rem',
                      border: '1px solid rgba(147,197,253,0.45)',
                      padding: '0.25rem 0.5rem',
                      background: 'rgba(17,24,39,0.6)',
                      color: '#f9fafb',
                    }}
                    aria-label="Worker queue warning threshold"
                  />
                </div>
              </div>
            </fieldset>

            <section style={{ maxHeight: '160px', overflowY: 'auto' }}>
              <header style={{ marginBottom: '0.35rem' }}>
                <strong>Instrumentation log</strong>
              </header>
              {formattedLogs.length === 0 ? (
                <p style={{ opacity: 0.7 }}>No events yet. Interact with the app to populate the log.</p>
              ) : (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.35rem' }}>
                  {formattedLogs.slice(0, 12).map((entry, index) => (
                    <li
                      key={`${entry.timestamp}-${index}`}
                      style={{
                        background: 'rgba(31, 41, 55, 0.75)',
                        borderRadius: '0.35rem',
                        padding: '0.35rem 0.5rem',
                        border: '1px solid rgba(55,65,81,0.75)',
                      }}
                    >
                      <div>{entry.label}</div>
                      {entry.metrics && (
                        <div style={{ opacity: 0.7 }}>
                          {Object.entries(entry.metrics)
                            .map(([key, value]) => `${key}: ${value}`)
                            .join(' · ')}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <button
              type="button"
              onClick={() => {
                logsRef.current = [];
                setLogs([]);
              }}
              style={{
                justifySelf: 'start',
                background: 'rgba(220,38,38,0.25)',
                color: '#fecaca',
                border: '1px solid rgba(248,113,113,0.45)',
                borderRadius: '0.5rem',
                padding: '0.35rem 0.65rem',
                cursor: 'pointer',
              }}
            >
              Clear log
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformanceOverlay;
