import React, { useEffect, useRef, useState } from 'react';
import { useFPS, useNetworkInformation, useResourceTiming } from '../../lib/perf/perfHooks';

const ResourceMonitor = () => {
  const cpuRef = useRef(null);
  const memoryRef = useRef(null);
  const networkRef = useRef(null);
  const liveRef = useRef(null);
  const fps = useFPS();
  const netInfo = useNetworkInformation();
  const resources = useResourceTiming();
  const [latest, setLatest] = useState({ cpu: 0, memory: 0 });

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
    worker.onmessage = (e) => {
      const { cpu, memory } = e.data || {};
      setLatest({ cpu, memory });
    };
    return () => worker.terminate();
  }, []);

  useEffect(() => {
    if (!liveRef.current) return;
    const { cpu, memory } = latest;
    const down = netInfo.downlink || 0;
    const up = netInfo.uplink || 0;
    liveRef.current.textContent =
      `FPS ${fps.toFixed(1)}, CPU ${cpu.toFixed(1)}%, Memory ${memory.toFixed(1)}%, Download ${down.toFixed(1)} Mbps, Upload ${up.toFixed(1)} Mbps, Resources ${resources.length}`;
  }, [fps, netInfo, latest, resources]);

  return (
    <div className="h-full w-full flex flex-col bg-ub-cool-grey text-white font-ubuntu">
      <div className="flex flex-col sm:flex-row flex-1 items-center justify-evenly gap-4 p-4">
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
