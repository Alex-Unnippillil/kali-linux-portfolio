'use client';
import React, { useEffect, useRef } from 'react';
import { Application, Assets } from 'pixi.js';
import Matter from 'matter-js';
import { useGameWorker } from './useGameWorker';
import HUD from './HUD';
import TouchControls from './TouchControls';
import { startGameLoop } from '@lib/game';

export default function GameClient() {
  const containerRef = useRef<HTMLDivElement>(null);
  const worker = useGameWorker();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const app = new Application();
    app.init({ background: '#000', preference: 'webgpu' }).catch(() => {
      // Canvas fallback
      return app.init({ background: '#000', preference: 'canvas' });
    });

    container.appendChild(app.canvas);

    // Preload a placeholder texture to demonstrate sprite loading.
    Assets.add('placeholder', {
      src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PnhqvwAAAABJRU5ErkJggg=='
    });
    Assets.load('placeholder');

    // Headless Matter.js engine
    const engine = Matter.Engine.create();

    const stopLoop = startGameLoop({
      fps: 60,
      update: (dt) => Matter.Engine.update(engine, dt * 1000),
      render: () => app.render(),
    });

    // Hand off canvas to worker if supported
    if (worker && app.canvas.transferControlToOffscreen) {
      const offscreen = app.canvas.transferControlToOffscreen();
      worker.postMessage({ canvas: offscreen }, [offscreen]);
    }

    return () => {
      stopLoop();
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
