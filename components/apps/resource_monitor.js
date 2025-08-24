import React, { useEffect, useRef, useState } from 'react';

const HISTORY_LENGTH = 30;

const Sparkline = ({ data, width = 100, height = 30 }) => {
  if (data.length === 0) return <svg width={width} height={height} />;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((d - min) / (max - min || 1)) * height;
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <svg width={width} height={height}>
      {data.length > 1 && (
        <polyline
          fill="none"
          stroke="#4ade80"
          strokeWidth="2"
          points={points}
        />
      )}
    </svg>
  );
};

const Metric = ({ label, value, history, unit }) => (
  <div className="flex flex-col items-center m-2">
    <div className="text-lg">{value !== null ? `${value}${unit || ''}` : 'N/A'}</div>
    <Sparkline data={history} />
    <div className="text-sm mt-1">{label}</div>
  </div>
);

const ResourceMonitor = () => {
  const [paused, setPaused] = useState(false);
  const [fps, setFps] = useState(null);
  const [longTasks, setLongTasks] = useState(null);
  const [memory, setMemory] = useState(null);
  const [networkBytes, setNetworkBytes] = useState(null);
  const [connection, setConnection] = useState({ downlink: null, effectiveType: null });

  const fpsHistory = useRef([]);
  const longTaskHistory = useRef([]);
  const memoryHistory = useRef([]);
  const networkHistory = useRef([]);

  const pushHistory = (ref, value) => {
    ref.current.push(value);
    if (ref.current.length > HISTORY_LENGTH) ref.current.shift();
  };

  useEffect(() => {
    if (paused || typeof window === 'undefined' || !window.requestAnimationFrame) return;
    let frame = 0;
    let last = performance.now();
    let raf;
    const loop = (now) => {
      frame++;
      if (now - last >= 1000) {
        const fpsValue = Math.round((frame * 1000) / (now - last));
        setFps(fpsValue);
        pushHistory(fpsHistory, fpsValue);
        frame = 0;
        last = now;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [paused]);

  useEffect(() => {
    if (paused) return;
    let longTaskObserver;
    let longTaskCount = 0;
    if (typeof PerformanceObserver !== 'undefined') {
      try {
        longTaskObserver = new PerformanceObserver((list) => {
          longTaskCount += list.getEntries().length;
        });
        longTaskObserver.observe({ entryTypes: ['longtask'] });
      } catch (_) {
        /* unsupported */
      }
    }
    const interval = setInterval(() => {
      setLongTasks(longTaskCount);
      pushHistory(longTaskHistory, longTaskCount);
      longTaskCount = 0;
    }, 1000);
    return () => {
      clearInterval(interval);
      if (longTaskObserver) longTaskObserver.disconnect();
    };
  }, [paused]);

  useEffect(() => {
    if (paused) return;
    let memInterval;
    if (performance && performance.memory) {
      const updateMem = () => {
        const { usedJSHeapSize, totalJSHeapSize } = performance.memory;
        const perc = Math.round((usedJSHeapSize / totalJSHeapSize) * 100);
        setMemory(perc);
        pushHistory(memoryHistory, perc);
      };
      updateMem();
      memInterval = setInterval(updateMem, 1000);
    }
    return () => {
      if (memInterval) clearInterval(memInterval);
    };
  }, [paused]);

  useEffect(() => {
    if (paused) return;
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const updateConn = () => {
      setConnection({
        downlink: conn?.downlink || null,
        effectiveType: conn?.effectiveType || null,
      });
    };
    updateConn();
    conn?.addEventListener('change', updateConn);

    let bytes = 0;
    let resourceObserver;
    if (typeof PerformanceObserver !== 'undefined') {
      try {
        resourceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.transferSize) bytes += entry.transferSize;
          }
        });
        resourceObserver.observe({ entryTypes: ['resource'] });
      } catch (_) {
        /* unsupported */
      }
    }
    const interval = setInterval(() => {
      setNetworkBytes(bytes);
      pushHistory(networkHistory, bytes);
      bytes = 0;
    }, 1000);
    return () => {
      clearInterval(interval);
      resourceObserver?.disconnect();
      conn?.removeEventListener('change', updateConn);
    };
  }, [paused]);

  const togglePause = () => setPaused((p) => !p);

  return (
    <div className="h-full w-full flex flex-col bg-panel text-white">
      <button
        className="self-end m-2 px-2 py-1 bg-gray-700 rounded"
        onClick={togglePause}
      >
        {paused ? 'Resume' : 'Pause'}
      </button>
      <div className="flex flex-wrap justify-evenly">
        <Metric label="FPS" value={fps} history={fpsHistory.current} />
        <Metric label="Long Tasks" value={longTasks} history={longTaskHistory.current} />
        <Metric label="Memory" value={memory} history={memoryHistory.current} unit="%" />
        <div className="flex flex-col items-center m-2">
          <div className="text-lg">
            {networkBytes !== null ? `${Math.round(networkBytes / 1024)} KB/s` : 'N/A'}
          </div>
          <Sparkline data={networkHistory.current} />
          <div className="text-sm mt-1">
            Network
            {connection.downlink && (
              <span className="ml-1 text-xs">
                {`${connection.downlink}Mbps ${connection.effectiveType || ''}`}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResourceMonitor;

export const displayResourceMonitor = (addFolder, openApp) => (
  <ResourceMonitor addFolder={addFolder} openApp={openApp} />
);
