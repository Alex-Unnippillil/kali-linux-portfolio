'use client';

import React, { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import { TILE, NUM_TILES_WIDE, initLane, updateCars, LaneDef } from './engine';

const WIDTH = TILE * NUM_TILES_WIDE;
const HEIGHT = TILE * 15;

const FroggerClient: React.FC = () => {
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    const app = new PIXI.Application({
      width: WIDTH,
      height: HEIGHT,
      background: '#222',
      antialias: true,
      resolution: window.devicePixelRatio,
      autoDensity: true,
    });

    const container = divRef.current as HTMLDivElement;
    container.innerHTML = '';
    container.appendChild(app.view as HTMLCanvasElement);

    const safeBottom = new PIXI.Graphics();
    safeBottom.beginFill(0x00ff00, 0.15);
    safeBottom.drawRect(0, HEIGHT - TILE, WIDTH, TILE);
    safeBottom.endFill();
    app.stage.addChild(safeBottom);

    const safeTop = new PIXI.Graphics();
    safeTop.beginFill(0x00ff00, 0.15);
    safeTop.drawRect(0, 0, WIDTH, TILE);
    safeTop.endFill();
    app.stage.addChild(safeTop);

    const frog = new PIXI.Graphics();
    frog.beginFill(0x00ff00);
    frog.drawRect(0, 0, TILE, TILE);
    frog.endFill();
    app.stage.addChild(frog);

    let frogPos = { x: WIDTH / 2 - TILE / 2, y: HEIGHT - TILE };
    frog.position.set(frogPos.x, frogPos.y);

    const key: Record<string, boolean> = {};
    const onKey = (e: KeyboardEvent) => {
      key[e.key] = e.type === 'keydown';
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);

    const laneDefs: LaneDef[] = [];
    for (let i = 0; i < 5; i++) {
      laneDefs.push({
        y: HEIGHT - TILE * (i + 2),
        dir: i % 2 ? -1 : 1,
        speed: 1 + Math.random(),
        spawnRate: 1 + Math.random(),
        length: 1 + Math.floor(Math.random() * 2),
        type: 'car',
        pattern: Math.random() > 0.5 ? 'wave' : 'straight',
      });
    }
    for (let i = 0; i < 5; i++) {
      laneDefs.push({
        y: TILE * (i + 1),
        dir: i % 2 ? 1 : -1,
        speed: 1 + Math.random(),
        spawnRate: 1 + Math.random(),
        length: 2 + Math.floor(Math.random() * 2),
        type: 'log',
        pattern: Math.random() > 0.5 ? 'wave' : 'straight',
      });
    }

    let lanes = laneDefs.map((d, i) => initLane(d, i));
    const baseSpeeds = lanes.map((l) => l.speed);
    const baseSpawns = lanes.map((l) => l.spawnRate);

    const laneContainers = lanes.map(() => {
      const c = new PIXI.Container();
      app.stage.addChild(c);
      return c;
    });

    let shake = 0;
    let difficulty = 1;

    const moveFrog = () => {
      if (key.ArrowLeft) frogPos.x = Math.max(0, frogPos.x - TILE);
      if (key.ArrowRight) frogPos.x = Math.min(WIDTH - TILE, frogPos.x + TILE);
      if (key.ArrowUp) frogPos.y = Math.max(0, frogPos.y - TILE);
      if (key.ArrowDown) frogPos.y = Math.min(HEIGHT - TILE, frogPos.y + TILE);
      frog.position.set(frogPos.x, frogPos.y);
      key.ArrowLeft = key.ArrowRight = key.ArrowUp = key.ArrowDown = false;
    };

    const tick = (delta: number) => {
      moveFrog();

      difficulty += delta / 6000;
      lanes.forEach((lane, i) => {
        lane.speed = baseSpeeds[i] * difficulty;
        lane.spawnRate = baseSpawns[i] / difficulty;
      });

      const { lanes: next, dead, frogDx } = updateCars(
        lanes,
        { x: frogPos.x, y: frogPos.y },
        delta / 60
      );
      lanes = next;
      frogPos.x += frogDx;
      frog.position.x = frogPos.x;

      lanes.forEach((lane, i) => {
        const container = laneContainers[i];
        lane.items.forEach((item, idx) => {
          let g = container.children[idx] as PIXI.Graphics;
          if (!g) {
            g = new PIXI.Graphics();
            g.beginFill(lane.type === 'car' ? 0xff0000 : 0x8b4513);
            g.drawRect(0, 0, item.width, TILE);
            g.endFill();
            container.addChild(g);
          }
          g.position.set(item.x, lane.y);
        });
        while (container.children.length > lane.items.length) {
          container.removeChildAt(container.children.length - 1);
        }
      });

      if (dead) {
        if (!prefersReducedMotion) shake = 10;
        frogPos = { x: WIDTH / 2 - TILE / 2, y: HEIGHT - TILE };
        frog.position.set(frogPos.x, frogPos.y);
      }

      safeBottom.alpha = frogPos.y === HEIGHT - TILE ? 0.3 : 0.15;
      safeTop.alpha = frogPos.y === 0 ? 0.3 : 0.15;

      if (shake > 0) {
        const s = (Math.random() - 0.5) * shake;
        app.stage.position.set(s, s);
        shake *= 0.9;
        if (shake < 1) app.stage.position.set(0, 0);
      }
    };

    app.ticker.add(tick);

    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
      app.destroy(true, { children: true });
    };
  }, []);

  return <div ref={divRef} />;
};

export default FroggerClient;
