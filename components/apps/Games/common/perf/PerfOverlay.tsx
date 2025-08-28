import React, { useEffect, useRef } from 'react';
import { publish } from '../../../../../utils/pubsub';

interface PerfSample {
  t: number;
  dt: number;
}

const MAX_SAMPLES = 120;
const MAX_MS = 50; // cap graph at 50ms (20 FPS)

export const exportPerfReport = (samples: PerfSample[]) => {
  if (!samples.length || typeof document === 'undefined') return;
  const avgDt = samples.reduce((a, s) => a + s.dt, 0) / samples.length;
  const avgFps = 1000 / avgDt;
  const report = {
    avgFps,
    avgFrameMs: avgDt,
    samples: samples.map((s) => ({ t: Math.round(s.t), dt: +s.dt.toFixed(2) })),
  };
  const blob = new Blob([JSON.stringify(report, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'perf-report.json';
  a.click();
  URL.revokeObjectURL(url);
};

const PerfOverlay: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const samplesRef = useRef<PerfSample[]>([]);
  const lastRef = useRef<number>(0);
  const rafRef = useRef<number>(0);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Prefer OffscreenCanvas with a worker when supported
    if (
      typeof window !== 'undefined' &&
      'Worker' in window &&
      'OffscreenCanvas' in window
    ) {
      const worker = new Worker(new URL('./perf.worker.js', import.meta.url));
      workerRef.current = worker;
      const offscreen = canvas.transferControlToOffscreen();
      worker.postMessage({ type: 'init', canvas: offscreen }, [offscreen]);

      const loop = (now: number) => {
        if (lastRef.current) {
          const dt = now - lastRef.current;
          publish('fps', 1000 / dt);
          worker.postMessage({ type: 'frame', dt });
        }
        lastRef.current = now;
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);

      worker.onmessage = (e) => {
        if (e.data?.type === 'dump') {
          exportPerfReport(e.data.samples as PerfSample[]);
        }
      };

      return () => {
        worker.terminate();
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
    }

    // Fallback to main-thread rendering when OffscreenCanvas unsupported
    const ctx = canvas.getContext('2d');
    let mounted = true;

    const loop = (now: number) => {
      if (!mounted) return;
      if (lastRef.current) {
        const dt = now - lastRef.current;
        const samples = samplesRef.current;
        samples.push({ t: now, dt });
        if (samples.length > MAX_SAMPLES) samples.shift();
        publish('fps', 1000 / dt);
        if (ctx) {
          const w = canvas.width;
          const h = canvas.height;
          ctx.clearRect(0, 0, w, h);
          ctx.strokeStyle = '#00ff00';
          ctx.beginPath();
          samples.forEach((s, i) => {
            const x = (i / (samples.length - 1 || 1)) * w;
            const clamped = Math.min(s.dt, MAX_MS);
            const y = h - (clamped / MAX_MS) * h;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.stroke();
          const latest = samples[samples.length - 1];
          const fps = latest ? (1000 / latest.dt).toFixed(1) : '0';
          ctx.fillStyle = '#ffffff';
          ctx.font = '12px sans-serif';
          ctx.fillText(`${fps} FPS`, 4, 12);
        }
      }
      lastRef.current = now;
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      mounted = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handleExport = () => {
    if (workerRef.current) workerRef.current.postMessage({ type: 'dump' });
    else exportPerfReport(samplesRef.current);
  };

  return (
    <div className="absolute bottom-2 left-2 z-50 bg-black bg-opacity-50 text-white p-1 text-xs space-y-1">
      <canvas ref={canvasRef} width={150} height={60} className="block" />
      <button type="button" onClick={handleExport} className="underline">
        Export JSON
      </button>
    </div>
  );
};

export default PerfOverlay;

