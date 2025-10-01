import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

export type BackoffCurve =
  | 'none'
  | 'linear'
  | 'exponential'
  | 'progressive'
  | 'custom';

export interface CustomCurvePoint {
  attempt: number;
  delayMs: number;
}

export interface ThrottleConfig {
  curve: BackoffCurve;
  throttleAfter: number;
  lockoutAfter: number;
  baseDelayMs: number;
  linearStepMs: number;
  exponentialMultiplier: number;
  progressiveStepMs: number;
  maxDelayMs: number;
  jitterRatio: number;
  attemptCount: number;
  customCurve?: CustomCurvePoint[];
}

export interface TimelinePoint {
  attempt: number;
  delayMs: number;
  elapsedMs: number;
  status: 'attempt' | 'throttled' | 'locked';
}

export const defaultThrottleConfig: ThrottleConfig = {
  curve: 'exponential',
  throttleAfter: 5,
  lockoutAfter: 10,
  baseDelayMs: 500,
  linearStepMs: 250,
  exponentialMultiplier: 2,
  progressiveStepMs: 200,
  maxDelayMs: 4000,
  jitterRatio: 0,
  attemptCount: 20,
  customCurve: [],
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const pseudoRandom = (seed: number) => {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

const normalizeConfig = (config?: Partial<ThrottleConfig>): ThrottleConfig => ({
  ...defaultThrottleConfig,
  ...(config || {}),
  throttleAfter:
    config?.throttleAfter !== undefined
      ? Math.max(0, Math.floor(config.throttleAfter))
      : defaultThrottleConfig.throttleAfter,
  lockoutAfter:
    config?.lockoutAfter !== undefined
      ? Math.max(1, Math.floor(config.lockoutAfter))
      : defaultThrottleConfig.lockoutAfter,
  attemptCount:
    config?.attemptCount !== undefined
      ? clamp(Math.floor(config.attemptCount), 1, 5000)
      : defaultThrottleConfig.attemptCount,
});

export const calculateDelayMs = (
  attempt: number,
  rawConfig?: Partial<ThrottleConfig>
): number => {
  const config = normalizeConfig(rawConfig);
  const {
    throttleAfter,
    baseDelayMs,
    linearStepMs,
    exponentialMultiplier,
    progressiveStepMs,
    maxDelayMs,
    jitterRatio,
    customCurve,
  } = config;

  if (attempt <= 1) {
    return 0;
  }

  let delay = baseDelayMs;

  if (attempt > throttleAfter && throttleAfter >= 0) {
    const stepIndex = attempt - throttleAfter;
    switch (config.curve) {
      case 'none':
        delay = baseDelayMs;
        break;
      case 'linear':
        delay = baseDelayMs + (stepIndex - 1) * linearStepMs;
        break;
      case 'exponential':
        delay = baseDelayMs * Math.pow(exponentialMultiplier, stepIndex - 1);
        break;
      case 'progressive': {
        const linearPhase = Math.min(stepIndex - 1, 3);
        const progressiveBase = baseDelayMs + linearPhase * progressiveStepMs;
        const remaining = stepIndex - 1 - linearPhase;
        delay =
          remaining > 0
            ? progressiveBase * Math.pow(exponentialMultiplier, remaining)
            : progressiveBase;
        break;
      }
      case 'custom': {
        const sorted = [...(customCurve || [])].sort(
          (a, b) => a.attempt - b.attempt
        );
        const direct = sorted.find((point) => point.attempt === attempt);
        if (direct) {
          delay = direct.delayMs;
        } else {
          const previous = [...sorted]
            .reverse()
            .find((point) => point.attempt < attempt);
          delay = previous ? previous.delayMs : baseDelayMs;
        }
        break;
      }
      default:
        delay = baseDelayMs;
    }
  }

  if (maxDelayMs > 0) {
    delay = Math.min(delay, maxDelayMs);
  }

  if (jitterRatio > 0) {
    const random = pseudoRandom(attempt);
    const jitter = (random - 0.5) * 2 * jitterRatio * delay;
    delay = Math.max(0, delay + jitter);
  }

  return Math.round(delay);
};

export const generateTimeline = (
  rawConfig?: Partial<ThrottleConfig>
): TimelinePoint[] => {
  const config = normalizeConfig(rawConfig);
  const { attemptCount, lockoutAfter, throttleAfter } = config;
  const timeline: TimelinePoint[] = [];
  let elapsed = 0;

  for (let attempt = 1; attempt <= attemptCount; attempt += 1) {
    const delayMs = calculateDelayMs(attempt, config);
    if (attempt > 1) {
      elapsed += delayMs;
    }
    const status: TimelinePoint['status'] =
      attempt >= lockoutAfter
        ? 'locked'
        : attempt > throttleAfter
        ? 'throttled'
        : 'attempt';

    timeline.push({
      attempt,
      delayMs,
      elapsedMs: elapsed,
      status,
    });

    if (attempt >= lockoutAfter) {
      break;
    }
  }

  return timeline;
};

const formatCustomCurve = (curve: CustomCurvePoint[] = []) =>
  curve
    .map((point) => `${point.attempt}:${point.delayMs}`)
    .join('\n');

const parseCustomCurve = (value: string): CustomCurvePoint[] => {
  if (!value.trim()) {
    return [];
  }
  return value
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [attemptStr, delayStr] = line.split(':');
      const attempt = Math.max(1, parseInt(attemptStr, 10));
      const delayMs = Math.max(0, parseFloat(delayStr));
      return { attempt, delayMs };
    })
    .sort((a, b) => a.attempt - b.attempt);
};

