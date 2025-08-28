import React, { useEffect, useRef, useState, useCallback } from 'react';
import Draggable from 'react-draggable';
import usePersistentState from '../hooks/usePersistentState';

const ResourceMonitor = () => {
  const cpuRef = useRef(null);
  const memoryRef = useRef(null);
  const networkRef = useRef(null);
  const liveRef = useRef(null);
  const workerRef = useRef(null);
  const containerRef = useRef(null);
  const cpuBoxRef = useRef(null);
  const memBoxRef = useRef(null);
  const netBoxRef = useRef(null);
  const [stress, setStress] = useState(false);
  const [paused, setPaused] = useState(false);
  const [layout, setLayout] = usePersistentState('resourceMonitorLayout', {
    cpu: { x: 0, y: 0, w: 300, h: 100 },
    memory: { x: 0, y: 110, w: 300, h: 100 },
    network: { x: 0, y: 220, w: 300, h: 100 },
  });

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
    worker.postMessage({
      type: 'resize',
      sizes: {
        cpu: { w: layout.cpu.w, h: layout.cpu.h },
        memory: { w: layout.memory.w, h: layout.memory.h },
        network: { w: layout.network.w, h: layout.network.h },
      },
    });

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleStress = () => {
    const next = !stress;
    setStress(next);
    if (workerRef.current) workerRef.current.postMessage({ type: 'stress', value: next });
  };

  const togglePause = () => {
    const next = !paused;
    setPaused(next);
    if (workerRef.current) workerRef.current.postMessage({ type: 'pause', value: next });
  };

  const updateLayout = useCallback(
    (key, updates) => {
      setLayout((l) => ({ ...l, [key]: { ...l[key], ...updates } }));
    },
    [setLayout]
  );

  useEffect(() => {
    const pairs = [
      ['cpu', cpuBoxRef],
      ['memory', memBoxRef],
      ['network', netBoxRef],
    ];
    const observers = pairs.map(([key, ref]) => {
      if (!ref.current) return null;
      const obs = new ResizeObserver((entries) => {
        const rect = entries[0].contentRect;
        const size = { w: Math.round(rect.width), h: Math.round(rect.height) };
        updateLayout(key, size);
        if (workerRef.current) {
          workerRef.current.postMessage({ type: 'resize', sizes: { [key]: size } });
        }
      });
      obs.observe(ref.current);
      return obs;
    });
    return () => observers.forEach((o) => o && o.disconnect());
  }, [updateLayout]);

  return (
    <div className="h-full w-full flex flex-col bg-ub-cool-grey text-white font-ubuntu">
      <div className="p-2 space-x-2">
        <button
          onClick={toggleStress}
          aria-pressed={stress}
          className="px-2 py-1 bg-ub-dark-grey rounded"
        >
          {stress ? 'Stop Stress' : 'Start Stress'}
        </button>
        <button
          onClick={togglePause}
          aria-pressed={paused}
          className="px-2 py-1 bg-ub-dark-grey rounded"
        >
          {paused ? 'Resume' : 'Pause'}
        </button>
      </div>
      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        <Draggable
          bounds="parent"
          position={{ x: layout.cpu.x, y: layout.cpu.y }}
          onStop={(e, d) => updateLayout('cpu', { x: d.x, y: d.y })}
        >
          <div
            ref={cpuBoxRef}
            className="absolute bg-ub-dark-grey resize overflow-hidden"
            style={{ width: layout.cpu.w, height: layout.cpu.h }}
          >
            <canvas
              ref={cpuRef}
              width={layout.cpu.w}
              height={layout.cpu.h}
              role="img"
              aria-label="CPU usage chart"
              className="w-full h-full"
            />
          </div>
        </Draggable>
        <Draggable
          bounds="parent"
          position={{ x: layout.memory.x, y: layout.memory.y }}
          onStop={(e, d) => updateLayout('memory', { x: d.x, y: d.y })}
        >
          <div
            ref={memBoxRef}
            className="absolute bg-ub-dark-grey resize overflow-hidden"
            style={{ width: layout.memory.w, height: layout.memory.h }}
          >
            <canvas
              ref={memoryRef}
              width={layout.memory.w}
              height={layout.memory.h}
              role="img"
              aria-label="Memory usage chart"
              className="w-full h-full"
            />
          </div>
        </Draggable>
        <Draggable
          bounds="parent"
          position={{ x: layout.network.x, y: layout.network.y }}
          onStop={(e, d) => updateLayout('network', { x: d.x, y: d.y })}
        >
          <div
            ref={netBoxRef}
            className="absolute bg-ub-dark-grey resize overflow-hidden"
            style={{ width: layout.network.w, height: layout.network.h }}
          >
            <canvas
              ref={networkRef}
              width={layout.network.w}
              height={layout.network.h}
              role="img"
              aria-label="Network usage chart"
              className="w-full h-full"
            />
          </div>
        </Draggable>
      </div>
      <div ref={liveRef} className="sr-only" aria-live="polite" role="status" />
    </div>
  );
};

export default ResourceMonitor;

export const displayResourceMonitor = (addFolder, openApp) => {
  return <ResourceMonitor addFolder={addFolder} openApp={openApp} />;
};
