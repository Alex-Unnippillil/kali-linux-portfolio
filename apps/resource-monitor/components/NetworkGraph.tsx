'use client';

import React, { useEffect, useRef, useState } from 'react';

const WIDTH = 80;
const HEIGHT = 20;
const POINTS = 20;

export default function NetworkGraph() {
  const [data, setData] = useState<number[]>(Array(POINTS).fill(0));
  const dataRef = useRef<number[]>(Array(POINTS).fill(0));
  const seedRef = useRef(1);

  const random = () => {
    seedRef.current = (seedRef.current * 16807) % 2147483647;
    return seedRef.current / 2147483647;
  };

  useEffect(() => {
    let frame: number;
    const tick = () => {
      const connection = (navigator as any)?.connection;
      const downlink = typeof connection?.downlink === 'number' ? connection.downlink : null;
      const val = downlink ?? random();
      const next = [...dataRef.current.slice(1), val];
      dataRef.current = next;
      frame = requestAnimationFrame(() => setData(next));
    };

    const interval = setInterval(tick, 1000);
    tick();
    return () => {
      clearInterval(interval);
      cancelAnimationFrame(frame);
    };
  }, []);

  const max = Math.max(...data, 1);
  const points = data
    .map((v, i) => {
      const x = (i / (POINTS - 1)) * WIDTH;
      const y = HEIGHT - (v / max) * HEIGHT;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={WIDTH} height={HEIGHT} className="block">
      <polyline
        points={points}
        fill="none"
        stroke="var(--kali-green, #00ff00)"
        strokeWidth="1"
      />
    </svg>
  );
}

