'use client';
import React, { useEffect, useState } from 'react';

interface Info {
  cpuPercent: number;
  ramPercent: number;
  swapPercent: number;
  uptime: number;
  descriptions: Record<string, string>;
}

const formatUptime = (secs: number) => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  return `${h}h ${m}m ${s}s`;
};

const Bar = ({ label, percent, color, desc, uptime }: { label: string; percent: number; color: string; desc: string; uptime: number; }) => (
  <div className="w-full mb-4">
    <div className="flex justify-between mb-1">
      <span>{label}</span>
      <span>{percent.toFixed(1)}%</span>
    </div>
    <div
      className="h-4 w-full flex bg-ub-dark-grey"
      title={`Uptime: ${formatUptime(uptime)}\n${desc}`}
    >
      <div
        className="h-full"
        style={{
          width: `${percent}%`,
          backgroundColor: color,
          transition: 'width 2s',
        }}
      />
      <div className="h-full flex-1" />
    </div>
  </div>
);

export default function ResourceBars() {
  const [info, setInfo] = useState<Info>({
    cpuPercent: 0,
    ramPercent: 0,
    swapPercent: 0,
    uptime: 0,
    descriptions: { cpu: '', ram: '', swap: '' },
  });

  useEffect(() => {
    let handle: NodeJS.Timeout;
    const fetchInfo = async () => {
      try {
        const res = await fetch('/api/system');
        const json = await res.json();
        setInfo(json);
      } catch {
        /* ignore */
      }
    };
    fetchInfo();
    handle = setInterval(fetchInfo, 2000);
    return () => clearInterval(handle);
  }, []);

  return (
    <div className="p-4 text-white font-ubuntu">
      <Bar label="CPU" percent={info.cpuPercent} color="#00ff00" desc={info.descriptions.cpu} uptime={info.uptime} />
      <Bar label="RAM" percent={info.ramPercent} color="#ffd700" desc={info.descriptions.ram} uptime={info.uptime} />
      <Bar label="Swap" percent={info.swapPercent} color="#ff00ff" desc={info.descriptions.swap} uptime={info.uptime} />
    </div>
  );
}

export const displayResourceBars = (addFolder: any, openApp: any) => (
  <ResourceBars addFolder={addFolder} openApp={openApp} />
);
