'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useSettings } from '../../hooks/useSettings';

interface LineChartProps {
  data: number[];
  color: string;
  label: string;
  max?: number;
}

function LineChart({ data, color, label, max }: LineChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // panel background
    const style = getComputedStyle(document.documentElement);
    ctx.fillStyle = style.getPropertyValue('--kali-panel') || '#000';
    ctx.fillRect(0, 0, width, height);

    // grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 5; i += 1) {
      const y = (height / 5) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    if (data.length > 0) {
      const maxVal = max ?? Math.max(...data, 1);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      data.forEach((v, i) => {
        const x = (i / (data.length - 1 || 1)) * width;
        const y = height - (v / maxVal) * height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    // legend
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px sans-serif';
    ctx.fillText(label, 4, 12);
  }, [data, color, label, max]);

  return (
    <div className="w-full h-24" style={{ background: 'var(--kali-panel)' }}>
      <canvas ref={canvasRef} width={300} height={96} className="w-full h-full" />
    </div>
  );
}

const shadeColor = (color: string, percent: number) => {
  const f = parseInt(color.slice(1), 16);
  const t = percent < 0 ? 0 : 255;
  const p = Math.abs(percent);
  const R = f >> 16;
  const G = (f >> 8) & 0x00ff;
  const B = f & 0x0000ff;
  const newR = Math.round((t - R) * p) + R;
  const newG = Math.round((t - G) * p) + G;
  const newB = Math.round((t - B) * p) + B;
  return `#${(0x1000000 + newR * 0x10000 + newG * 0x100 + newB)
    .toString(16)
    .slice(1)}`;
};

export default function MonitorApp() {
  const { accent } = useSettings();

  const [cpu, setCpu] = useState<number[]>([]);
  const [mem, setMem] = useState<number[]>([]);
  const [net, setNet] = useState<number[]>([]);

  const lastTime = useRef(performance.now());
  const lastResCount = useRef(0);

  useEffect(() => {
    let mounted = true;
    const interval = setInterval(() => {
      if (!mounted) return;
      const now = performance.now();
      const delta = now - lastTime.current;
      lastTime.current = now;
      const cpuLoad = Math.min(100, Math.max(0, ((delta - 1000) / 1000) * 100));

      let memUsage = 0;
      const memPerf = (performance as any).memory;
      if (memPerf) {
        memUsage = (memPerf.usedJSHeapSize / memPerf.jsHeapSizeLimit) * 100;
      }

      let bytes = 0;
      const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      for (let i = lastResCount.current; i < entries.length; i += 1) {
        bytes += entries[i].transferSize || 0;
      }
      lastResCount.current = entries.length;
      const netKb = bytes / 1024;

      setCpu((d) => [...d.slice(-59), cpuLoad]);
      setMem((d) => [...d.slice(-59), memUsage]);
      setNet((d) => [...d.slice(-59), netKb]);
    }, 1000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const colors = [accent, shadeColor(accent, 0.2), shadeColor(accent, -0.2)];

  return (
    <div className="p-2 space-y-2 text-white bg-ub-cool-grey h-full w-full overflow-auto">
      <LineChart data={cpu} color={colors[0]} label="CPU %" max={100} />
      <LineChart data={mem} color={colors[1]} label="Memory %" max={100} />
      <LineChart data={net} color={colors[2]} label="Network kB/s" />
    </div>
  );
}

