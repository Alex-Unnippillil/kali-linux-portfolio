import React, { useEffect, useMemo, useRef, useState } from 'react';

const STATUS_COLORS = {
  success: '#10b981',
  fail: '#ef4444',
};

const padding = { top: 12, right: 12, bottom: 28, left: 48 };

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const buildSampledIndices = (start, end, stride) => {
  const indices = [];
  for (let i = start; i <= end; i += stride) {
    indices.push(i);
  }
  if (indices.length === 0 || indices[indices.length - 1] !== end) {
    indices.push(end);
  }
  return indices;
};

const TaskRunChart = ({ data, height = 220 }) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const brushRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 640, height });
  const [view, setView] = useState({ start: 0, end: Math.max(0, data.length - 1) });
  const [brushState, setBrushState] = useState(null);

  useEffect(() => {
    setView((current) => {
      if (data.length === 0) {
        return { start: 0, end: 0 };
      }
      const maxIndex = data.length - 1;
      const span = Math.max(1, current.end - current.start);
      if (current.end > maxIndex) {
        const newEnd = maxIndex;
        const newStart = clamp(newEnd - span, 0, newEnd);
        return { start: newStart, end: newEnd };
      }
      return {
        start: clamp(current.start, 0, maxIndex - span),
        end: clamp(current.start + span, 0, maxIndex),
      };
    });
  }, [data]);

  useEffect(() => {
    if (!containerRef.current || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        const { width } = entry.contentRect;
        setDimensions((prev) => ({ ...prev, width }));
      });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const maxLatency = useMemo(() => {
    return data.reduce((max, item) => Math.max(max, item.latency), 0);
  }, [data]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const devicePixelRatio =
      typeof window !== 'undefined' && window.devicePixelRatio ? window.devicePixelRatio : 1;
    const width = Math.max(1, Math.floor(dimensions.width));
    const heightPx = Math.max(1, Math.floor(dimensions.height));
    const chartWidth = Math.max(1, width - padding.left - padding.right);
    const chartHeight = Math.max(1, heightPx - padding.top - padding.bottom);

    canvas.width = width * devicePixelRatio;
    canvas.height = heightPx * devicePixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${heightPx}px`;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, heightPx);

    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, width, heightPx);

    if (!data.length || maxLatency === 0) {
      ctx.fillStyle = '#d1d5db';
      ctx.font = '12px sans-serif';
      ctx.fillText('No data available', padding.left, padding.top + chartHeight / 2);
      return;
    }

    const viewStart = Math.floor(clamp(view.start, 0, Math.max(0, data.length - 1)));
    const viewEnd = Math.ceil(clamp(view.end, viewStart, Math.max(viewStart, data.length - 1)));
    const visibleCount = Math.max(1, viewEnd - viewStart + 1);
    const stride = Math.max(1, Math.floor(visibleCount / chartWidth));
    const sampledIndices = buildSampledIndices(viewStart, viewEnd, stride);

    const getX = (index) => {
      const relativeIndex = index - viewStart;
      const fraction = visibleCount <= 1 ? 0 : relativeIndex / (visibleCount - 1);
      return padding.left + fraction * chartWidth;
    };

    const getY = (latency) => {
      const fraction = latency / maxLatency;
      return padding.top + (1 - fraction) * chartHeight;
    };

    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#9ca3af';
    const yTicks = 4;
    for (let i = 0; i <= yTicks; i += 1) {
      const value = (maxLatency / yTicks) * i;
      const y = padding.top + chartHeight - (chartHeight * i) / yTicks;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      ctx.fillText(`${Math.round(value)} ms`, 6, y - 2);
    }

    ctx.beginPath();
    sampledIndices.forEach((index, idx) => {
      const item = data[index];
      const x = getX(index);
      const y = getY(item.latency);
      if (idx === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#e5e7eb';
    ctx.stroke();

    sampledIndices.forEach((index) => {
      const item = data[index];
      const x = getX(index);
      const y = getY(item.latency);
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = STATUS_COLORS[item.status] || '#60a5fa';
      ctx.fill();
    });
  }, [data, dimensions, maxLatency, view]);

  const chartWidth = Math.max(1, dimensions.width - padding.left - padding.right);

  const toChartX = (clientX) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    return clamp(x, padding.left, padding.left + chartWidth);
  };

  const handlePointerDown = (event) => {
    if (event.button !== 0) return;
    const start = toChartX(event.clientX);
    if (start === null) return;
    brushRef.current = { start, end: start, active: true };
    setBrushState({ start, end: start, active: true });
    event.preventDefault();
  };

  const handlePointerMove = (event) => {
    if (!brushRef.current?.active) return;
    const end = toChartX(event.clientX);
    if (end === null) return;
    const next = { ...brushRef.current, end };
    brushRef.current = next;
    setBrushState(next);
  };

  const commitBrush = () => {
    if (!brushRef.current) return;
    const { start, end } = brushRef.current;
    brushRef.current = null;
    setBrushState(null);
    if (Math.abs(end - start) < 4) {
      return;
    }
    const left = Math.min(start, end);
    const right = Math.max(start, end);
    const leftFraction = (left - padding.left) / chartWidth;
    const rightFraction = (right - padding.left) / chartWidth;
    if (!Number.isFinite(leftFraction) || !Number.isFinite(rightFraction)) {
      return;
    }
    setView((current) => {
      const span = Math.max(1, current.end - current.start);
      const absoluteStart = current.start + leftFraction * span;
      const absoluteEnd = current.start + rightFraction * span;
      const maxIndex = Math.max(0, data.length - 1);
      const newStart = clamp(Math.floor(absoluteStart), 0, maxIndex);
      const newEnd = clamp(Math.ceil(absoluteEnd), newStart, maxIndex);
      return {
        start: newStart,
        end: newEnd,
      };
    });
  };

  const handlePointerUp = () => {
    commitBrush();
  };

  const handlePointerLeave = (event) => {
    if (event.buttons === 0) {
      commitBrush();
    }
  };

  const handleKeyDown = (event) => {
    if (!data.length) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      const direction = event.key === 'ArrowLeft' ? -1 : 1;
      setView((current) => {
        const span = Math.max(1, current.end - current.start);
        const step = Math.max(1, Math.round(span * 0.1));
        const delta = step * direction;
        const maxIndex = Math.max(0, data.length - 1);
        let nextStart = current.start + delta;
        let nextEnd = current.end + delta;
        if (nextStart < 0) {
          nextEnd += -nextStart;
          nextStart = 0;
        }
        if (nextEnd > maxIndex) {
          const overflow = nextEnd - maxIndex;
          nextStart = Math.max(0, nextStart - overflow);
          nextEnd = maxIndex;
        }
        return { start: nextStart, end: nextEnd };
      });
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setView({ start: 0, end: Math.max(0, data.length - 1) });
    }
  };

  const handleDoubleClick = () => {
    setView({ start: 0, end: Math.max(0, data.length - 1) });
  };

  const instructionsId = 'task-run-chart-instructions';

  return (
    <div className="space-y-2">
      <p id={instructionsId} className="text-xs text-gray-300">
        Drag to brush and zoom. Use the left and right arrow keys to pan. Double click or press Escape to reset the view.
      </p>
      <div
        ref={containerRef}
        tabIndex={0}
        role="group"
        aria-describedby={instructionsId}
        onKeyDown={handleKeyDown}
        onDoubleClick={handleDoubleClick}
        className="relative rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-ubt-blue"
        style={{ height }}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          role="img"
          aria-label="Task run latency chart"
          aria-describedby={instructionsId}
        />
        {brushState && (
          <div
            className="absolute bg-blue-400/30 border border-blue-300 pointer-events-none"
            style={{
              top: padding.top,
              height: dimensions.height - padding.top - padding.bottom,
              left: Math.min(brushState.start, brushState.end),
              width: Math.max(2, Math.abs(brushState.end - brushState.start)),
            }}
          />
        )}
        <div
          className="absolute inset-0 cursor-crosshair"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-gray-300">
        <span>
          View range: {Math.floor(view.start)} – {Math.ceil(view.end)} of {Math.max(0, data.length - 1)}
        </span>
        <button
          type="button"
          onClick={() => setView({ start: 0, end: Math.max(0, data.length - 1) })}
          className="rounded bg-gray-700 px-2 py-1 text-xs font-medium text-white hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-ubt-blue"
        >
          Reset view
        </button>
      </div>
      <div className="flex gap-4 text-xs text-gray-300">
        <div className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLORS.success }} />
          Success
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLORS.fail }} />
          Fail
        </div>
      </div>
    </div>
  );
};

export default TaskRunChart;
