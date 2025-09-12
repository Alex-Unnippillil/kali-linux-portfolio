'use client';

import React, { useEffect, useRef, useState } from 'react';

// Simple seeded PRNG (mulberry32)
function createPRNG(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MAX_POINTS = 60;

function drawChart(
  canvas: HTMLCanvasElement | null,
  values: number[],
  color: string,
  label: string,
  maxVal: number,
) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  values.forEach((v, i) => {
    const x = (i / (values.length - 1 || 1)) * w;
    const y = h - (v / maxVal) * h;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  const latest = values[values.length - 1] || 0;
  ctx.fillStyle = '#ffffff';
  ctx.font = '12px sans-serif';
  ctx.fillText(`${label}: ${latest.toFixed(1)}`, 4, 12);
}

export default function SystemMonitorApp() {
  const cpuRef = useRef<HTMLCanvasElement>(null);
  const ramRef = useRef<HTMLCanvasElement>(null);
  const netRef = useRef<HTMLCanvasElement>(null);

  const cpuRand = useRef(createPRNG(1)).current;
  const ramRand = useRef(createPRNG(2)).current;
  const netRand = useRef(createPRNG(3)).current;

  const dataRef = useRef({ cpu: [] as number[], ram: [] as number[], net: [] as number[] });
  const lastFrame = useRef(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    let raf: number;
    const animate = (time: number) => {
      if (time - lastFrame.current >= 1000 / 60) {
        lastFrame.current = time;
        if (!paused && !document.hidden) {
          const push = (arr: number[], v: number) => {
            arr.push(v);
            if (arr.length > MAX_POINTS) arr.shift();
          };
          push(dataRef.current.cpu, cpuRand() * 100);
          push(dataRef.current.ram, ramRand() * 100);
          push(dataRef.current.net, netRand() * 1000);
          drawChart(cpuRef.current, dataRef.current.cpu, '#ff5555', 'CPU %', 100);
          drawChart(ramRef.current, dataRef.current.ram, '#55ff55', 'RAM %', 100);
          drawChart(netRef.current, dataRef.current.net, '#5599ff', 'Net kB/s', 1000);
        }
      }
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [paused]);

  // Ensure animation pauses when tab is hidden
  useEffect(() => {
    const handleVis = () => {
      if (document.hidden) {
        // no-op: animate loop checks document.hidden
      }
    };
    document.addEventListener('visibilitychange', handleVis);
    return () => document.removeEventListener('visibilitychange', handleVis);
  }, []);

  return (
    <div className="h-full w-full bg-ub-cool-grey text-white flex flex-col">
      <div className="p-2">
        <button
          onClick={() => setPaused((p) => !p)}
          className="px-2 py-1 bg-ub-dark-grey rounded"
        >
          {paused ? 'Resume' : 'Pause'}
        </button>
      </div>
      <div className="flex-1 flex items-center justify-evenly p-4 gap-4">
        <canvas
          ref={cpuRef}
          width={300}
          height={100}
          role="img"
          aria-label="CPU usage chart"
          className="bg-ub-dark-grey"
        />
        <canvas
          ref={ramRef}
          width={300}
          height={100}
          role="img"
          aria-label="RAM usage chart"
          className="bg-ub-dark-grey"
        />
        <canvas
          ref={netRef}
          width={300}
          height={100}
          role="img"
          aria-label="Network chart"
          className="bg-ub-dark-grey"
        />
      </div>
    </div>
  );
}

