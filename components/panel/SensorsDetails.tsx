'use client';

import React, { useEffect, useRef, useState } from 'react';
import Window from '../base/window';

interface SensorInfo {
  id: string;
  label: string;
  enabled: boolean;
  history: number[];
}

const INITIAL_SENSORS: SensorInfo[] = [
  { id: 'cpu', label: 'CPU Usage', enabled: true, history: [] },
  { id: 'memory', label: 'Memory Usage', enabled: true, history: [] },
  { id: 'temp', label: 'Temperature', enabled: true, history: [] },
];

function HistoryGraph({ data, label }: { data: number[]; label: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(
      '--kali-panel'
    );
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 5; i++) {
      const y = (height / 5) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    if (data.length > 0) {
      const maxVal = Math.max(...data);
      const style = getComputedStyle(document.documentElement);
      ctx.strokeStyle = style.getPropertyValue('--color-terminal');
      ctx.lineWidth = 2;
      ctx.beginPath();
      data.forEach((v, i) => {
        const x = (i / (data.length - 1 || 1)) * width;
        const y = height - (v / (maxVal || 1)) * height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(
      '--color-text'
    );
    ctx.font = '10px sans-serif';
    ctx.fillText(label, 4, 12);
  }, [data, label]);

  return (
    <div
      className="w-full max-w-[300px] h-[100px]"
      style={{ background: 'var(--kali-panel)' }}
    >
      <canvas
        ref={canvasRef}
        width={300}
        height={100}
        className="w-full h-full"
      />
    </div>
  );
}

export default function SensorsDetails() {
  const [open, setOpen] = useState(false);
  const [sensors, setSensors] = useState<SensorInfo[]>(INITIAL_SENSORS);

  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => {
      setSensors((prev) =>
        prev.map((s) => {
          if (!s.enabled) return s;
          const next = Math.max(
            0,
            Math.min(100, (s.history[s.history.length - 1] || 50) + (Math.random() * 20 - 10))
          );
          const history = [...s.history, next].slice(-30);
          return { ...s, history };
        })
      );
    }, 1000);
    return () => clearInterval(id);
  }, [open]);

  const toggleSensor = (id: string) => {
    setSensors((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const renderContent = () => (
    <div className="p-4 text-xs text-white space-y-4">
      <ul className="space-y-4">
        {sensors.map((sensor) => (
          <li key={sensor.id}>
            <div className="flex items-center justify-between mb-1">
              <span>{sensor.label}</span>
              <label className="flex items-center space-x-1">
                <input
                  type="checkbox"
                  checked={sensor.enabled}
                  onChange={() => toggleSensor(sensor.id)}
                />
                <span>Show</span>
              </label>
            </div>
            {sensor.enabled && (
              <HistoryGraph data={sensor.history} label={sensor.label} />
            )}
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(true)}
        className="px-2 py-1 rounded hover:bg-ubt-grey text-white"
        aria-label="Sensors panel item"
      >
        Sensors
      </button>
      {open && (
        <Window
          id="sensors-details"
          title="Sensors"
          screen={renderContent}
          closed={() => setOpen(false)}
          focus={() => {}}
          hasMinimised={() => {}}
          hideSideBar={() => {}}
          openApp={() => {}}
          resizable
          allowMaximize={false}
          defaultWidth={40}
          defaultHeight={60}
        />
      )}
    </div>
  );
}

