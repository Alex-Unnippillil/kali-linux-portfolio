import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';
import { List } from 'react-window';
import type { ListChildComponentProps } from 'react-window';

interface HydraAttempt {
  time: number;
  user: string;
  password: string;
  result: string;
}

interface ProcessedAttempt extends HydraAttempt {
  status: string;
  latency: number;
  timedOut: boolean;
  latencyBucket: string;
}

type PivotDimension = 'status' | 'timeout' | 'latency' | 'time';

interface PivotConfig {
  name: string;
  xDimension: PivotDimension;
  yDimension: PivotDimension;
  bucketSize: number;
}

interface AnalyticsProps {
  attempts: HydraAttempt[];
  target: string;
  service: string;
}

const LATENCY_BUCKETS = [
  { max: 0.25, label: '<250ms' },
  { max: 0.5, label: '250-500ms' },
  { max: 1, label: '0.5-1s' },
  { max: 2, label: '1-2s' },
  { max: 4, label: '2-4s' },
  { max: Infinity, label: '>4s' },
];

const DIMENSION_OPTIONS: Array<{ value: PivotDimension; label: string }> = [
  { value: 'status', label: 'Status' },
  { value: 'timeout', label: 'Timeout bucket' },
  { value: 'latency', label: 'Latency bucket' },
  { value: 'time', label: 'Time bucket' },
];

const STORAGE_KEY = 'hydra/analytics/pivots';

const formatLatencyBucket = (latency: number) => {
  const bucket = LATENCY_BUCKETS.find((b) => latency <= b.max);
  return bucket ? bucket.label : LATENCY_BUCKETS[LATENCY_BUCKETS.length - 1].label;
};

const formatTimeBucket = (time: number, bucketSize: number) => {
  const start = Math.floor(time / bucketSize) * bucketSize;
  const end = start + bucketSize;
  return `${start.toFixed(0)}-${end.toFixed(0)}s`;
};

const colorForValue = (value: number, max: number) => {
  if (max <= 0 || Number.isNaN(value)) {
    return '#1f2937';
  }
  const ratio = value / max;
  const hue = 210 - ratio * 120;
  const lightness = 18 + ratio * 45;
  return `hsl(${hue}, 80%, ${lightness}%)`;
};

const loadPivots = (): PivotConfig[] => {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return [];
    }
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(
      (pivot): pivot is PivotConfig =>
        pivot &&
        typeof pivot.name === 'string' &&
        DIMENSION_OPTIONS.some((option) => option.value === pivot.xDimension) &&
        DIMENSION_OPTIONS.some((option) => option.value === pivot.yDimension) &&
        typeof pivot.bucketSize === 'number'
    );
  } catch {
    return [];
  }
};

const persistPivots = (pivots: PivotConfig[]) => {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pivots));
};

