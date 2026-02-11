'use client';

import { useEffect, useRef } from 'react';
import { safeEvaluate } from '../engine';

interface Props {
  expression: string;
  angleUnit: 'deg' | 'rad';
}

export default function GraphPanel({ expression, angleUnit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'color-mix(in srgb, var(--kali-text) 45%, transparent)';
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();

    ctx.strokeStyle = 'var(--color-accent)';
    ctx.beginPath();
    let first = true;
    for (let px = 0; px < canvas.width; px += 1) {
      const x = (px - canvas.width / 2) / 24;
      const sample = expression.replace(/\bx\b/gi, `(${x})`);
      const evaluated = safeEvaluate(sample, { mode: 'scientific', angleUnit });
      if (!evaluated.ok) {
        first = true;
        continue;
      }
      const y = Number(evaluated.value);
      if (!Number.isFinite(y)) {
        first = true;
        continue;
      }
      const py = canvas.height / 2 - y * 24;
      if (first) {
        ctx.moveTo(px, py);
        first = false;
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.stroke();
  }, [expression, angleUnit]);

  return (
    <section className="rounded-xl border border-[color:var(--kali-border)] bg-[var(--kali-overlay)] p-3">
      <h3 className="mb-2 text-xs uppercase tracking-[0.2em]">Graph (x only)</h3>
      <canvas ref={canvasRef} width={480} height={220} className="w-full rounded border border-[color:var(--kali-border)] bg-[var(--kali-panel)]" />
    </section>
  );
}
