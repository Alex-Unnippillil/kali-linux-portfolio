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

const Metric = ({ label, value, history, unit, hint }) => (
  <div
    className="flex flex-col items-center m-2"
    data-testid={`metric-${label.toLowerCase().replace(/\s+/g, '-')}`}
  >
    <div className="text-lg">{value !== null ? `${value}${unit || ''}` : 'N/A'}</div>
    <Sparkline data={history} />
    <div className="text-sm mt-1">
      {label}
      {hint && <span className="ml-1 text-xs text-gray-300">{hint}</span>}
    </div>
  </div>
);

const ResourceMonitor = () => {
  const [paused, setPaused] = useState(false);
  const [fps, setFps] = useState(null);
  const [longTasks, setLongTasks] = useState(null);
  const [memory, setMemory] = useState({ percent: null, hint: null });
  const [networkBytes, setNetworkBytes] = useState(null);
  const [connection, setConnection] = useState({ downlink: null, effectiveType: null });
  const [webVitals, setWebVitals] = useState({
    fcp: null,
    lcp: null,
    cls: null,
    fid: null,
    ttfb: null,
  });
  const [recording, setRecording] = useState(false);
  const [enabled, setEnabled] = useState({
    fps: true,
    longTasks: true,
    memory: true,
    network: true,
    webVitals: true,
  });

  const fpsHistory = useRef([]);
  const longTaskHistory = useRef([]);
  const memoryHistory = useRef([]);
  const networkHistory = useRef([]);

  const pushHistory = (ref, value) => {
    ref.current.push(value);
    if (ref.current.length > HISTORY_LENGTH) ref.current.shift();
  };

  useEffect(() => {
    if (paused || !enabled.fps || typeof window === 'undefined' || !window.requestAnimationFrame)
      return;
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
  }, [paused, enabled.fps]);

  useEffect(() => {
    if (paused || !enabled.longTasks) return;
    let longTaskObserver;
    let longTaskDuration = 0;
    if (typeof PerformanceObserver !== 'undefined') {
      try {
        longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            longTaskDuration += entry.duration;
          }
        });
        longTaskObserver.observe({ entryTypes: ['longtask'] });
      } catch (_) {
        /* unsupported */
      }
    }
    const interval = setInterval(() => {
      setLongTasks(longTaskDuration);
      pushHistory(longTaskHistory, longTaskDuration);
      longTaskDuration = 0;
    }, 1000);
    return () => {
      clearInterval(interval);
      if (longTaskObserver) longTaskObserver.disconnect();
    };
  }, [paused, enabled.longTasks]);

  useEffect(() => {
    if (paused || !enabled.memory) return;
    let memInterval;
    if (performance && performance.memory) {
      const updateMem = () => {
        const { usedJSHeapSize, totalJSHeapSize } = performance.memory;
        const perc = Math.round((usedJSHeapSize / totalJSHeapSize) * 100);
        const hint = perc > 80 ? 'High' : perc > 50 ? 'Moderate' : 'Low';
        setMemory({ percent: perc, hint });
        pushHistory(memoryHistory, perc);
      };
      updateMem();
      memInterval = setInterval(updateMem, 1000);
    }
    return () => {
      if (memInterval) clearInterval(memInterval);
    };
  }, [paused, enabled.memory]);

  useEffect(() => {
    if (paused || !enabled.network) return;
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
  }, [paused, enabled.network]);

  useEffect(() => {
    if (paused || !enabled.webVitals) return;
    let lcpObserver;
    let clsObserver;
    let fidObserver;
    let clsValue = 0;

    const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];
    if (fcpEntry) {
      setWebVitals((v) => ({ ...v, fcp: Math.round(fcpEntry.startTime) }));
    }

    if (typeof PerformanceObserver !== 'undefined') {
      try {
        lcpObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const lastEntry = entries[entries.length - 1];
          setWebVitals((v) => ({ ...v, lcp: Math.round(lastEntry.startTime) }));
        });
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      } catch (_) {
        /* unsupported */
      }

      try {
        clsObserver = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
              setWebVitals((v) => ({
                ...v,
                cls: parseFloat(clsValue.toFixed(3)),
              }));
            }
          }
        });
        clsObserver.observe({ type: 'layout-shift', buffered: true });
      } catch (_) {
        /* unsupported */
      }

      try {
        fidObserver = new PerformanceObserver((entryList) => {
          const firstInput = entryList.getEntries()[0];
          if (firstInput) {
            const fid = firstInput.processingStart - firstInput.startTime;
            setWebVitals((v) => ({ ...v, fid: Math.round(fid) }));
          }
        });
        fidObserver.observe({ type: 'first-input', buffered: true });
      } catch (_) {
        /* unsupported */
      }
    }

    const navEntry = performance.getEntriesByType('navigation')[0];
    if (navEntry) {
      setWebVitals((v) => ({ ...v, ttfb: Math.round(navEntry.responseStart) }));
    }

    return () => {
      lcpObserver?.disconnect();
      clsObserver?.disconnect();
      fidObserver?.disconnect();
    };
  }, [paused, enabled.webVitals]);

  const recordProfile = () => {
    if (recording) return;
    setRecording(true);
    performance.clearMarks?.();
    performance.clearMeasures?.();
    performance.clearResourceTimings?.();
    let longEntries = [];
    let ltObserver;
    if (typeof PerformanceObserver !== 'undefined') {
      try {
        ltObserver = new PerformanceObserver((list) => {
          longEntries.push(
            ...list.getEntries().map((e) => ({ start: e.startTime, duration: e.duration }))
          );
        });
        ltObserver.observe({ entryTypes: ['longtask'] });
      } catch (_) {
        /* unsupported */
      }
    }
    const start = performance.now();
    setTimeout(() => {
      ltObserver?.disconnect();
      const profile = {
        timestamp: new Date().toISOString(),
        duration: performance.now() - start,
        metrics: {
          fps: fpsHistory.current,
          longTasks: longTaskHistory.current,
          memory: memoryHistory.current,
          network: networkHistory.current,
          webVitals,
          longTasksDetailed: longEntries,
          perf: performance.getEntries().map(({ name, entryType, startTime, duration }) => ({
            name,
            entryType,
            startTime,
            duration,
          })),
        },
      };
      const blob = new Blob([JSON.stringify(profile, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `profile-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setRecording(false);
    }, 5000);
  };

  const togglePause = () => setPaused((p) => !p);
  const toggleMetric = (m) => setEnabled((e) => ({ ...e, [m]: !e[m] }));
  const clearHistory = () => {
    fpsHistory.current = [];
    longTaskHistory.current = [];
    memoryHistory.current = [];
    networkHistory.current = [];
    setFps(null);
    setLongTasks(null);
    setMemory({ percent: null, hint: null });
    setNetworkBytes(null);
    setWebVitals({ fcp: null, lcp: null, cls: null, fid: null, ttfb: null });
  };

  return (
    <div className="h-full w-full flex flex-col bg-panel text-white">
      <div className="self-end m-2 flex space-x-2">
        <button className="px-2 py-1 bg-gray-700 rounded" onClick={togglePause}>
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button
          className="px-2 py-1 bg-gray-700 rounded"
          onClick={recordProfile}
          disabled={recording}
        >
          {recording ? 'Recording…' : 'Record Profile'}
        </button>
      </div>
      <div className="m-2 flex flex-wrap items-center space-x-4">
        {[
          ['fps', 'FPS'],
          ['longTasks', 'Long Tasks'],
          ['memory', 'Memory'],
          ['network', 'Network'],
          ['webVitals', 'Web Vitals'],
        ].map(([key, label]) => (
          <label key={key} className="flex items-center space-x-1">
            <input
              type="checkbox"
              checked={enabled[key]}
              onChange={() => toggleMetric(key)}
              aria-label={label}
            />
            <span className="text-sm">{label}</span>
          </label>
        ))}
        <button
          className="px-2 py-1 bg-gray-700 rounded"
          onClick={clearHistory}
        >
          Clear
        </button>
      </div>
      <div className="flex flex-wrap justify-evenly">
        {enabled.fps && <Metric label="FPS" value={fps} history={fpsHistory.current} />}
        {enabled.longTasks && (
          <Metric
            label="Long Tasks"
            value={longTasks}
            history={longTaskHistory.current}
            unit="ms"
          />
        )}
        {enabled.memory && (
          <Metric
            label="Memory"
            value={memory.percent}
            history={memoryHistory.current}
            unit="%"
            hint={memory.hint}
          />
        )}
        {enabled.network && (
          <div
            className="flex flex-col items-center m-2"
            data-testid="metric-network"
          >
            <div className="text-lg">
              {networkBytes !== null
                ? `${Math.round(networkBytes / 1024)} KB/s`
                : 'N/A'}
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
        )}
        {enabled.webVitals && (
          <>
            <Metric label="FCP" value={webVitals.fcp} history={[]} unit="ms" />
            <Metric label="LCP" value={webVitals.lcp} history={[]} unit="ms" />
            <Metric label="CLS" value={webVitals.cls} history={[]} />
            <Metric label="FID" value={webVitals.fid} history={[]} unit="ms" />
            <Metric label="TTFB" value={webVitals.ttfb} history={[]} unit="ms" />
          </>
        )}
      </div>
    </div>
  );
};

export default ResourceMonitor;

export const displayResourceMonitor = (addFolder, openApp) => (
  <ResourceMonitor addFolder={addFolder} openApp={openApp} />
);
