'use client';
import { useEffect, useRef, useState } from 'react';
import './styles.css';

const MAX_POINTS = 120;

export default function ResourceMonitor() {
  const fpsCanvas = useRef<HTMLCanvasElement | null>(null);
  const memCanvas = useRef<HTMLCanvasElement | null>(null);
  const cpuCanvas = useRef<HTMLCanvasElement | null>(null);
  const dataRef = useRef({ fps: [] as number[], memory: [] as number[], cpu: [] as number[] });
  const lastTime = useRef(performance.now());
  const rafId = useRef(0);
  const [paused, setPaused] = useState(false);
  const [stress, setStress] = useState(false);
  const [showWindows, setShowWindows] = useState(true);

  useEffect(() => {
    const loop = (time: number) => {
      const delta = time - lastTime.current;
      lastTime.current = time;
      if (!paused) {
        const fps = 1000 / delta;
        let memory = 0;
        const perfMem: any = (performance as any).memory;
        if (perfMem) {
          memory = (perfMem.usedJSHeapSize / perfMem.totalJSHeapSize) * 100;
        }
        const cpu = Math.min(100, Math.max(0, ((delta - 16.7) / 16.7) * 100));
        const data = dataRef.current;
        data.fps.push(fps);
        data.memory.push(memory);
        data.cpu.push(cpu);
        ['fps', 'memory', 'cpu'].forEach((k) => {
          const arr = (data as any)[k] as number[];
          if (arr.length > MAX_POINTS) arr.shift();
        });
        drawChart(fpsCanvas.current, data.fps, '#00ffff', 120, 'FPS');
        drawChart(memCanvas.current, data.memory, '#ffd700', 100, 'Memory %');
        drawChart(cpuCanvas.current, data.cpu, '#00ff00', 100, 'CPU %');
      }
      rafId.current = requestAnimationFrame(loop);
    };
    rafId.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId.current);
  }, [paused]);

  useEffect(() => {
    if (!stress) return undefined;
    const id = setInterval(() => setShowWindows((s) => !s), 500);
    return () => clearInterval(id);
  }, [stress]);

  return (
    <div className="p-2 bg-ub-cool-grey text-white h-full w-full font-ubuntu">
      <div className="flex gap-2 mb-2">
        <button onClick={() => setPaused((p) => !p)} className="px-2 py-1 bg-ub-dark-grey rounded">
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button onClick={() => setStress((s) => !s)} className="px-2 py-1 bg-ub-dark-grey rounded">
          {stress ? 'Stop Stress' : 'Stress Test'}
        </button>
      </div>
      <div className="flex flex-col gap-2">
        <canvas ref={fpsCanvas} width={300} height={100} className="bg-ub-dark-grey" />
        <canvas ref={memCanvas} width={300} height={100} className="bg-ub-dark-grey" />
        <canvas ref={cpuCanvas} width={300} height={100} className="bg-ub-dark-grey" />
      </div>
      <div className="stress-area mt-4 h-40 relative overflow-hidden">
        {stress && showWindows && Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="stress-window" style={{ left: `${i * 40}px` }} />
        ))}
      </div>
    </div>
  );
}

function drawChart(
  canvas: HTMLCanvasElement | null,
  values: number[],
  color: string,
  max: number,
  label: string
) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = color;
  ctx.beginPath();
  values.forEach((v, i) => {
    const x = (i / (values.length - 1 || 1)) * w;
    const y = h - (v / max) * h;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  const latest = values[values.length - 1] || 0;
  ctx.fillStyle = '#fff';
  ctx.font = '12px sans-serif';
  ctx.fillText(`${label}: ${latest.toFixed(1)}`, 4, 12);
}

