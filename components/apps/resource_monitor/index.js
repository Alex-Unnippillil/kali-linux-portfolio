import React, { useEffect, useState } from 'react';
import RollingChart from './RollingChart';

const ResourceMonitor = () => {
  const [fpsData, setFpsData] = useState([]);
  const [heapData, setHeapData] = useState([]);
  const [paintData, setPaintData] = useState([]);
  const [cpuUsage, setCpuUsage] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || typeof requestAnimationFrame === 'undefined') return;
    let rafId;
    let last = performance.now();
    const frame = (now) => {
      const delta = now - last;
      const fps = 1000 / delta;
      const heap =
        performance && performance.memory && performance.memory.usedJSHeapSize
          ? performance.memory.usedJSHeapSize / 1048576
          : 0;
      setFpsData((prev) => [...prev.slice(-59), fps]);
      setHeapData((prev) => [...prev.slice(-59), heap]);
      setPaintData((prev) => [...prev.slice(-59), delta]);
      last = now;
      rafId = requestAnimationFrame(frame);
    };
    rafId = requestAnimationFrame(frame);
    return () => {
      if (typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(rafId);
      }
    };
  }, [paused]);

  useEffect(() => {
    if (paused) return;
    const interval = 100;
    let last = performance.now();
    let samples = [];
    const sample = () => {
      const now = performance.now();
      const drift = now - last - interval;
      samples = [...samples.slice(-9), drift];
      const avgDrift = samples.reduce((a, b) => a + b, 0) / samples.length;
      const usage = Math.min(100, Math.max(0, (avgDrift / interval) * 100));
      setCpuUsage(usage);
      last = now;
    };
    const id = setInterval(sample, interval);
    return () => clearInterval(id);
  }, [paused]);

  const togglePause = () => setPaused((p) => !p);

  return (
    <div className="h-full w-full flex flex-col bg-ub-cool-grey text-white font-ubuntu">
      <div className="p-2 bg-ub-dark-grey text-sm flex items-center">
        <button
          onClick={togglePause}
          data-testid="pause-btn"
          className="px-2 py-1 bg-ubt-green text-black rounded"
        >
          {paused ? 'Resume' : 'Pause'}
        </button>
        <span className="ml-4">
          CPU Usage: <span data-testid="cpu-usage">{cpuUsage.toFixed(1)}</span>%
        </span>
      </div>
      <div className="flex flex-col flex-1 p-2 gap-2">
        <div className="flex flex-1">
          <RollingChart data={fpsData} color="#21c5c7" label="FPS" testId="fps-value" />
          <RollingChart data={paintData} color="#f953c6" label="Paint (ms)" testId="paint-value" />
        </div>
        <div className="flex flex-1">
          <RollingChart data={heapData} color="#f9f871" label="JS Heap (MB)" testId="heap-value" />
        </div>
      </div>
    </div>
  );
};

export default ResourceMonitor;

export const displayResourceMonitor = (addFolder, openApp) => (
  <ResourceMonitor addFolder={addFolder} openApp={openApp} />
);
