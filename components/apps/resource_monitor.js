import React, { useEffect, useRef } from 'react';
import usePersistentState from '../../hooks/usePersistentState';
import { subscribe } from '../../utils/pubsub';

const MAX_POINTS = 50;

const ResourceMonitor = () => {
  const cpuRef = useRef(null);
  const memoryRef = useRef(null);
  const gpuRef = useRef(null);
  const dataRef = useRef({ cpu: [], memory: [], gpu: [] });
  const fpsRef = useRef(0);

  const [paused, setPaused] = usePersistentState('rm_paused', false);
  const [speed, setSpeed] = usePersistentState('rm_speed', 1);
  const [layout, setLayout] = usePersistentState('rm_layout', 'row');

  useEffect(() => {
    return subscribe('fps', (fps) => {
      fpsRef.current = fps;
    });
  }, []);

  useEffect(() => {
    if (paused) return undefined;
    let last = performance.now();
    const interval = setInterval(() => {
      const now = performance.now();
      const expected = 1000 / speed;
      const delay = now - last - expected;
      last = now;

      const cpu = Math.min(100, Math.max(0, (delay / expected) * 100));
      let memory = 0;
      if (performance && performance.memory) {
        const { usedJSHeapSize, totalJSHeapSize } = performance.memory;
        memory = (usedJSHeapSize / totalJSHeapSize) * 100;
      }
      const gpu = fpsRef.current;

      const data = dataRef.current;
      data.cpu.push(cpu);
      data.memory.push(memory);
      data.gpu.push(gpu);
      Object.keys(data).forEach((k) => {
        if (data[k].length > MAX_POINTS) data[k].shift();
      });
    }, 1000 / speed);
    return () => clearInterval(interval);
  }, [paused, speed]);

  useEffect(() => {
    const cpuCtx = cpuRef.current?.getContext('2d');
    const memCtx = memoryRef.current?.getContext('2d');
    const gpuCtx = gpuRef.current?.getContext('2d');
    let raf;
    const draw = () => {
      if (!paused) {
        drawChart(cpuCtx, dataRef.current.cpu, '#00ff00', 'CPU %', 100);
        drawChart(memCtx, dataRef.current.memory, '#ffd700', 'Memory %', 100);
        drawChart(gpuCtx, dataRef.current.gpu, '#00ffff', 'FPS', 120);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [paused]);

  const togglePause = () => setPaused((p) => !p);
  const changeSpeed = (e) => setSpeed(parseFloat(e.target.value));
  const toggleLayout = () => setLayout((l) => (l === 'row' ? 'col' : 'row'));

  return (
    <div className="h-full w-full flex flex-col bg-ub-cool-grey text-white font-ubuntu">
      <div className="p-2 flex gap-2 items-center">
        <button
          onClick={togglePause}
          className="px-2 py-1 bg-ub-dark-grey rounded"
        >
          {paused ? 'Resume' : 'Pause'}
        </button>
        <label className="flex items-center gap-1">
          Speed
          <select
            value={speed}
            onChange={changeSpeed}
            className="bg-ub-dark-grey rounded px-1 py-0.5"
          >
            <option value={0.5}>0.5x</option>
            <option value={1}>1x</option>
            <option value={2}>2x</option>
            <option value={4}>4x</option>
          </select>
        </label>
        <button
          onClick={toggleLayout}
          className="px-2 py-1 bg-ub-dark-grey rounded"
        >
          Layout
        </button>
      </div>
      <div
        className={`flex flex-${layout} flex-1 items-center justify-evenly gap-4 p-4`}
      >
        <canvas
          ref={cpuRef}
          width={300}
          height={100}
          role="img"
          aria-label="CPU usage chart"
          className="bg-ub-dark-grey"
        />
        <canvas
          ref={memoryRef}
          width={300}
          height={100}
          role="img"
          aria-label="Memory usage chart"
          className="bg-ub-dark-grey"
        />
        <canvas
          ref={gpuRef}
          width={300}
          height={100}
          role="img"
          aria-label="GPU usage chart"
          className="bg-ub-dark-grey"
        />
      </div>
    </div>
  );
};

function drawChart(ctx, values, color, label, maxVal) {
  if (!ctx) return;
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  values.forEach((v, i) => {
    const x = (i / (values.length - 1 || 1)) * w;
    const y = h - (v / maxVal) * h;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  const latest = values[values.length - 1] || 0;
  ctx.fillStyle = '#ffffff';
  ctx.font = '12px sans-serif';
  ctx.fillText(`${label}: ${latest.toFixed(1)}`, 4, 12);
}

export default ResourceMonitor;

export const displayResourceMonitor = (addFolder, openApp) => {
  return <ResourceMonitor addFolder={addFolder} openApp={openApp} />;
};

