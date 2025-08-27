import React, { useEffect, useRef, useState } from 'react';

const ResourceMonitor = () => {
  const cpuRef = useRef(null);
  const memoryRef = useRef(null);
  const networkRef = useRef(null);
  const fpsRef = useRef(null);
  const liveRef = useRef(null);

  const [networkInfo, setNetworkInfo] = useState({ type: '', downlink: 0 });
  const [resources, setResources] = useState([]);
  const [memoryInfo, setMemoryInfo] = useState(null);
  const [lcp, setLcp] = useState(0);
  const [cls, setCls] = useState(0);

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
        liveRef.current.textContent =
          `CPU ${cpu.toFixed(1)}%, Memory ${memory.toFixed(1)}%, Download ${down.toFixed(1)} Mbps, Upload ${up.toFixed(1)} Mbps`;
      }
    };
    return () => worker.terminate();
  }, []);

  useEffect(() => {
    if (!fpsRef.current) return;
    const canvas = fpsRef.current;
    const ctx = canvas.getContext('2d');
    const data = [];
    let last = performance.now();
    let rafId;
    const draw = (now) => {
      const fps = 1000 / (now - last);
      last = now;
      data.push(fps);
      if (data.length > 50) data.shift();
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 1;
      ctx.beginPath();
      data.forEach((v, i) => {
        const x = (i / (data.length - 1 || 1)) * w;
        const y = h - (v / 60) * h;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px sans-serif';
      ctx.fillText(`${fps.toFixed(1)} FPS`, 4, 12);
      rafId = requestAnimationFrame(draw);
    };
    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, []);

  useEffect(() => {
    const connection = navigator.connection;
    if (connection) {
      const update = () =>
        setNetworkInfo({ type: connection.effectiveType, downlink: connection.downlink });
      update();
      connection.addEventListener('change', update);
      return () => connection.removeEventListener('change', update);
    }
  }, []);

  useEffect(() => {
    if (performance && performance.memory) {
      const update = () => {
        const { usedJSHeapSize, totalJSHeapSize } = performance.memory;
        setMemoryInfo({
          used: usedJSHeapSize / 1048576,
          total: totalJSHeapSize / 1048576,
        });
      };
      update();
      const id = setInterval(update, 5000);
      return () => clearInterval(id);
    }
  }, []);

  useEffect(() => {
    if (typeof PerformanceObserver === 'undefined') return;
    const resObs = new PerformanceObserver((list) => {
      const entries = list.getEntries().map((e) => ({ name: e.name, duration: e.duration }));
      setResources((prev) => [...prev, ...entries].slice(-10));
    });
    try {
      resObs.observe({ type: 'resource', buffered: true });
    } catch (e) {}

    const vitalsObs = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'largest-contentful-paint') {
          setLcp(entry.renderTime || entry.loadTime || 0);
        } else if (entry.entryType === 'layout-shift' && !entry.hadRecentInput) {
          setCls((c) => c + entry.value);
        }
      });
    });
    try {
      vitalsObs.observe({ type: 'largest-contentful-paint', buffered: true });
      vitalsObs.observe({ type: 'layout-shift', buffered: true });
    } catch (e) {}

    return () => {
      resObs.disconnect();
      vitalsObs.disconnect();
    };
  }, []);

  return (
    <div className="h-full w-full flex flex-col bg-ub-cool-grey text-white font-ubuntu">
      <div className="flex flex-col sm:flex-row flex-1 items-center justify-evenly gap-4 p-4">
        <canvas
          ref={fpsRef}
          width={300}
          height={50}
          role="img"
          aria-label="FPS chart"
          className="bg-ub-dark-grey"
        />
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
      <div className="p-4 text-xs space-y-1">
        <p>
          Network: {networkInfo.type || 'n/a'} {networkInfo.downlink ? `${networkInfo.downlink} Mbps` : ''}
        </p>
        {memoryInfo && (
          <p>
            Memory: {memoryInfo.used.toFixed(1)} / {memoryInfo.total.toFixed(1)} MB
          </p>
        )}
        <p>
          LCP: {lcp ? (lcp / 1000).toFixed(2) + 's' : 'n/a'} CLS: {cls.toFixed(3)}
        </p>
        {resources.length > 0 && (
          <div>
            <p>Resources:</p>
            <ul className="list-disc list-inside">
              {resources.map((r, i) => (
                <li key={i} className="truncate">
                  {r.name} {r.duration.toFixed(1)}ms
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div ref={liveRef} className="sr-only" aria-live="polite" role="status" />
    </div>
  );
};

export default ResourceMonitor;

export const displayResourceMonitor = (addFolder, openApp) => {
  return <ResourceMonitor addFolder={addFolder} openApp={openApp} />;
};
