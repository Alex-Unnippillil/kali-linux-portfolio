'use client';

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';

export interface RequestChartPoint {
  time: number;
  value: number;
}

interface RequestChartProps {
  data: RequestChartPoint[];
  label: string;
  rangeLabel: string;
  rangeMs: number;
  currentTime: number;
  unit?: string;
}

const CHART_WIDTH = 320;
const CHART_HEIGHT = 160;
const CHART_PADDING = 16;
const GRID_LINE_COUNT = 4;

const relativeTimeFormatter = new Intl.RelativeTimeFormat('en', {
  numeric: 'auto',
});

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const formatRelativeTime = (diffMs: number) => {
  if (!Number.isFinite(diffMs) || diffMs <= 0) return 'just now';
  if (diffMs < 60_000) {
    const seconds = Math.max(1, Math.round(diffMs / 1000));
    return relativeTimeFormatter.format(-seconds, 'second');
  }
  if (diffMs < 3_600_000) {
    const minutes = Math.max(1, Math.round(diffMs / 60_000));
    return relativeTimeFormatter.format(-minutes, 'minute');
  }
  const hours = Math.max(1, Math.round(diffMs / 3_600_000));
  return relativeTimeFormatter.format(-hours, 'hour');
};

export default function RequestChart({
  data,
  label,
  rangeLabel,
  rangeMs,
  currentTime,
  unit = 'ms',
}: RequestChartProps) {
  const figureTitleId = useId();
  const svgTitleId = useId();
  const svgDescId = useId();
  const summaryId = useId();

  const sanitizedData = useMemo(
    () =>
      data
        .filter((point) => Number.isFinite(point.value))
        .sort((a, b) => a.time - b.time),
    [data],
  );

  const domainStart = currentTime - rangeMs;
  const domainSpan = Math.max(rangeMs, 1);

  const values = sanitizedData.map((point) => point.value);
  const maxValue = values.length > 0 ? Math.max(...values) : 1;
  const minValue = values.length > 0 ? Math.min(...values) : 0;

  const normalizedPoints = useMemo(
    () =>
      sanitizedData.map((point) => {
        const xRatio = clamp((point.time - domainStart) / domainSpan, 0, 1);
        const svgX =
          CHART_PADDING + xRatio * (CHART_WIDTH - CHART_PADDING * 2);

        const yRatio =
          maxValue === minValue
            ? 0.5
            : clamp((point.value - minValue) / (maxValue - minValue), 0, 1);
        const svgY =
          CHART_PADDING +
          (1 - yRatio) * (CHART_HEIGHT - CHART_PADDING * 2);

        return {
          ...point,
          svgX,
          svgY,
          xPercent: (svgX / CHART_WIDTH) * 100,
          yPercent: (svgY / CHART_HEIGHT) * 100,
        };
      }),
    [sanitizedData, domainSpan, domainStart, maxValue, minValue],
  );

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const pointRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    pointRefs.current = pointRefs.current.slice(0, normalizedPoints.length);
  }, [normalizedPoints.length]);

  useEffect(() => {
    setHoverIndex((prev) =>
      prev != null && prev >= normalizedPoints.length ? null : prev,
    );
    setFocusIndex((prev) =>
      prev != null && prev >= normalizedPoints.length ? null : prev,
    );
  }, [normalizedPoints.length]);

  const activeIndex = hoverIndex ?? focusIndex ?? null;
  const activePoint =
    activeIndex != null ? normalizedPoints[activeIndex] : null;

  const summary = useMemo(() => {
    if (values.length === 0) {
      return `No request data captured in the ${rangeLabel}.`;
    }
    const total = values.reduce((sum, value) => sum + value, 0);
    const average = total / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    return `${values.length} requests in the ${rangeLabel}. Minimum ${min.toFixed(
      0,
    )} ${unit}, maximum ${max.toFixed(0)} ${unit}, average ${average.toFixed(
      0,
    )} ${unit}.`;
  }, [rangeLabel, unit, values]);

  const pathData = useMemo(() => {
    if (normalizedPoints.length === 0) return '';
    return normalizedPoints
      .map((point, index) =>
        `${index === 0 ? 'M' : 'L'} ${point.svgX} ${point.svgY}`,
      )
      .join(' ');
  }, [normalizedPoints]);

  const gridLines = useMemo(() => {
    return Array.from({ length: GRID_LINE_COUNT }, (_, index) => {
      const ratio = (index + 1) / (GRID_LINE_COUNT + 1);
      const y =
        CHART_PADDING + (1 - ratio) * (CHART_HEIGHT - CHART_PADDING * 2);
      return (
        <line
          key={`grid-${index}`}
          x1={CHART_PADDING}
          x2={CHART_WIDTH - CHART_PADDING}
          y1={y}
          y2={y}
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={1}
        />
      );
    });
  }, []);

  const handleKeyNavigation = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (normalizedPoints.length === 0) return;

    const moveFocus = (targetIndex: number) => {
      const nextIndex = clamp(targetIndex, 0, normalizedPoints.length - 1);
      pointRefs.current[nextIndex]?.focus();
    };

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        moveFocus(index + 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        moveFocus(index - 1);
        break;
      case 'Home':
        event.preventDefault();
        moveFocus(0);
        break;
      case 'End':
        event.preventDefault();
        moveFocus(normalizedPoints.length - 1);
        break;
      default:
        break;
    }
  };

  return (
    <figure
      className="w-full max-w-[360px] text-white"
      role="group"
      aria-labelledby={figureTitleId}
      aria-describedby={summaryId}
    >
      <figcaption id={figureTitleId} className="mb-2 text-sm font-semibold">
        {label}
      </figcaption>
      <div className="relative w-full min-h-[190px] rounded border border-gray-700 bg-[var(--kali-panel)]">
        <svg
          className="h-full w-full"
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          role="img"
          aria-labelledby={`${svgTitleId} ${svgDescId}`}
          preserveAspectRatio="none"
        >
          <title id={svgTitleId}>{label}</title>
          <desc id={svgDescId}>{summary}</desc>
          <rect
            x={0}
            y={0}
            width={CHART_WIDTH}
            height={CHART_HEIGHT}
            fill="transparent"
          />
          {gridLines}
          {pathData && (
            <path d={pathData} fill="none" stroke="#00ff00" strokeWidth={2} />
          )}
          {normalizedPoints.map((point, index) => (
            <circle
              key={`marker-${point.time}-${index}`}
              cx={point.svgX}
              cy={point.svgY}
              r={3}
              fill="#00ff00"
              opacity={0.35}
            />
          ))}
        </svg>
        {normalizedPoints.length > 0 && (
          <div className="absolute inset-0">
            {normalizedPoints.map((point, index) => {
              const relativeDiff = Math.max(0, currentTime - point.time);
              const valueLabel = `${point.value.toFixed(0)} ${unit}`;
              const timeLabel = formatRelativeTime(relativeDiff);
              return (
                <button
                  key={`point-${point.time}-${index}`}
                  type="button"
                  aria-label={`Request ${index + 1}, ${valueLabel}, ${timeLabel}.`}
                  title={`${valueLabel} • ${timeLabel}`}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/60 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00ff00] ${
                    activeIndex === index
                      ? 'bg-[#00ff00]'
                      : 'bg-[#00ff00]/70'
                  }`}
                  style={{
                    left: `${point.xPercent}%`,
                    top: `${point.yPercent}%`,
                    width: '12px',
                    height: '12px',
                  }}
                  onFocus={() => setFocusIndex(index)}
                  onBlur={() =>
                    setFocusIndex((prev) => (prev === index ? null : prev))
                  }
                  onMouseEnter={() => setHoverIndex(index)}
                  onMouseLeave={() =>
                    setHoverIndex((prev) => (prev === index ? null : prev))
                  }
                  onKeyDown={(event) => handleKeyNavigation(event, index)}
                  ref={(el) => {
                    pointRefs.current[index] = el;
                  }}
                />
              );
            })}
          </div>
        )}
        {activePoint && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded bg-black/80 px-2 py-1 text-[0.65rem] text-white shadow-lg"
            style={{
              left: `${activePoint.xPercent}%`,
              top: `${activePoint.yPercent}%`,
            }}
          >
            <div className="font-semibold">
              {`${activePoint.value.toFixed(0)} ${unit}`}
            </div>
            <div className="text-[0.6rem] opacity-80">
              {formatRelativeTime(Math.max(0, currentTime - activePoint.time))}
            </div>
          </div>
        )}
        {normalizedPoints.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-gray-400">
            No data available in this range
          </div>
        )}
      </div>
      <p
        id={summaryId}
        className="mt-2 text-[0.7rem] leading-snug text-gray-300"
      >
        {summary}
      </p>
    </figure>
  );
}

export { formatRelativeTime };