interface ThrottlePanelProps {
  config: ThrottleConfig;
  onConfigChange: (config: ThrottleConfig) => void;
  recordedAttempts?: { time: number; result?: string }[];
}

const PRESETS: { key: string; label: string; description: string; config: Partial<ThrottleConfig> }[] = [
  {
    key: 'default',
    label: 'Default Expo (Kali demo)',
    description:
      'Matches the built-in Hydra simulation: exponential slowdown after five tries and lockout after ten.',
    config: {},
  },
  {
    key: 'cloud',
    label: 'Cloud IAM Lockout',
    description:
      'Aggressive throttling after three attempts with a long cool-down and lockout after five.',
    config: {
      throttleAfter: 3,
      lockoutAfter: 5,
      baseDelayMs: 750,
      maxDelayMs: 8000,
      exponentialMultiplier: 3,
      attemptCount: 8,
    },
  },
  {
    key: 'legacy',
    label: 'Legacy VPN Spray',
    description:
      'Gentle linear increase used to illustrate older VPN behaviours with a soft lockout.',
    config: {
      curve: 'linear',
      throttleAfter: 6,
      lockoutAfter: 12,
      baseDelayMs: 300,
      linearStepMs: 200,
      maxDelayMs: 3000,
      attemptCount: 15,
    },
  },
  {
    key: 'custom',
    label: 'Custom Teaching Plan',
    description:
      'Start from scratch with a blank custom curve for guided lessons.',
    config: {
      curve: 'custom',
      customCurve: [
        { attempt: 1, delayMs: 0 },
        { attempt: 5, delayMs: 600 },
        { attempt: 8, delayMs: 2200 },
      ],
      throttleAfter: 4,
      lockoutAfter: 9,
      attemptCount: 12,
    },
  },
];

const ROW_HEIGHT = 28;

