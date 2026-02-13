'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import {
  useTimelineActions,
  useTimelineSelector,
  type TimelineState,
} from './timelineStore';

type TimelinePacket = {
  timestampSeconds: number;
  protocol: number;
};

interface PacketTimelineProps {
  packets: TimelinePacket[];
}

const brushStyle = 'bg-blue-500/30 border border-blue-300';
const windowStyle = 'bg-blue-500/20 border border-blue-400';

const normalizeRange = (range: [number, number]) =>
  range[0] <= range[1] ? range : ([range[1], range[0]] as [number, number]);

const percentWithin = (value: number, domain: [number, number]) => {
  const [start, end] = domain;
  if (end <= start) {
    return 0;
  }
  return ((value - start) / (end - start)) * 100;
};

const PacketTimeline: React.FC<PacketTimelineProps> = ({ packets }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef<number | null>(null);
  const { setWindow, setBrush, resetWindow } = useTimelineActions();
  const domain = useTimelineSelector((state) => state.domain);
  const windowRange = useTimelineSelector((state) => state.window);
  const brush = useTimelineSelector((state) => state.brush);

  const drawPackets = React.useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      if (!packets.length) {
        ctx.clearRect(0, 0, width, height);
        return;
      }
      ctx.clearRect(0, 0, width, height);
      const [start, end] = domain;
      const span = end - start;
      if (span <= 0) {
        return;
      }
      const pixelRatio = window.devicePixelRatio ?? 1;
      const lineHeight = height * 0.6;
      ctx.fillStyle = '#38bdf8';
      const step = Math.max(1, Math.floor((packets.length / width) * pixelRatio));
      for (let i = 0; i < packets.length; i += step) {
        const pkt = packets[i];
        const x = ((pkt.timestampSeconds - start) / span) * width;
        const drawX = Math.round(x);
        ctx.fillRect(drawX, height - lineHeight, Math.max(1, pixelRatio), lineHeight);
      }
    },
    [domain, packets]
  );

  const resizeCanvas = React.useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const pixelRatio = window.devicePixelRatio ?? 1;
    const width = Math.max(1, Math.floor(rect.width * pixelRatio));
    const height = Math.max(1, Math.floor(rect.height * pixelRatio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    const ctx = canvas.getContext('2d');
    if (ctx) {
      drawPackets(ctx, width, height);
    }
  }, [drawPackets]);

  useEffect(() => {
    resizeCanvas();
  }, [resizeCanvas]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (typeof ResizeObserver === 'undefined') {
      resizeCanvas();
      return;
    }
    const observer = new ResizeObserver(() => {
      resizeCanvas();
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [resizeCanvas]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawPackets(ctx, canvas.width, canvas.height);
  }, [drawPackets]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!overlayRef.current) return;
    overlayRef.current.setPointerCapture(event.pointerId);
    const rect = overlayRef.current.getBoundingClientRect();
    const offset = event.clientX - rect.left;
    const nextTime = positionToTime(offset, rect.width, domain);
    dragStartRef.current = nextTime;
    setBrush([nextTime, nextTime]);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!overlayRef.current) return;
    if (dragStartRef.current === null || !overlayRef.current.hasPointerCapture(event.pointerId)) {
      return;
    }
    const rect = overlayRef.current.getBoundingClientRect();
    const offset = event.clientX - rect.left;
    const nextTime = positionToTime(offset, rect.width, domain);
    setBrush([dragStartRef.current, nextTime]);
  };

  const commitBrush = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!overlayRef.current) return;
    if (dragStartRef.current === null || !overlayRef.current.hasPointerCapture(event.pointerId)) {
      return;
    }
    overlayRef.current.releasePointerCapture(event.pointerId);
    const rect = overlayRef.current.getBoundingClientRect();
    const offset = event.clientX - rect.left;
    const nextTime = positionToTime(offset, rect.width, domain);
    const range = normalizeRange([dragStartRef.current, nextTime]);
    dragStartRef.current = null;
    setBrush(null);
    if (Math.abs(range[1] - range[0]) < (domain[1] - domain[0]) * 0.001) {
      return;
    }
    setWindow(range);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    commitBrush(event);
  };

  const handlePointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    if (overlayRef.current?.hasPointerCapture(event.pointerId)) {
      overlayRef.current.releasePointerCapture(event.pointerId);
    }
    dragStartRef.current = null;
    setBrush(null);
  };

  const positionToTime = (
    x: number,
    width: number,
    [start, end]: TimelineState['domain']
  ) => {
    if (end <= start) {
      return start;
    }
    const clamped = Math.min(Math.max(x, 0), width);
    const ratio = clamped / Math.max(width, 1);
    return start + (end - start) * ratio;
  };

  const zoom = (factor: number) => {
    const [start, end] = windowRange;
    const [domainStart, domainEnd] = domain;
    const span = Math.max(end - start, (domainEnd - domainStart) * 0.001);
    const center = start + span / 2;
    const nextSpan = Math.max((domainEnd - domainStart) * 0.001, span * factor);
    const nextStart = center - nextSpan / 2;
    const nextEnd = center + nextSpan / 2;
    setWindow([nextStart, nextEnd]);
  };

  const controlsDisabled = domain[0] === domain[1];

  const windowPercentages = useMemo(() => {
    if (domain[1] <= domain[0]) {
      return { start: 0, width: 100 };
    }
    const start = percentWithin(windowRange[0], domain);
    const width = percentWithin(windowRange[1], domain) - start;
    return {
      start: Math.max(0, Math.min(start, 100)),
      width: Math.max(0.5, width),
    };
  }, [domain, windowRange]);

  const brushPercentages = useMemo(() => {
    if (!brush || domain[1] <= domain[0]) {
      return null;
    }
    const normalized = normalizeRange(brush);
    const start = percentWithin(normalized[0], domain);
    const end = percentWithin(normalized[1], domain);
    return {
      start: Math.max(0, Math.min(start, 100)),
      width: Math.max(0.5, end - start),
    };
  }, [brush, domain]);

  return (
    <div className="bg-gray-800/60 border border-gray-700 rounded p-2 space-y-2" aria-label="Packet timeline">
      <div className="flex items-center justify-between text-xs text-gray-200">
        <span className="uppercase tracking-wide text-gray-300">Timeline</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-40"
            onClick={() => zoom(0.5)}
            disabled={controlsDisabled}
          >
            Zoom In
          </button>
          <button
            type="button"
            className="px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-40"
            onClick={() => zoom(2)}
            disabled={controlsDisabled}
          >
            Zoom Out
          </button>
          <button
            type="button"
            className="px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-40"
            onClick={() => resetWindow()}
            disabled={controlsDisabled}
          >
            Reset
          </button>
        </div>
      </div>
      <div className="relative h-24" aria-label="Timeline brush region">
        <canvas
          ref={canvasRef}
          className="w-full h-full rounded bg-gray-900/70"
          role="presentation"
        />
        <div
          ref={overlayRef}
          className="absolute inset-0 cursor-crosshair"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerCancel}
          onPointerCancel={handlePointerCancel}
          aria-label="Packet timeline brush"
        />
        {windowPercentages.width > 0 && (
          <div
            className={`absolute top-0 bottom-0 pointer-events-none rounded ${windowStyle}`}
            style={{
              left: `${windowPercentages.start}%`,
              width: `${windowPercentages.width}%`,
            }}
          />
        )}
        {brushPercentages && (
          <div
            className={`absolute top-0 bottom-0 pointer-events-none rounded ${brushStyle}`}
            style={{
              left: `${brushPercentages.start}%`,
              width: `${brushPercentages.width}%`,
            }}
          />
        )}
      </div>
    </div>
  );
};

export default PacketTimeline;