const AnalyticsPanel: React.FC<AnalyticsProps> = ({ attempts = [], target, service }) => {
  const [bucketSize, setBucketSize] = useState<number>(5);
  const [xDimension, setXDimension] = useState<PivotDimension>('status');
  const [yDimension, setYDimension] = useState<PivotDimension>('latency');
  const [pivotName, setPivotName] = useState('');
  const [savedPivots, setSavedPivots] = useState<PivotConfig[]>([]);
  const heatmapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pixelRatioRef = useRef(1);

  useEffect(() => {
    setSavedPivots(loadPivots());
    if (typeof window !== 'undefined') {
      pixelRatioRef.current = window.devicePixelRatio || 1;
    }
  }, []);

  const processedAttempts = useMemo<ProcessedAttempt[]>(() => {
    if (!attempts?.length) {
      return [];
    }
    return attempts.map((attempt, index) => {
      const previous = index > 0 ? attempts[index - 1] : undefined;
      const latency = previous ? Math.max(attempt.time - previous.time, 0) : attempt.time;
      const status = attempt.result || 'attempt';
      const timedOut = latency > 2.5 || status === 'lockout';
      const latencyBucket = formatLatencyBucket(latency);
      return {
        ...attempt,
        status,
        latency,
        timedOut,
        latencyBucket,
      };
    });
  }, [attempts]);

  const totals = useMemo(() => {
    return processedAttempts.reduce(
      (acc, attempt) => {
        acc.total += 1;
        acc.status[attempt.status] = (acc.status[attempt.status] || 0) + 1;
        const timeoutKey = attempt.timedOut ? 'Timed out' : 'Responded';
        acc.timeout[timeoutKey] = (acc.timeout[timeoutKey] || 0) + 1;
        acc.latency[attempt.latencyBucket] =
          (acc.latency[attempt.latencyBucket] || 0) + 1;
        acc.avgLatency += attempt.latency;
        return acc;
      },
      {
        total: 0,
        status: {} as Record<string, number>,
        timeout: {} as Record<string, number>,
        latency: {} as Record<string, number>,
        avgLatency: 0,
      }
    );
  }, [processedAttempts]);

  const averageLatency = processedAttempts.length
    ? totals.avgLatency / processedAttempts.length
    : 0;

  const dimensionValue = useCallback(
    (attempt: ProcessedAttempt, dimension: PivotDimension) => {
      switch (dimension) {
        case 'status':
          return attempt.status;
        case 'timeout':
          return attempt.timedOut ? 'Timeout' : 'Responded';
        case 'latency':
          return attempt.latencyBucket;
        case 'time':
        default:
          return formatTimeBucket(attempt.time, bucketSize);
      }
    },
    [bucketSize]
  );

  const heatmap = useMemo(() => {
    const rowMap = new Map<string, Map<string, number>>();
    const columnSet = new Set<string>();
    processedAttempts.forEach((attempt) => {
      const column = dimensionValue(attempt, xDimension);
      const row = dimensionValue(attempt, yDimension);
      columnSet.add(column);
      if (!rowMap.has(row)) {
        rowMap.set(row, new Map());
      }
      const inner = rowMap.get(row)!;
      inner.set(column, (inner.get(column) || 0) + 1);
    });
    const rows = Array.from(rowMap.keys());
    const columns = Array.from(columnSet.keys());
    const matrix = rows.map((row) => {
      const inner = rowMap.get(row);
      return columns.map((column) => inner?.get(column) || 0);
    });
    const max = matrix.reduce((maxValue, rowValues) => {
      return Math.max(maxValue, ...rowValues);
    }, 0);
    return { rows, columns, matrix, max };
  }, [processedAttempts, dimensionValue, xDimension, yDimension]);

  useEffect(() => {
    const canvas = heatmapCanvasRef.current;
    if (!canvas) {
      return;
    }
    const { rows, columns, matrix, max } = heatmap;
    const cellSize = 36;
    const paddingX = 140;
    const paddingY = 48;
    const width = Math.max(1, columns.length * cellSize + paddingX);
    const height = Math.max(1, rows.length * cellSize + paddingY);
    const ratio = pixelRatioRef.current;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }
    context.scale(ratio, ratio);
    context.fillStyle = '#111827';
    context.fillRect(0, 0, width, height);

    context.font = '12px Inter, system-ui, sans-serif';
    context.fillStyle = '#cbd5f5';

    columns.forEach((column, index) => {
      context.save();
      context.translate(paddingX + index * cellSize + cellSize / 2, 20);
      context.rotate(-Math.PI / 4);
      context.fillText(column, 0, 0);
      context.restore();
    });

    rows.forEach((row, index) => {
      context.fillText(row, 12, paddingY + index * cellSize + cellSize / 2 + 4);
    });

    matrix.forEach((rowValues, rowIndex) => {
      rowValues.forEach((value, columnIndex) => {
        const x = paddingX + columnIndex * cellSize;
        const y = paddingY + rowIndex * cellSize;
        context.fillStyle = colorForValue(value, max);
        context.fillRect(x, y, cellSize - 4, cellSize - 4);
        context.fillStyle = '#f9fafb';
        context.fillText(String(value), x + 8, y + cellSize / 2 + 4);
      });
    });

    return () => {
      context.setTransform(1, 0, 0, 1, 0, 0);
    };
  }, [heatmap]);

  const handleSavePivot = useCallback(() => {
    if (!pivotName.trim()) {
      return;
    }
    const newPivot: PivotConfig = {
      name: pivotName.trim(),
      xDimension,
      yDimension,
      bucketSize,
    };
    setSavedPivots((prev) => {
      const filtered = prev.filter((pivot) => pivot.name !== newPivot.name);
      const updated = [newPivot, ...filtered].slice(0, 8);
      persistPivots(updated);
      return updated;
    });
    setPivotName('');
  }, [pivotName, xDimension, yDimension, bucketSize]);

  const handleLoadPivot = useCallback((pivot: PivotConfig) => {
    setXDimension(pivot.xDimension);
    setYDimension(pivot.yDimension);
    setBucketSize(pivot.bucketSize);
  }, []);

  const handleDeletePivot = useCallback((name: string) => {
    setSavedPivots((prev) => {
      const filtered = prev.filter((pivot) => pivot.name !== name);
      persistPivots(filtered);
      return filtered;
    });
  }, []);

  const handleExportCSV = useCallback(() => {
    const { rows, columns, matrix } = heatmap;
    const header = ['Pivot', ...columns];
    const csvRows = [header];
    rows.forEach((rowLabel, rowIndex) => {
      csvRows.push([
        rowLabel,
        ...matrix[rowIndex].map((value) => value.toString()),
      ]);
    });
    const csvContent = csvRows
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hydra-analytics-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [heatmap]);

  const handleExportHeatmap = useCallback(() => {
    const canvas = heatmapCanvasRef.current;
    if (!canvas) {
      return;
    }
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `hydra-heatmap-${Date.now()}.png`;
    link.click();
  }, []);

  const Row = useCallback(
    ({ index, style }: ListChildComponentProps) => {
      const attempt = processedAttempts[index];
      if (!attempt) {
        return null;
      }
      return (
        <div
          style={style}
          className="grid grid-cols-5 gap-2 px-2 py-2 text-xs border-b border-gray-800"
        >
          <span className="font-mono text-gray-300">{attempt.time.toFixed(1)}s</span>
          <span className="truncate" title={attempt.user}>
            {attempt.user || '—'}
          </span>
          <span className="truncate" title={attempt.password}>
            {attempt.password || '—'}
          </span>
          <span
            className={`px-2 py-1 rounded text-center ${
              attempt.timedOut
                ? 'bg-red-700/60 text-red-100'
                : attempt.status === 'throttled'
                ? 'bg-yellow-700/60 text-yellow-100'
                : 'bg-green-700/60 text-green-100'
            }`}
          >
            {attempt.status}
          </span>
          <span className="text-right font-mono text-gray-200">
            {attempt.latency.toFixed(2)}s
          </span>
        </div>
      );
    },
    [processedAttempts]
  );

  if (!processedAttempts.length) {
    return (
      <section className="mt-6 bg-gray-800/60 border border-gray-700 rounded p-4">
        <h3 className="text-lg font-semibold text-blue-200">Analytics</h3>
        <p className="mt-1 text-sm text-gray-300">
          Run the simulator to populate analytics. Bucketed heatmaps and exports
          appear once attempts are recorded.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-6 bg-gray-800/60 border border-gray-700 rounded p-4">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-blue-200">Analytics</h3>
          <p className="text-xs text-gray-300">
            Target <span className="font-mono text-gray-100">{target || 'n/a'}</span> ·
            Service <span className="font-mono text-gray-100">{service}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-gray-200">
          <span className="px-2 py-1 bg-gray-700/80 rounded">
            {totals.total.toLocaleString()} attempts
          </span>
          <span className="px-2 py-1 bg-gray-700/80 rounded">
            Avg latency {averageLatency.toFixed(2)}s
          </span>
          <span className="px-2 py-1 bg-gray-700/80 rounded">
            {totals.timeout.Timeout || 0} timeouts
          </span>
        </div>
      </header>

      <div className="mt-4 grid gap-4 md:grid-cols-5">
        <div className="md:col-span-2 bg-gray-900/70 border border-gray-700 rounded p-3">
          <h4 className="text-sm font-semibold text-gray-100">Status buckets</h4>
          <ul className="mt-2 space-y-1 text-xs text-gray-300">
            {Object.entries(totals.status).map(([key, value]) => (
              <li key={key} className="flex justify-between">
                <span>{key}</span>
                <span className="font-mono text-gray-100">{value.toLocaleString()}</span>
              </li>
            ))}
          </ul>
          <h4 className="mt-4 text-sm font-semibold text-gray-100">Timeout buckets</h4>
          <ul className="mt-2 space-y-1 text-xs text-gray-300">
            {Object.entries(totals.timeout).map(([key, value]) => (
              <li key={key} className="flex justify-between">
                <span>{key}</span>
                <span className="font-mono text-gray-100">{value.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="md:col-span-3 bg-gray-900/70 border border-gray-700 rounded p-3">
          <h4 className="text-sm font-semibold text-gray-100">Latency buckets</h4>
          <ul className="mt-2 space-y-1 text-xs text-gray-300">
            {Object.entries(totals.latency).map(([key, value]) => (
              <li key={key} className="flex justify-between">
                <span>{key}</span>
                <span className="font-mono text-gray-100">{value.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6 bg-gray-900/70 border border-gray-700 rounded">
        <div className="px-3 py-2 border-b border-gray-800 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-100">Attempt stream</h4>
          <span className="text-xs text-gray-300">Virtualized for large data sets</span>
        </div>
        <div className="h-72">
          <AutoSizer>
            {({ height, width }) => (
              <List
                height={height}
                width={width}
                itemCount={processedAttempts.length}
                itemSize={48}
              >
                {Row}
              </List>
            )}
          </AutoSizer>
        </div>
      </div>

      <div className="mt-6 bg-gray-900/70 border border-gray-700 rounded p-3">
        <div className="flex flex-col lg:flex-row lg:items-end gap-3">
          <div className="flex flex-col text-xs text-gray-200">
            <label className="mb-1" htmlFor="hydra-analytics-x">
              X axis
            </label>
            <select
              id="hydra-analytics-x"
              value={xDimension}
              onChange={(event) =>
                setXDimension(event.target.value as PivotDimension)
              }
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1"
            >
              {DIMENSION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col text-xs text-gray-200">
            <label className="mb-1" htmlFor="hydra-analytics-y">
              Y axis
            </label>
            <select
              id="hydra-analytics-y"
              value={yDimension}
              onChange={(event) =>
                setYDimension(event.target.value as PivotDimension)
              }
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1"
            >
              {DIMENSION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col text-xs text-gray-200">
            <label className="mb-1" htmlFor="hydra-analytics-bucket">
              Time bucket (seconds)
            </label>
            <input
              id="hydra-analytics-bucket"
              type="number"
              min={1}
              max={60}
              value={bucketSize}
              onChange={(event) =>
                setBucketSize(Math.max(1, Number(event.target.value) || 1))
              }
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1"
              aria-label="Time bucket in seconds"
            />
          </div>
          <div className="flex-1" />
          <div className="flex flex-col text-xs text-gray-200">
            <label className="mb-1" htmlFor="hydra-analytics-pivot">
              Save pivot preset
            </label>
            <div className="flex gap-2">
              <input
                id="hydra-analytics-pivot"
                type="text"
                value={pivotName}
                placeholder="Name"
                onChange={(event) => setPivotName(event.target.value)}
                className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1"
                aria-label="Pivot preset name"
              />
              <button
                onClick={handleSavePivot}
                className="px-3 py-1 bg-blue-600 text-white rounded"
              >
                Save
              </button>
            </div>
          </div>
        </div>

        {savedPivots.length > 0 && (
          <div className="mt-3 text-xs text-gray-200">
            <h5 className="font-semibold text-gray-100">Saved pivots</h5>
            <ul className="mt-2 space-y-1">
              {savedPivots.map((pivot) => (
                <li
                  key={pivot.name}
                  className="flex items-center justify-between bg-gray-800/80 border border-gray-700 rounded px-2 py-1"
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-100">{pivot.name}</span>
                    <span className="text-[10px] text-gray-400">
                      X: {pivot.xDimension} · Y: {pivot.yDimension} · Bucket:{' '}
                      {pivot.bucketSize}s
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleLoadPivot(pivot)}
                      className="px-2 py-1 bg-gray-700 rounded"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => handleDeletePivot(pivot.name)}
                      className="px-2 py-1 bg-red-600 text-white rounded"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4 overflow-auto">
          <canvas ref={heatmapCanvasRef} aria-label="Heatmap visualization" />
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <button
            onClick={handleExportHeatmap}
            className="px-3 py-1 bg-purple-600 text-white rounded"
          >
            Export heatmap (PNG)
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3 py-1 bg-blue-600 text-white rounded"
          >
            Export aggregations (CSV)
          </button>
        </div>
      </div>
    </section>
  );
};

export default AnalyticsPanel;
