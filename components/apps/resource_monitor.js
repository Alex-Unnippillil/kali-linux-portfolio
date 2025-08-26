import React, { useEffect, useState } from 'react';

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
  const [memoryUsage, setMemoryUsage] = useState(0);
  const [cpuUsage, setCpuUsage] = useState(null);
  const [resourceTimings, setResourceTimings] = useState([]);
  const [paintTimings, setPaintTimings] = useState([]);
  const [longTaskCount, setLongTaskCount] = useState(0);

  const updateStats = async () => {
    if (navigator.getBattery) {
      try {
        const battery = await navigator.getBattery();
        setBatteryLevel(Math.round(battery.level * 100));
      } catch (e) {
        // navigator.getBattery may reject on unsupported browsers
      }
    }

    if (performance && performance.memory) {
      const { usedJSHeapSize, totalJSHeapSize } = performance.memory;
      setMemoryUsage(Math.round((usedJSHeapSize / totalJSHeapSize) * 100));
    }

    if (typeof performance !== 'undefined' && performance.now) {
      const start = performance.now();
      setTimeout(() => {
        const end = performance.now();
        const delay = end - start - 100;
        const usage = Math.min(100, Math.max(0, (delay / 100) * 100));
        setCpuUsage(Math.round(usage));
      }, 100);
    }
  };

  useEffect(() => {
    updateStats();
    const interval = setInterval(updateStats, 5000);

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
        clearInterval(interval);
        resourceObserver.disconnect();
        paintObserver.disconnect();
        longTaskObserver.disconnect();
      };
    }

    return () => clearInterval(interval);
  }, []);

  const clearMetrics = () => {
    setResourceTimings([]);
    setPaintTimings([]);
    setLongTaskCount(0);
    if (performance.clearResourceTimings) {
      performance.clearResourceTimings();
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-ub-cool-grey text-white font-ubuntu">
      <div className="flex justify-evenly items-center flex-1">
        <Gauge value={batteryLevel} label="Battery" />
        {cpuUsage !== null && <Gauge value={cpuUsage} label="CPU" />}
        <Gauge value={memoryUsage} label="Memory" />
      </div>
      <div className="bg-ub-dark-grey p-4 text-sm overflow-y-auto max-h-60">
        <div>
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
