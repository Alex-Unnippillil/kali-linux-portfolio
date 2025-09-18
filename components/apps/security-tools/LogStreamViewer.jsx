import React, { useEffect, useMemo, useRef, useState } from 'react';
import VirtualList from 'rc-virtual-list';
import { getRegisteredLogSchema } from './logSchemaRegistry';

const DEFAULT_HEIGHT = 360;
const DEFAULT_ITEM_HEIGHT = 88;
const DEFAULT_BUFFER_OPTIONS = [100, 250, 500];
const LEVEL_COLORS = {
  info: 'text-green-400',
  notice: 'text-blue-300',
  warning: 'text-yellow-300',
  critical: 'text-red-400',
};

const pickLevel = () => {
  const roll = Math.random();
  if (roll > 0.9) return 'critical';
  if (roll > 0.75) return 'warning';
  if (roll > 0.55) return 'notice';
  return 'info';
};

const trimBuffer = (entries, cap) => {
  if (entries.length <= cap) return entries;
  return entries.slice(entries.length - cap);
};

const formatTimestamp = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleTimeString([], {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const ensureIntervalCleared = (ref) => {
  if (ref.current != null) {
    clearInterval(ref.current);
    ref.current = null;
  }
};

const useStableId = () => {
  const idRef = useRef(null);
  if (idRef.current === null) {
    idRef.current = `log-${Math.random().toString(36).slice(2, 8)}`;
  }
  return idRef.current;
};

export default function LogStreamViewer({
  schemaName,
  fixtures,
  height = DEFAULT_HEIGHT,
  itemHeight = DEFAULT_ITEM_HEIGHT,
  intervalMs = 1200,
  bufferOptions = DEFAULT_BUFFER_OPTIONS,
}) {
  const config = getRegisteredLogSchema(schemaName);

  if (!config) {
    throw new Error(`Log schema "${schemaName}" has not been registered`);
  }

  const { schema, timestampKey, fields } = config;
  const [bufferCap, setBufferCap] = useState(bufferOptions[1] ?? bufferOptions[0]);
  const [paused, setPaused] = useState(false);
  const [logs, setLogs] = useState([]);

  const listRef = useRef(null);
  const intervalRef = useRef(null);
  const pointerRef = useRef(0);
  const counterRef = useRef(0);
  const streamId = useStableId();

  const sanitizedFixtures = useMemo(() => {
    return fixtures
      .map((entry) => {
        const parsed = schema.safeParse(entry);
        if (!parsed.success) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn(`[security-tools] Dropped invalid ${schemaName} log`, parsed.error.flatten());
          }
          return null;
        }
        return parsed.data;
      })
      .filter(Boolean);
  }, [fixtures, schema, schemaName]);

  useEffect(() => {
    pointerRef.current = 0;
    setLogs([]);
    ensureIntervalCleared(intervalRef);
  }, [sanitizedFixtures]);

  useEffect(() => {
    setLogs((prev) => trimBuffer([...prev], bufferCap));
  }, [bufferCap]);

  useEffect(() => {
    if (paused || sanitizedFixtures.length === 0) {
      ensureIntervalCleared(intervalRef);
      return () => {};
    }

    const emit = () => {
      const base = sanitizedFixtures[pointerRef.current % sanitizedFixtures.length];
      pointerRef.current += 1;
      counterRef.current += 1;

      const entry = {
        ...base,
        [timestampKey]: new Date().toISOString(),
        level: pickLevel(),
        __id: `${streamId}-${counterRef.current}`,
      };

      setLogs((prev) => trimBuffer([...prev, entry], bufferCap));
    };

    emit();
    intervalRef.current = window.setInterval(emit, intervalMs);

    return () => {
      ensureIntervalCleared(intervalRef);
    };
  }, [paused, sanitizedFixtures, bufferCap, intervalMs, timestampKey, streamId]);

  useEffect(() => {
    if (!paused && logs.length && listRef.current) {
      listRef.current.scrollTo({ index: logs.length - 1, align: 'bottom' });
    }
  }, [logs, paused]);

  useEffect(() => () => ensureIntervalCleared(intervalRef), []);

  const togglePaused = () => {
    setPaused((prev) => !prev);
  };

  return (
    <div className="rounded border border-ubc-600 bg-black/40 p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-[11px] uppercase text-slate-300">
        <span>
          Streaming {schemaName} logs ({logs.length}/{bufferCap})
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1">
            Buffer
            <select
              className="rounded bg-ub-cool-grey px-1 py-0.5 text-white"
              value={bufferCap}
              onChange={(event) => setBufferCap(Number(event.target.value))}
            >
              {bufferOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={togglePaused}
            className={`rounded px-2 py-0.5 text-xs font-semibold ${
              paused ? 'bg-ub-yellow text-black' : 'bg-ub-green text-black'
            }`}
            type="button"
          >
            {paused ? 'Resume' : 'Pause'}
          </button>
        </div>
      </div>
      <div className="relative" style={{ height }}>
        <VirtualList
          ref={listRef}
          data={logs}
          height={height}
          itemHeight={itemHeight}
          itemKey="__id"
          className="grid gap-2 overflow-auto"
        >
          {(log) => (
            <article
              key={log.__id}
              className="rounded border border-ubc-500 bg-ubc-800/70 p-2 text-xs text-slate-100"
            >
              <header className="mb-1 flex items-center justify-between text-[10px] font-semibold">
                <span className="text-slate-300">{formatTimestamp(log[timestampKey])}</span>
                <span className={`${LEVEL_COLORS[log.level] || 'text-slate-200'} uppercase`}>
                  {log.level}
                </span>
              </header>
              <dl className="grid grid-cols-[minmax(0,120px)_1fr] gap-x-2 gap-y-1">
                {fields
                  .filter((field) => field.key !== timestampKey)
                  .map((field) => (
                    <React.Fragment key={field.key}>
                      <dt className="text-[10px] uppercase tracking-wide text-slate-400">{field.label}</dt>
                      <dd className="break-all text-xs text-slate-100">
                        {log[field.key] != null ? String(log[field.key]) : '-'}
                      </dd>
                    </React.Fragment>
                  ))}
              </dl>
            </article>
          )}
        </VirtualList>
        {!logs.length && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-slate-400">
            Waiting for new events...
          </div>
        )}
      </div>
      <p className="mt-3 text-[10px] text-slate-400">
        Stream is simulated from local fixtures. Pausing halts the emitter and auto-scroll to conserve resources.
      </p>
    </div>
  );
}

