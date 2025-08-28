import React, { useEffect, useRef, useState } from 'react';

const ResourceMonitor = () => {
  const cpuRef = useRef(null);
  const memoryRef = useRef(null);
  const networkRef = useRef(null);
  const liveRef = useRef(null);
  const workerRef = useRef(null);
  const containerRef = useRef(null);
  const [stress, setStress] = useState(false);

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !window.Worker ||
      !('OffscreenCanvas' in window) ||
      !cpuRef.current ||
      !memoryRef.current ||
      !networkRef.current
    ) {
      return;
    }
    const worker = new Worker(new URL('./resource_monitor.worker.js', import.meta.url));
    workerRef.current = worker;
    const cpuCanvas = cpuRef.current.transferControlToOffscreen();
    const memCanvas = memoryRef.current.transferControlToOffscreen();
    const netCanvas = networkRef.current.transferControlToOffscreen();
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    worker.postMessage(
      {
        type: 'init',
        canvases: { cpu: cpuCanvas, memory: memCanvas, network: netCanvas },
        reduceMotion,
      },
      [cpuCanvas, memCanvas, netCanvas]
    );

    const handleVisibility = () => {
      worker.postMessage({ type: 'visibility', hidden: document.hidden });
    };

    worker.postMessage({ type: 'visibility', hidden: document.hidden });
    document.addEventListener('visibilitychange', handleVisibility);

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      const area = entry.contentRect.width * entry.contentRect.height;
      const factor = area < 200000 ? 2 : 1;
      worker.postMessage({ type: 'decimate', value: factor });
    });
    if (containerRef.current) observer.observe(containerRef.current);

    worker.onmessage = (e) => {
      const { cpu, memory, down, up } = e.data || {};
      if (liveRef.current) {
        liveRef.current.textContent =
          `CPU ${cpu.toFixed(1)}%, Memory ${memory.toFixed(1)}%, Download ${down.toFixed(1)} Mbps, Upload ${up.toFixed(1)} Mbps`;
      }
    };

    return () => {
      worker.terminate();
      document.removeEventListener('visibilitychange', handleVisibility);
      observer.disconnect();
    };
  }, []);

  const toggleStress = () => {
    const next = !stress;
    setStress(next);
    if (workerRef.current) workerRef.current.postMessage({ type: 'stress', value: next });
  };

  return (
    <div className="h-full w-full flex flex-col bg-ub-cool-grey text-white font-ubuntu">
      <div className="p-2">
        <button
          onClick={toggleStress}
          aria-pressed={stress}
          className="px-2 py-1 bg-ub-dark-grey rounded"
        >
          {stress ? 'Stop Stress' : 'Start Stress'}
        </button>
      </div>
      <div
        ref={containerRef}
        className="flex flex-col lg:flex-row flex-1 items-center justify-evenly gap-4 p-4"
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
          ref={networkRef}
          width={300}
          height={100}
          role="img"
          aria-label="Network usage chart"
          className="bg-ub-dark-grey"
        />
      </div>
      <div ref={liveRef} className="sr-only" aria-live="polite" role="status" />
    </div>
  );
};

export default ResourceMonitor;

export const displayResourceMonitor = (addFolder, openApp) => {
  return <ResourceMonitor addFolder={addFolder} openApp={openApp} />;
};
