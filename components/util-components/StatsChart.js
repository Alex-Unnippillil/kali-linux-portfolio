import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const BASE_WIDTH = 320;
const BASE_HEIGHT = 140;
const CHART_HEIGHT = 90;
const PADDING_X = 24;
const PADDING_TOP = 12;
const BAR_WIDTH = 42;
const BAR_GAP = 28;
const TAP_THRESHOLD = 12; // px before we treat the gesture as a drag instead of a tap

const defaultFormatter = (value) =>
  typeof value === 'number' ? value.toLocaleString() : String(value ?? '');

const buildData = (count, time, data) => {
  if (Array.isArray(data) && data.length) {
    return data.map((entry, index) => ({
      key: entry.key ?? `value-${index}`,
      label: entry.label ?? entry.key ?? `Value ${index + 1}`,
      value: Number(entry.value) || 0,
      color: entry.color ?? '#3b82f6',
      formatter: entry.formatter ?? defaultFormatter,
    }));
  }

  return [
    {
      key: 'candidates',
      label: 'Candidates',
      value: Number(count) || 0,
      color: '#10b981',
      formatter: defaultFormatter,
    },
    {
      key: 'seconds',
      label: 'Seconds @1M/s',
      value: Number(time) || 0,
      color: '#3b82f6',
      formatter: defaultFormatter,
    },
  ];
};

