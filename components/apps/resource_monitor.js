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
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full w-full flex justify-evenly items-center bg-ub-cool-grey text-white font-ubuntu">
      <Gauge value={batteryLevel} label="Battery" />
      {cpuUsage !== null && <Gauge value={cpuUsage} label="CPU" />}
      <Gauge value={memoryUsage} label="Memory" />
    </div>
  );
};

export default ResourceMonitor;

export const displayResourceMonitor = (addFolder, openApp) => {
  return <ResourceMonitor addFolder={addFolder} openApp={openApp} />;
};
