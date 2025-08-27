import React, { useEffect, useRef, useState } from 'react';

const ResourceMonitor = () => {
  const cpuRef = useRef(null);
  const memoryRef = useRef(null);
  const networkRef = useRef(null);
  const liveRef = useRef(null);
  const [fps, setFps] = useState(0);
  const [netInfo, setNetInfo] = useState({ type: '', downlink: 0 });
  const [resources, setResources] = useState([]);
  const [resourceSupported, setResourceSupported] = useState(true);
  const [memoryInfo, setMemoryInfo] = useState(null);

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
      const { cpu, memory, down, up } = e.data || {};
      if (liveRef.current) {
        const memText = memory === null ? 'Memory N/A' : `Memory ${memory.toFixed(1)}%`;
        liveRef.current.textContent = `CPU ${cpu.toFixed(1)}%, ${memText}, Download ${down.toFixed(1)} Mbps, Upload ${up.toFixed(1)} Mbps`;
      }
    };
    return () => worker.terminate();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let frame = 0;
    let last = performance.now();
    let raf;
    const loop = (now) => {
      frame++;
      const delta = now - last;
      if (delta >= 1000) {
        setFps((frame * 1000) / delta);
        frame = 0;
        last = now;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const update = () => {
      if (!conn) {
        setNetInfo({ type: 'N/A', downlink: 0 });
        return;
      }
      setNetInfo({ type: conn.effectiveType || 'unknown', downlink: conn.downlink || 0 });
    };
    update();
    conn && conn.addEventListener('change', update);
    return () => conn && conn.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (typeof performance === 'undefined') return;
    const update = () => {
      if (performance && performance.memory) {
        const { usedJSHeapSize, totalJSHeapSize } = performance.memory;
        setMemoryInfo({ used: usedJSHeapSize, total: totalJSHeapSize });
      } else {
        setMemoryInfo(null);
      }
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (typeof PerformanceObserver === 'undefined' || !PerformanceObserver.supportedEntryTypes?.includes('resource')) {
      setResourceSupported(false);
      return;
    }
    const observer = new PerformanceObserver((list) => {
      const newEntries = list
        .getEntries()
        .map(({ name, duration }) => ({ name, duration }));
      setResources((prev) => [...prev, ...newEntries].slice(-5));
    });
    observer.observe({ type: 'resource', buffered: true });
    return () => observer.disconnect();
  }, []);

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 text-center text-sm">
        <div className="bg-ub-dark-grey p-2" role="img" aria-label="Frames per second">
          FPS: {fps.toFixed(1)}
        </div>
        <div className="bg-ub-dark-grey p-2" role="img" aria-label="Network status">
          {netInfo.type ? `${netInfo.type} ${netInfo.downlink.toFixed(1)} Mbps` : 'Network: N/A'}
        </div>
        <div className="bg-ub-dark-grey p-2" role="img" aria-label="Memory usage">
          {memoryInfo
            ? `${(memoryInfo.used / 1048576).toFixed(1)} / ${(memoryInfo.total / 1048576).toFixed(1)} MB`
            : 'Memory: N/A'}
        </div>
        <div
          className="bg-ub-dark-grey p-2 overflow-y-auto"
          role="img"
          aria-label="Recent resource timings"
        >
          {resourceSupported ? (
            resources.length ? (
              <ul className="text-left">
                {resources.map((r, i) => (
                  <li key={i} className="truncate">
                    {r.name} {r.duration.toFixed(1)}ms
                  </li>
                ))}
              </ul>
            ) : (
              <span>No recent resources</span>
            )
          ) : (
            <span>Resource timing unsupported</span>
          )}
        </div>
      </div>
      <div ref={liveRef} className="sr-only" aria-live="polite" role="status" />
    </div>
  );
};

export default ResourceMonitor;

export const displayResourceMonitor = (addFolder, openApp) => {
  return <ResourceMonitor addFolder={addFolder} openApp={openApp} />;
};