const StatsChart = ({ count = 0, time = 0, data, ariaLabel = 'Candidate and runtime comparison' }) => {
  const preparedData = useMemo(() => buildData(count, time, data), [count, time, data]);
  const maxValue = useMemo(
    () => Math.max(1, ...preparedData.map((entry) => Math.max(0, entry.value))),
    [preparedData],
  );

  const bars = useMemo(() => {
    return preparedData.map((entry, index) => {
      const height = (Math.max(0, entry.value) / maxValue) * CHART_HEIGHT;
      const x = PADDING_X + index * (BAR_WIDTH + BAR_GAP);
      const y = PADDING_TOP + (CHART_HEIGHT - height);
      return {
        ...entry,
        x,
        y,
        height,
        width: BAR_WIDTH,
      };
    });
  }, [preparedData, maxValue]);

  const contentWidth = useMemo(() => {
    if (!bars.length) return BASE_WIDTH;
    return (
      PADDING_X * 2 +
      bars.length * BAR_WIDTH +
      (bars.length - 1) * BAR_GAP
    );
  }, [bars.length]);

  const containerRef = useRef(null);
  const pointerState = useRef(new Map());
  const [containerWidth, setContainerWidth] = useState(0);
  const [pan, setPan] = useState(0);
  const [tooltip, setTooltip] = useState(null);

  const minPan = contentWidth > BASE_WIDTH ? BASE_WIDTH - contentWidth : 0;
  const clampedPan = contentWidth <= BASE_WIDTH ? (BASE_WIDTH - contentWidth) / 2 : Math.min(0, Math.max(pan, minPan));

  useEffect(() => {
    if (!containerRef.current) return undefined;
    const node = containerRef.current;

    const updateWidth = () => {
      const rect = node.getBoundingClientRect();
      setContainerWidth(rect.width || BASE_WIDTH);
    };

    updateWidth();

    if (typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(node);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    if (contentWidth <= BASE_WIDTH && pan !== 0) {
      setPan(0);
    }
  }, [contentWidth, pan]);

  const hideTooltip = useCallback(() => setTooltip(null), []);

  const showTooltipAt = useCallback(
    (index, clientX, clientY) => {
      if (!bars[index] || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const scaleXToPixels = rect.width ? rect.width / BASE_WIDTH : 1;
      const scaleYToPixels = rect.height ? rect.height / BASE_HEIGHT : 1;
      const barCenterX = bars[index].x + bars[index].width / 2 + clampedPan;
      const barTopY = bars[index].y;
      const left =
        clientX != null
          ? clientX - rect.left
          : barCenterX * scaleXToPixels;
      const top = clientY != null ? clientY - rect.top : barTopY * scaleYToPixels;
      setTooltip({
        index,
        left,
        top,
      });
    },
    [bars, clampedPan],
  );

  const scaleX = containerWidth ? BASE_WIDTH / containerWidth : 1;

  const updatePan = useCallback(
    (deltaPx) => {
      if (contentWidth <= BASE_WIDTH) return;
      setPan((previous) => {
        const next = previous + deltaPx * scaleX;
        if (next > 0) return 0;
        if (next < minPan) return minPan;
        return next;
      });
    },
    [contentWidth, minPan, scaleX],
  );

  const computeBarIndexFromPoint = useCallback(
    (clientX) => {
      if (!containerRef.current) return -1;
      const rect = containerRef.current.getBoundingClientRect();
      if (!rect.width) return -1;
      const xInChart = ((clientX - rect.left) / rect.width) * BASE_WIDTH - clampedPan;
      return bars.findIndex((bar) => xInChart >= bar.x && xInChart <= bar.x + bar.width);
    },
    [bars, clampedPan],
  );

  const handlePointerDown = useCallback(
    (event) => {
      pointerState.current.set(event.pointerId, {
        type: event.pointerType,
        x: event.clientX,
        y: event.clientY,
        prevX: event.clientX,
        prevY: event.clientY,
        downX: event.clientX,
        downY: event.clientY,
        moved: false,
      });
      if (event.pointerType === 'touch' && pointerState.current.size === 1) {
        // Hide tooltip when a new touch begins to avoid stale overlays
        hideTooltip();
      }
    },
    [hideTooltip],
  );

  const handlePointerMove = useCallback(
    (event) => {
      const stored = pointerState.current.get(event.pointerId);
      if (!stored) return;
      const next = {
        ...stored,
        prevX: stored.x,
        prevY: stored.y,
        x: event.clientX,
        y: event.clientY,
      };
      if (!stored.moved) {
        const delta = Math.hypot(next.x - next.downX, next.y - next.downY);
        if (delta > TAP_THRESHOLD) {
          next.moved = true;
        }
      }
      pointerState.current.set(event.pointerId, next);

      const touchPointers = Array.from(pointerState.current.values()).filter((pointer) => pointer.type === 'touch');
      if (touchPointers.length >= 2) {
        const avgDelta =
          touchPointers.reduce((sum, pointer) => sum + (pointer.x - pointer.prevX), 0) / touchPointers.length;
        if (!Number.isNaN(avgDelta)) {
          updatePan(avgDelta);
        }
      }
    },
    [updatePan],
  );

  const handlePointerEnd = useCallback(
    (event) => {
      const stored = pointerState.current.get(event.pointerId);
      pointerState.current.delete(event.pointerId);
      if (stored && event.pointerType === 'touch' && !stored.moved) {
        const index = computeBarIndexFromPoint(event.clientX);
        if (index !== -1) {
          showTooltipAt(index, event.clientX, event.clientY);
        }
      }

      if (pointerState.current.size === 0) {
        pointerState.current.clear();
      }
    },
    [computeBarIndexFromPoint, showTooltipAt],
  );

  const handleWheel = useCallback((event) => {
    // Prevent any chart-specific zoom behaviour but keep native page scroll alive.
    event.stopPropagation();
  }, []);

  const tooltipContent = useMemo(() => {
    if (!tooltip) return null;
    const bar = bars[tooltip.index];
    if (!bar) return null;
    const valueText = bar.formatter(bar.value);
    return (
      <div
        className="absolute bg-gray-900/95 text-xs text-white px-2 py-1 rounded shadow-lg pointer-events-none"
        style={{
          left: `${tooltip.left}px`,
          top: `${tooltip.top}px`,
          transform: 'translate(-50%, -100%)',
          maxWidth: '200px',
        }}
      >
        <div className="font-semibold">{bar.label}</div>
        <div>{valueText}</div>
      </div>
    );
  }, [bars, tooltip]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-32 mt-2 select-none"
      style={{ touchAction: 'pan-y' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onPointerLeave={(event) => {
        if (event.pointerType !== 'touch') {
          hideTooltip();
        }
      }}
      onWheel={handleWheel}
    >
      <svg viewBox={`0 0 ${BASE_WIDTH} ${BASE_HEIGHT}`} className="w-full h-full" role="img" aria-label={ariaLabel}>
        <desc>Interactive comparison chart optimised for touch gestures</desc>
        <g transform={`translate(${clampedPan}, 0)`}>
          {bars.map((bar, index) => (
            <g key={bar.key}>
              <rect
                x={bar.x}
                y={bar.y}
                width={bar.width}
                height={bar.height}
                fill={bar.color}
                rx="6"
                ry="6"
                className="transition-opacity duration-150 ease-out"
                onMouseEnter={(event) => showTooltipAt(index, event.clientX, event.clientY)}
                onMouseMove={(event) => showTooltipAt(index, event.clientX, event.clientY)}
                onMouseLeave={hideTooltip}
                onFocus={(event) => showTooltipAt(index, event.target.getBoundingClientRect().left + event.target.getBoundingClientRect().width / 2, event.target.getBoundingClientRect().top)}
                onBlur={hideTooltip}
                tabIndex={0}
                role="presentation"
              />
              <text
                x={bar.x + bar.width / 2}
                y={PADDING_TOP + CHART_HEIGHT + 18}
                textAnchor="middle"
                fontSize="10"
                fill="white"
              >
                {bar.label}
              </text>
            </g>
          ))}
        </g>
      </svg>
      {tooltipContent}
    </div>
  );
};

export default StatsChart;
