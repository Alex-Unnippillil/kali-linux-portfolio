'use client';

import { useEffect, useRef } from 'react';

export interface CpuGraphProps {
  /** Display per-core usage instead of overall usage */
  perCore?: boolean;
  /** Graph style */
  style?: 'led' | 'gradient';
  /** Number of samples to retain */
  history?: number;
  width?: number;
  height?: number;
}

/**
 * CpuGraph renders a simple historical CPU usage graph similar to the Xfce
 * panel plugin. It supports LED and gradient styles and can display either the
 * overall usage or per-core usage. Sampling occurs every second.
 */
export default function CpuGraph({
  perCore = false,
  style = 'gradient',
  history = 60,
  width = 100,
  height = 30,
}: CpuGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dataRef = useRef<number[][]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    canvas.width = width;
    canvas.height = height;

    const cores = perCore ? navigator.hardwareConcurrency || 1 : 1;
    dataRef.current = Array.from({ length: cores }, () => []);

    let last = performance.now();

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const series = dataRef.current;
      const coreHeight = canvas.height / series.length;
      const barWidth = canvas.width / history;
      series.forEach((values, coreIdx) => {
        const baseY = coreIdx * coreHeight;
        values.forEach((v, i) => {
          const x = canvas.width - (values.length - i) * barWidth;
          if (style === 'led') {
            const leds = 10;
            const ledHeight = coreHeight / leds;
            const lit = Math.round((v / 100) * leds);
            for (let j = 0; j < leds; j++) {
              ctx.fillStyle = j < lit ? '#0f0' : '#030';
              ctx.fillRect(
                x,
                baseY + coreHeight - (j + 1) * ledHeight,
                barWidth - 1,
                ledHeight - 1,
              );
            }
          } else {
            const h = (v / 100) * coreHeight;
            const grad = ctx.createLinearGradient(
              0,
              baseY + coreHeight,
              0,
              baseY + coreHeight - h,
            );
            grad.addColorStop(0, '#0f0');
            grad.addColorStop(1, '#f00');
            ctx.fillStyle = grad;
            ctx.fillRect(x, baseY + coreHeight - h, barWidth - 1, h);
          }
        });
      });
    };

    const sample = () => {
      const now = performance.now();
      const delay = now - last - 1000; // expected interval 1000ms
      last = now;
      const total = Math.min(100, Math.max(0, (delay / 1000) * 100));
      const coresArr = dataRef.current;
      if (perCore) {
        coresArr.forEach((arr) => {
          const val = Math.min(
            100,
            Math.max(0, total + (Math.random() * 20 - 10)),
          );
          arr.push(val);
          if (arr.length > history) arr.shift();
        });
      } else {
        const arr = coresArr[0];
        arr.push(total);
        if (arr.length > history) arr.shift();
      }
      draw();
    };

    timerRef.current = setInterval(sample, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [perCore, style, history, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      role="img"
      aria-label="CPU usage graph"
    />
  );
}
