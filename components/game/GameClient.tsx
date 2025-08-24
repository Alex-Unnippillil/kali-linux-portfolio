'use client';
import React, { useEffect, useRef } from 'react';
import { Application, Assets } from 'pixi.js';
import Matter from 'matter-js';
import { useGameWorker } from './useGameWorker';
import HUD from './HUD';
import TouchControls from './TouchControls';

const FIXED_STEP = 1000 / 60;

export default function GameClient() {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const lastTimeRef = useRef(0);
  const accumulatorRef = useRef(0);
  const worker = useGameWorker();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const app = new Application();
    app.init({ background: '#000', preference: 'webgpu' }).catch(() => {
      // Canvas fallback
      return app.init({ background: '#000', preference: 'canvas' });
    });

    appRef.current = app;
    container.appendChild(app.canvas);

    // Preload a placeholder texture to demonstrate sprite loading.
    Assets.add('placeholder', {
      src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PnhqvwAAAABJRU5ErkJggg=='
    });
    Assets.load('placeholder');

    // Headless Matter.js engine
    const engine = Matter.Engine.create();

    let running = true;
    const tick = (time: number) => {
      if (!running) return;
      const delta = time - lastTimeRef.current;
      lastTimeRef.current = time;
      accumulatorRef.current += delta;
      while (accumulatorRef.current >= FIXED_STEP) {
        Matter.Engine.update(engine, FIXED_STEP);
        accumulatorRef.current -= FIXED_STEP;
      }
      app.render();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    // Hand off canvas to worker if supported
    if (worker && app.canvas.transferControlToOffscreen) {
      const offscreen = app.canvas.transferControlToOffscreen();
      worker.postMessage({ canvas: offscreen }, [offscreen]);
    }

    return () => {
      running = false;
      app.destroy();
    };
  }, [worker]);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <HUD />
      <TouchControls />
    </div>
  );
}
