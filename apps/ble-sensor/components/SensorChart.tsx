'use client';

import React, { useEffect, useRef } from 'react';
import type { SensorReading } from '../types';

interface SensorChartProps {
  readings: SensorReading[];
  paused: boolean;
  width?: number;
  height?: number;
}

const DEFAULT_WIDTH = 640;
const DEFAULT_HEIGHT = 240;

const SensorChart: React.FC<SensorChartProps> = ({
  readings,
  paused,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    if (!readings.length) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '16px sans-serif';
      ctx.fillText('Waiting for sensor data…', 16, height / 2);
      return;
    }

    const count = readings.length;
    const maxPoints = width;
    const step = Math.max(1, Math.floor(count / maxPoints));
    const indices: number[] = [];
    for (let i = 0; i < count; i += step) {
      indices.push(i);
    }
    const lastIndex = count - 1;
    if (indices[indices.length - 1] !== lastIndex) {
      indices.push(lastIndex);
    }

    let min = readings[indices[0]].value;
    let max = min;
    const points: SensorReading[] = [];
    for (let i = 0; i < indices.length; i += 1) {
      const reading = readings[indices[i]];
      points.push(reading);
      if (reading.value < min) min = reading.value;
      if (reading.value > max) max = reading.value;
    }

    if (min === max) {
      min -= 1;
      max += 1;
    }

    const verticalRange = max - min;
    const plotted = points.length;
    const stepX = plotted > 1 ? width / (plotted - 1) : width;

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < plotted; i += 1) {
      const value = points[i].value;
      const x = i * stepX;
      const y = height - ((value - min) / verticalRange) * height;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    if (paused) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#f1f5f9';
      ctx.font = '20px sans-serif';
      ctx.fillText('Paused', 16, 32);
    }
  }, [readings, paused, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      data-testid="chart-canvas"
      data-paused={paused ? 'true' : 'false'}
      className="h-60 w-full rounded border border-slate-700 bg-slate-900"
    />
  );
};

export default SensorChart;
