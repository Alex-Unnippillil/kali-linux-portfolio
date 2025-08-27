import React, { useEffect, useState, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';

const Gauge = ({ value, label }) => {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  return (
    <div className="flex flex-col items-center">
      <svg width="120" height="120">
        <circle
          cx="60"
          cy="60"
          r={radius}
          className="stroke-ub-dark-grey"
          strokeWidth="10"
          fill="none"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          className="stroke-ubt-green"
          strokeWidth="10"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
        <text
          x="60"
          y="65"
          textAnchor="middle"
          className="fill-white text-[20px]"
        >
          {value}%
        </text>
      </svg>
      <span className="mt-2 text-white">{label}</span>
    </div>
  );
};

const ResourceMonitor = () => {
  const [batteryLevel, setBatteryLevel] = useState(0);
  const [supportsBattery, setSupportsBattery] = useState(true);
  const [memoryUsage, setMemoryUsage] = useState(null);
  const [supportsMemory, setSupportsMemory] = useState(false);
  const [cpuUsage, setCpuUsage] = useState(null);
  const [resourceTimings, setResourceTimings] = useState([]);
  const [paintTimings, setPaintTimings] = useState([]);
  const [longTaskCount, setLongTaskCount] = useState(0);
  const [downloadRates, setDownloadRates] = useState([]);
  const [uploadRates, setUploadRates] = useState([]);
  const [cpuHistory, setCpuHistory] = useState([]);
  const [memoryHistory, setMemoryHistory] = useState([]);
  const [fps, setFps] = useState(null);
  const [fpsHistory, setFpsHistory] = useState([]);
  const [intervalMs, setIntervalMs] = useState(5000);
  const [isPaused, setIsPaused] = useState(false);
  const chartRef = useRef(null);

  const updateStats = async () => {
    if (isPaused) return;

    if (navigator.getBattery) {
      try {
        const battery = await navigator.getBattery();
        setBatteryLevel(Math.round(battery.level * 100));
        setSupportsBattery(true);
      } catch (e) {
        setSupportsBattery(false);
      }
    } else {
      setSupportsBattery(false);
    }

    let memoryPercent = null;
    if (performance && performance.memory) {
      const { usedJSHeapSize, totalJSHeapSize } = performance.memory;
      memoryPercent = Math.round((usedJSHeapSize / totalJSHeapSize) * 100);
      setSupportsMemory(true);
    } else if (performance && performance.measureUserAgentSpecificMemory) {
      try {
        const result = await performance.measureUserAgentSpecificMemory();
        const used = result.bytes;
        const total =
          (navigator.deviceMemory || 0) * 1024 * 1024 * 1024 || used;
        memoryPercent = Math.round((used / total) * 100);
        setSupportsMemory(true);
      } catch (e) {
        setSupportsMemory(false);
      }
    } else {
      setSupportsMemory(false);
    }
    if (memoryPercent !== null) {
      setMemoryUsage(memoryPercent);
      setMemoryHistory((prev) => [...prev.slice(-19), memoryPercent]);
    }

    if (typeof performance !== 'undefined' && performance.now) {
      const start = performance.now();
      setTimeout(() => {
        const end = performance.now();
        const delay = end - start - 100;
        const usage = Math.min(100, Math.max(0, (delay / 100) * 100));
        const cpuVal = Math.round(usage);
        setCpuUsage(cpuVal);
        setCpuHistory((prev) => [...prev.slice(-19), cpuVal]);
        if (fps !== null) {
          setFpsHistory((prev) => [...prev.slice(-19), fps]);
        }
      }, 100);
    }

    const connection =
      navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection) {
      const download = connection.downlink || 0;
      const upload = connection.upload || connection.uplink || connection.upLink || download / 2;
      setDownloadRates((prev) => [...prev.slice(-19), download]);
      setUploadRates((prev) => [...prev.slice(-19), upload]);
    }
  };

  useEffect(() => {
    updateStats();
    if (isPaused) return;
    const interval = setInterval(updateStats, intervalMs);
    return () => clearInterval(interval);
  }, [intervalMs, isPaused]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.requestAnimationFrame) {
      return;
    }
    let frame = 0;
    let last = performance.now();
    let rafId;
    const loop = (now) => {
      if (!isPaused) {
        frame++;
        const delta = now - last;
        if (delta >= 1000) {
          const fpsNow = (frame * 1000) / delta;
          setFps(Math.round(fpsNow));
          frame = 0;
          last = now;
        }
      } else {
        last = now;
        frame = 0;
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [isPaused]);

  useEffect(() => {
    if (typeof performance !== 'undefined' && typeof PerformanceObserver !== 'undefined') {
      const existingResources = performance.getEntriesByType('resource');
      const existingPaints = performance.getEntriesByType('paint');
      setResourceTimings(existingResources.map(({ name, duration }) => ({ name, duration })));
      setPaintTimings(existingPaints.map(({ name, startTime }) => ({ name, startTime })));

      const resourceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries().map(({ name, duration }) => ({ name, duration }));
        setResourceTimings((prev) => [...prev, ...entries]);
      });
      resourceObserver.observe({ entryTypes: ['resource'] });

      const paintObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries().map(({ name, startTime }) => ({ name, startTime }));
        setPaintTimings((prev) => [...prev, ...entries]);
      });
      paintObserver.observe({ entryTypes: ['paint'] });

      const longTaskObserver = new PerformanceObserver((list) => {
        setLongTaskCount((prev) => prev + list.getEntries().length);
      });
      longTaskObserver.observe({ entryTypes: ['longtask'] });

      return () => {
        resourceObserver.disconnect();
        paintObserver.disconnect();
        longTaskObserver.disconnect();
      };
    }
  }, []);

  const clearMetrics = () => {
    setResourceTimings([]);
    setPaintTimings([]);
    setLongTaskCount(0);
    setDownloadRates([]);
    setUploadRates([]);
    setCpuHistory([]);
    setMemoryHistory([]);
    setFpsHistory([]);
    if (performance.clearResourceTimings) {
      performance.clearResourceTimings();
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-ub-cool-grey text-white font-ubuntu">
        <div className="p-2 bg-ub-dark-grey text-sm flex items-center">
          <label className="mr-2">Update interval (ms):</label>
          <input
            type="number"
            value={intervalMs}
            onChange={(e) => setIntervalMs(Number(e.target.value))}
            className="w-24 bg-black text-white px-1 rounded mr-2"
          />
          <button
            onClick={() => setIsPaused((p) => !p)}
            className="px-2 py-1 bg-ubt-green text-black rounded"
          >
            {isPaused ? 'Resume' : 'Pause'}
          </button>
        </div>
        <div className="flex justify-evenly items-center flex-1">
          {supportsBattery && <Gauge value={batteryLevel} label="Battery" />}
          {cpuUsage !== null && <Gauge value={cpuUsage} label="CPU" />}
          {supportsMemory && memoryUsage !== null && (
            <Gauge value={memoryUsage} label="Memory" />
          )}
          {fps !== null && <Gauge value={fps} label="FPS" />}
        </div>
        <div className="bg-ub-dark-grey p-4 text-sm overflow-y-auto max-h-60">
          <div>
            <strong>Metrics</strong>
            <Line
              ref={chartRef}
              data={{
                labels: cpuHistory.map((_, i) => i.toString()),
                datasets: [
                  {
                    label: 'CPU %',
                    data: cpuHistory,
                    borderColor: '#f87171',
                    backgroundColor: 'transparent',
                    yAxisID: 'y',
                  },
                  ...(supportsMemory
                    ? [
                        {
                          label: 'Memory %',
                          data: memoryHistory,
                          borderColor: '#21c5c7',
                          backgroundColor: 'transparent',
                          yAxisID: 'y',
                        },
                      ]
                    : []),
                  ...(fpsHistory.length
                    ? [
                        {
                          label: 'FPS',
                          data: fpsHistory,
                          borderColor: '#f953c6',
                          backgroundColor: 'transparent',
                          yAxisID: 'y1',
                        },
                      ]
                    : []),
                  ...(downloadRates.length
                    ? [
                        {
                          label: 'Download (Mbps)',
                          data: downloadRates,
                          borderColor: '#06b6d4',
                          backgroundColor: 'transparent',
                          yAxisID: 'y2',
                        },
                      ]
                    : []),
                  ...(uploadRates.length
                    ? [
                        {
                          label: 'Upload (Mbps)',
                          data: uploadRates,
                          borderColor: '#d946ef',
                          backgroundColor: 'transparent',
                          yAxisID: 'y2',
                        },
                      ]
                    : []),
                ],
              }}
              options={{
                animation: false,
                responsive: true,
                scales: {
                  y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: { color: '#fff' },
                  },
                  y1: {
                    beginAtZero: true,
                    position: 'right',
                    ticks: { color: '#fff' },
                    grid: { drawOnChartArea: false },
                  },
                  y2: {
                    beginAtZero: true,
                    position: 'right',
                    ticks: { color: '#fff' },
                    grid: { drawOnChartArea: false },
                  },
                },
                plugins: {
                  legend: { labels: { color: '#fff' } },
                },
              }}
            />
            <button
              onClick={() => {
                if (!chartRef.current) return;
                const url = chartRef.current.toBase64Image();
                const link = document.createElement('a');
                link.href = url;
                link.download = 'metrics.png';
                link.click();
              }}
              className="mt-2 px-2 py-1 bg-ubt-blue text-black rounded"
            >
              Export PNG
            </button>
          </div>
        <div className="mt-4">
          <strong>Resource Timings</strong>
          <ul className="list-disc pl-5">
            {resourceTimings.map((r, idx) => (
              <li key={idx}>{`${r.name}: ${r.duration.toFixed(1)}ms`}</li>
            ))}
          </ul>
        </div>
        <div className="mt-2">
          <strong>Paint Timings</strong>
          <ul className="list-disc pl-5">
            {paintTimings.map((p, idx) => (
              <li key={idx}>{`${p.name}: ${p.startTime.toFixed(1)}ms`}</li>
            ))}
          </ul>
        </div>
        <div className="mt-2">Long Tasks: {longTaskCount}</div>
        <button
          onClick={clearMetrics}
          className="mt-2 px-2 py-1 bg-ubt-green text-black rounded"
        >
          Clear metrics
        </button>
        <a
          href="https://developer.chrome.com/docs/devtools/memory-problems/"
          target="_blank"
          rel="noopener"
          className="mt-2 block text-ubt-blue underline"
        >
          Learn about memory leaks
        </a>
      </div>
    </div>
  );
};

export default ResourceMonitor;

export const displayResourceMonitor = (addFolder, openApp) => {
  return <ResourceMonitor addFolder={addFolder} openApp={openApp} />;
};
