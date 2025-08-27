import React, { useEffect, useRef, useState } from 'react';

const MAX_POINTS = 60;

const draw = (
  canvas: HTMLCanvasElement | null,
  data: number[],
  color: string,
) => {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  if (!data.length) return;
  const max = Math.max(...data);
  ctx.beginPath();
  data.forEach((v, i) => {
    const x = (i / (MAX_POINTS - 1)) * w;
    const y = h - (v / max) * h;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = color;
  ctx.stroke();
};

const ResourceMonitor: React.FC = () => {
  const [fps, setFps] = useState(0);
  const [heap, setHeap] = useState(0);
  const [paint, setPaint] = useState(0);
  const [cpu, setCpu] = useState(0);
  const [requests, setRequests] = useState(0);
  const [paused, setPaused] = useState(false);
  const [overlay, setOverlay] = useState(false);
  const [heapAvg, setHeapAvg] = useState(0);
  const [leak, setLeak] = useState(false);

  const fpsHist = useRef<number[]>([]);
  const heapHist = useRef<number[]>([]);
  const paintHist = useRef<number[]>([]);
  const fpsCanvas = useRef<HTMLCanvasElement>(null);
  const heapCanvas = useRef<HTMLCanvasElement>(null);
  const paintCanvas = useRef<HTMLCanvasElement>(null);

  // FPS and paint time via requestAnimationFrame
  useEffect(() => {
    if (paused) return;
    let frame = 0;
    let last = performance.now();
    let rafId: number;
    const loop = (time: number) => {
      const startPaint = performance.now();
      const endPaint = performance.now();
      const paintDur = endPaint - startPaint;
      frame++;
      const delta = time - last;
      if (delta >= 1000) {
        const currentFps = (frame * 1000) / delta;
        setFps(currentFps);
        fpsHist.current = [...fpsHist.current, currentFps].slice(-MAX_POINTS);
        setPaint(paintDur);
        paintHist.current = [...paintHist.current, paintDur].slice(-MAX_POINTS);
        draw(fpsCanvas.current, fpsHist.current, '#21c5c7');
        draw(paintCanvas.current, paintHist.current, '#f953c6');
        frame = 0;
        last = time;
      }
      if (!paused) rafId = globalThis.requestAnimationFrame(loop);
    };
    rafId = globalThis.requestAnimationFrame(loop);
    return () => globalThis.cancelAnimationFrame && globalThis.cancelAnimationFrame(rafId);
  }, [paused]);

  // JS heap usage and leak watch
  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => {
      const heapMb = (performance as any).memory?.usedJSHeapSize
        ? (performance as any).memory.usedJSHeapSize / 1048576
        : 0;
      setHeap(heapMb);
      heapHist.current = [...heapHist.current, heapMb].slice(-MAX_POINTS);
      draw(heapCanvas.current, heapHist.current, '#21c55d');
      const avg =
        heapHist.current.reduce((a, b) => a + b, 0) / heapHist.current.length || 0;
      setHeapAvg(avg);
      setLeak(heapMb > avg * 1.2);
    }, 1000);
    return () => clearInterval(interval);
  }, [paused]);

  // CPU estimate via setInterval drift
  useEffect(() => {
    if (paused) return;
    const intervalMs = 1000;
    let last = performance.now();
    const interval = setInterval(() => {
      const now = performance.now();
      const drift = now - last - intervalMs;
      const usage = Math.max(0, Math.min(100, (drift / intervalMs) * 100));
      setCpu(usage);
      last = now;
    }, intervalMs);
    return () => clearInterval(interval);
  }, [paused]);

  // Network requests per minute
  useEffect(() => {
    const stamps: number[] = [];
    let observer: PerformanceObserver | undefined;
    if (typeof PerformanceObserver !== 'undefined') {
      observer = new PerformanceObserver((list) => {
        const now = performance.now();
        list.getEntries().forEach(() => stamps.push(now));
        while (stamps.length && now - stamps[0] > 60000) stamps.shift();
        setRequests(stamps.length);
      });
      try {
        observer.observe({ entryTypes: ['resource'] });
      } catch {
        // ignore
      }
    }
    return () => observer && observer.disconnect();
  }, []);

  return (
    <div
      data-testid="resource-root"
      className={`${
        overlay ? 'fixed inset-0 pointer-events-none z-50' : 'relative'
      } bg-ub-cool-grey text-white p-2 space-y-2`}
    >
      <div className="flex space-x-2">
        <button
          data-testid="pause-btn"
          onClick={() => setPaused((p) => !p)}
          className="px-2 py-1 bg-ubt-green text-black rounded"
        >
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button
          data-testid="overlay-btn"
          onClick={() => setOverlay((o) => !o)}
          className="px-2 py-1 bg-ubt-blue text-black rounded"
        >
          {overlay ? 'Overlay Off' : 'Overlay On'}
        </button>
      </div>
      <div>
        FPS: <span data-testid="fps-value">{fps.toFixed(1)}</span>
      </div>
      <canvas ref={fpsCanvas} width={200} height={50} />
      <div>
        Heap MB: <span data-testid="heap-value">{heap.toFixed(1)}</span>{' '}
        <span data-testid="leak-flag">{leak ? 'leak' : 'ok'}</span>
      </div>
      <canvas ref={heapCanvas} width={200} height={50} />
      <div>
        Paint ms: <span data-testid="paint-value">{paint.toFixed(2)}</span>
      </div>
      <canvas ref={paintCanvas} width={200} height={50} />
      <div>
        CPU %: <span data-testid="cpu-value">{cpu.toFixed(1)}</span>
      </div>
      <div>
        Requests/min: <span data-testid="rpm-value">{requests}</span>
      </div>
      <div>
        Heap avg: <span data-testid="heap-avg">{heapAvg.toFixed(1)}</span>
      </div>
    </div>
  );
};

export default ResourceMonitor;

export const displayResourceMonitor = (addFolder?: any, openApp?: any) => (
  <ResourceMonitor addFolder={addFolder} openApp={openApp} />
);