const ThrottlePanel: React.FC<ThrottlePanelProps> = ({
  config,
  onConfigChange,
  recordedAttempts = [],
}) => {
  const normalizedConfig = normalizeConfig(config);
  const [presetKey, setPresetKey] = useState('default');
  const [customCurveText, setCustomCurveText] = useState(() =>
    formatCustomCurve(normalizedConfig.customCurve)
  );
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');
  const [exportStatus, setExportStatus] = useState('');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(260);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    setCustomCurveText(formatCustomCurve(normalizedConfig.customCurve));
  }, [normalizedConfig.customCurve]);

  const timeline = useMemo(() => generateTimeline(normalizedConfig), [
    normalizedConfig,
  ]);

  useLayoutEffect(() => {
    if (containerRef.current) {
      setContainerHeight(containerRef.current.clientHeight || 260);
    }
  }, [timeline.length]);

  const totalHeight = timeline.length * ROW_HEIGHT;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 1);
  const visibleCount = Math.ceil(containerHeight / ROW_HEIGHT) + 3;
  const endIndex = Math.min(timeline.length, startIndex + visibleCount);
  const offsetY = startIndex * ROW_HEIGHT;
  const visibleItems = timeline.slice(startIndex, endIndex);

  const handleConfigChange = useCallback(
    (partial: Partial<ThrottleConfig>) => {
      const merged = normalizeConfig({ ...normalizedConfig, ...partial });
      onConfigChange(merged);
    },
    [normalizedConfig, onConfigChange]
  );

  const handlePreset = useCallback(
    (key: string) => {
      setPresetKey(key);
      const preset = PRESETS.find((item) => item.key === key);
      if (preset) {
        handleConfigChange({ ...preset.config });
      }
    },
    [handleConfigChange]
  );

  const handleCurveChange = useCallback(
    (value: BackoffCurve) => {
      handleConfigChange({ curve: value });
    },
    [handleConfigChange]
  );

  const handleImport = useCallback(() => {
    setImportError('');
    try {
      const parsed = JSON.parse(importText);
      handleConfigChange(parsed);
      setPresetKey('');
    } catch (error) {
      setImportError('Unable to parse JSON. Ensure the structure matches the throttle config.');
    }
  }, [handleConfigChange, importText]);

  const handleExport = useCallback(async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(
          JSON.stringify(normalizedConfig, null, 2)
        );
        setExportStatus('Copied to clipboard');
        setTimeout(() => setExportStatus(''), 2000);
      }
    } catch (error) {
      setExportStatus('Clipboard unavailable');
    }
  }, [normalizedConfig]);

  const applyCustomCurve = useCallback(() => {
    const curve = parseCustomCurve(customCurveText);
    handleConfigChange({ customCurve: curve });
  }, [customCurveText, handleConfigChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const width = canvas.parentElement?.clientWidth || 520;
    const height = 150;
    const ratio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    if ('resetTransform' in context) {
      context.resetTransform();
    } else {
      context.setTransform(1, 0, 0, 1, 0, 0);
    }
    context.scale(ratio, ratio);
    context.fillStyle = '#111827';
    context.fillRect(0, 0, width, height);

    if (!timeline.length) {
      return;
    }

    const maxElapsed = timeline[timeline.length - 1].elapsedMs || 1;
    const chartHeight = height - 30;

    timeline.forEach((point) => {
      const x = (point.elapsedMs / maxElapsed) * (width - 32) + 16;
      const color =
        point.status === 'locked'
          ? '#f87171'
          : point.status === 'throttled'
          ? '#fbbf24'
          : '#34d399';
      context.strokeStyle = color;
      context.beginPath();
      context.moveTo(x, 16);
      context.lineTo(x, chartHeight);
      context.stroke();
    });

    context.fillStyle = '#9ca3af';
    context.font = '12px monospace';
    context.fillText(
      `Elapsed ${(maxElapsed / 1000).toFixed(1)}s across ${timeline.length} attempts`,
      16,
      height - 10
    );

    if (recordedAttempts.length) {
      const overlayColor = 'rgba(59, 130, 246, 0.8)';
      context.fillStyle = overlayColor;
      recordedAttempts.forEach((attempt) => {
        const x = (attempt.time / (maxElapsed / 1000)) * (width - 32) + 16;
        const clampedX = Number.isFinite(x) ? clamp(x, 16, width - 16) : 16;
        context.beginPath();
        context.arc(clampedX, chartHeight - 12, 3, 0, Math.PI * 2);
        context.fill();
      });
    }
  }, [timeline, recordedAttempts]);

  return (
    <section className="mt-6 rounded-lg bg-gray-800 p-4 text-sm" aria-label="Throttle configuration panel">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-lg font-semibold text-white">Throttle Planner</h3>
        <div className="flex items-center gap-2">
          <label className="text-gray-300" htmlFor="throttle-preset">
            Preset
          </label>
          <select
            id="throttle-preset"
            className="rounded bg-gray-900 p-1 text-white"
            value={presetKey}
            onChange={(event) => handlePreset(event.target.value)}
          >
            {PRESETS.map((preset) => (
              <option key={preset.key} value={preset.key}>
                {preset.label}
              </option>
            ))}
            <option value="">Custom</option>
          </select>
        </div>
        <button
          type="button"
          className="rounded bg-blue-600 px-3 py-1 text-white"
          onClick={handleExport}
        >
          Export JSON
        </button>
        <div aria-live="polite" className="text-green-400">
          {exportStatus}
        </div>
      </div>

      <p className="mt-2 text-gray-300">
        Adjust throttling behaviour to explain how Hydra respects account safety controls. The canvas shows relative spacing,
        and the table virtualises large timelines so you can explore scenarios with up to five thousand attempts.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-3">
          <div>
            <label className="block text-gray-300" htmlFor="curve-select">
              Backoff curve
            </label>
            <select
              id="curve-select"
              className="mt-1 w-full rounded bg-gray-900 p-2 text-white"
              value={normalizedConfig.curve}
              onChange={(event) => handleCurveChange(event.target.value as BackoffCurve)}
            >
              <option value="none">None</option>
              <option value="linear">Linear</option>
              <option value="exponential">Exponential</option>
              <option value="progressive">Progressive hybrid</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-gray-300">Throttle after</span>
              <input
                type="number"
                min={0}
                className="mt-1 w-full rounded bg-gray-900 p-2 text-white"
                value={normalizedConfig.throttleAfter}
                onChange={(event) =>
                  handleConfigChange({ throttleAfter: Number(event.target.value) })
                }
              />
            </label>
            <label className="block">
              <span className="text-gray-300">Lockout after</span>
              <input
                type="number"
                min={1}
                className="mt-1 w-full rounded bg-gray-900 p-2 text-white"
                value={normalizedConfig.lockoutAfter}
                onChange={(event) =>
                  handleConfigChange({ lockoutAfter: Number(event.target.value) })
                }
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-gray-300">Base delay (ms)</span>
              <input
                type="number"
                min={0}
                className="mt-1 w-full rounded bg-gray-900 p-2 text-white"
                value={normalizedConfig.baseDelayMs}
                onChange={(event) =>
                  handleConfigChange({ baseDelayMs: Number(event.target.value) })
                }
              />
            </label>
            <label className="block">
              <span className="text-gray-300">Max delay (ms)</span>
              <input
                type="number"
                min={0}
                className="mt-1 w-full rounded bg-gray-900 p-2 text-white"
                value={normalizedConfig.maxDelayMs}
                onChange={(event) =>
                  handleConfigChange({ maxDelayMs: Number(event.target.value) })
                }
              />
            </label>
          </div>
          {normalizedConfig.curve === 'linear' && (
            <label className="block">
              <span className="text-gray-300">Linear step (ms)</span>
              <input
                type="number"
                min={0}
                className="mt-1 w-full rounded bg-gray-900 p-2 text-white"
                value={normalizedConfig.linearStepMs}
                onChange={(event) =>
                  handleConfigChange({ linearStepMs: Number(event.target.value) })
                }
              />
            </label>
          )}
          {normalizedConfig.curve === 'exponential' && (
            <label className="block">
              <span className="text-gray-300">Multiplier</span>
              <input
                type="number"
                step={0.1}
                min={1}
                className="mt-1 w-full rounded bg-gray-900 p-2 text-white"
                value={normalizedConfig.exponentialMultiplier}
                onChange={(event) =>
                  handleConfigChange({
                    exponentialMultiplier: Number(event.target.value) || 1,
                  })
                }
              />
            </label>
          )}
          {normalizedConfig.curve === 'progressive' && (
            <label className="block">
              <span className="text-gray-300">Progressive step (ms)</span>
              <input
                type="number"
                min={0}
                className="mt-1 w-full rounded bg-gray-900 p-2 text-white"
                value={normalizedConfig.progressiveStepMs}
                onChange={(event) =>
                  handleConfigChange({ progressiveStepMs: Number(event.target.value) })
                }
              />
            </label>
          )}
          <label className="block">
            <span className="text-gray-300">Jitter ratio (0-1)</span>
            <input
              type="number"
              step={0.05}
              min={0}
              max={1}
              className="mt-1 w-full rounded bg-gray-900 p-2 text-white"
              value={normalizedConfig.jitterRatio}
              onChange={(event) =>
                handleConfigChange({ jitterRatio: Number(event.target.value) })
              }
            />
          </label>
          <label className="block">
            <span className="text-gray-300">Simulated attempts</span>
            <input
              type="number"
              min={1}
              max={5000}
              className="mt-1 w-full rounded bg-gray-900 p-2 text-white"
              value={normalizedConfig.attemptCount}
              onChange={(event) =>
                handleConfigChange({ attemptCount: Number(event.target.value) })
              }
            />
          </label>
          <div>
            <label className="block text-gray-300" htmlFor="import-json">
              Import JSON
            </label>
            <textarea
              id="import-json"
              className="mt-1 h-24 w-full rounded bg-gray-900 p-2 font-mono text-xs text-white"
              value={importText}
              onChange={(event) => setImportText(event.target.value)}
              placeholder="Paste a throttle config JSON blob here"
            />
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                className="rounded bg-green-600 px-3 py-1 text-white"
                onClick={handleImport}
              >
                Load JSON
              </button>
              {importError && <span className="text-red-400">{importError}</span>}
            </div>
          </div>
        </div>
        <div>
          <canvas
            ref={canvasRef}
            role="img"
            aria-label="Timeline visualisation"
            className="w-full rounded bg-gray-900"
          />
          <div className="mt-3 text-gray-300">
            {PRESETS.find((item) => item.key === presetKey)?.description ||
              'Custom configuration for advanced lessons.'}
          </div>
          {normalizedConfig.curve === 'custom' && (
            <div className="mt-3">
              <label className="block text-gray-300" htmlFor="custom-curve">
                Custom curve (attempt:delay)
              </label>
              <textarea
                id="custom-curve"
                className="mt-1 h-32 w-full rounded bg-gray-900 p-2 font-mono text-xs text-white"
                value={customCurveText}
                onChange={(event) => setCustomCurveText(event.target.value)}
              />
              <button
                type="button"
                className="mt-2 rounded bg-purple-600 px-3 py-1 text-white"
                onClick={applyCustomCurve}
              >
                Apply custom curve
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 text-gray-300">
        <strong>Simulated timeline:</strong> {timeline.length} events,{' '}
        {(timeline[timeline.length - 1]?.elapsedMs || 0) / 1000}s total elapsed before lockout.
      </div>

      <div
        ref={containerRef}
        className="mt-3 max-h-64 overflow-y-auto rounded border border-gray-700 bg-gray-900"
        onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
        data-testid="timeline-container"
      >
        <div style={{ height: totalHeight }}>
          <div style={{ transform: `translateY(${offsetY}px)` }}>
            {visibleItems.map((item) => (
              <div
                key={item.attempt}
                className="grid grid-cols-4 gap-2 border-b border-gray-800 px-3 py-1 text-xs text-gray-200"
                data-testid="timeline-row"
              >
                <span># {item.attempt}</span>
                <span>{(item.delayMs / 1000).toFixed(2)}s delay</span>
                <span>{(item.elapsedMs / 1000).toFixed(2)}s total</span>
                <span
                  className={
                    item.status === 'locked'
                      ? 'text-red-400'
                      : item.status === 'throttled'
                      ? 'text-yellow-400'
                      : 'text-green-400'
                  }
                >
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ThrottlePanel;
