import React, { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import {
  project,
  findSegment,
  Segment,
  segmentLength,
  Point3D,
} from './projection';

const WIDTH = 800;
const HEIGHT = 450;
const CAMERA_HEIGHT = 1000;
const ROAD_WIDTH = 2000;
const DRAW_DISTANCE = 200;
const CAMERA_DEPTH = 1 / Math.tan(Math.PI / 4 / 2);

function buildTrack(): Segment[] {
  const segments: Segment[] = [];
  for (let i = 0; i < 500; i++) {
    const curve = i > 100 && i < 150 ? 0.5 : i > 200 && i < 250 ? -0.5 : 0;
    const y = i > 300 && i < 340 ? 400 : 0;
    const z = i * segmentLength;
    segments.push({
      index: i,
      curve,
      y,
      p1: { x: 0, y, z },
      p2: { x: 0, y, z: z + segmentLength },
    });
  }
  return segments;
}

interface Car {
  z: number;
  offset: number;
}

const PixiRacer: React.FC = () => {
  const divRef = useRef<HTMLDivElement>(null);
  const [speed, setSpeed] = useState(0);
  const [time, setTime] = useState(0);
  const positionRef = useRef(0);
  const speedRef = useRef(0);
  const playerXRef = useRef(0);
  const keyRef = useRef({ left: false, right: false, accel: false });
  const settingsRef = useRef({ fog: true });

  useEffect(() => {
    const app = new PIXI.Application({
      width: WIDTH,
      height: HEIGHT,
      background: '#80d0ff',
      antialias: true,
      resolution: window.devicePixelRatio,
      autoDensity: true,
    });
    const container = divRef.current as HTMLDivElement;
    container.innerHTML = '';
    container.appendChild(app.view as HTMLCanvasElement);
    app.ticker.maxFPS = 60;

    const segments = buildTrack();
    const road = new PIXI.ParticleContainer(DRAW_DISTANCE * 4, {
      tint: true,
      vertices: true,
    });
    app.stage.addChild(road);

    const cars: Car[] = [
      { z: segmentLength * 20, offset: 0.5 },
      { z: segmentLength * 40, offset: -0.5 },
    ];

    const carGraphics: PIXI.Graphics[] = [];

    const start = performance.now();
    app.ticker.add((delta) => {
      const dt = delta / 60;
      const playerSpeed = keyRef.current.accel
        ? Math.min(400, speedRef.current + 200 * dt)
        : Math.max(0, speedRef.current - 120 * dt);
      speedRef.current = playerSpeed;
      positionRef.current += playerSpeed * dt;
      setSpeed(playerSpeed);
      setTime((performance.now() - start) / 1000);

      if (keyRef.current.left) playerXRef.current -= dt * 150;
      if (keyRef.current.right) playerXRef.current += dt * 150;
      playerXRef.current = Math.max(
        -ROAD_WIDTH / 2,
        Math.min(ROAD_WIDTH / 2, playerXRef.current)
      );

      const baseSegment = findSegment(positionRef.current, segments);
      const baseIndex = baseSegment.index;
      let x = 0;
      let dx = -baseSegment.curve;
      road.removeChildren();

      for (let n = 0; n < DRAW_DISTANCE; n++) {
        const seg = segments[(baseIndex + n) % segments.length];
        seg.p1.x = x;
        seg.p1.y = seg.y;
        seg.p1.z = seg.index * segmentLength;
        x += dx;
        dx += seg.curve;
        seg.p2.x = x;
        seg.p2.y = seg.y;
        seg.p2.z = (seg.index + 1) * segmentLength;

        const p1 = project(
          seg.p1,
          playerXRef.current,
          CAMERA_HEIGHT,
          positionRef.current,
          CAMERA_DEPTH,
          WIDTH,
          HEIGHT
        );
        const p2 = project(
          seg.p2,
          playerXRef.current,
          CAMERA_HEIGHT,
          positionRef.current,
          CAMERA_DEPTH,
          WIDTH,
          HEIGHT
        );
        const r1 = ROAD_WIDTH * p1.scale;
        const r2 = ROAD_WIDTH * p2.scale;

        const g = new PIXI.Graphics();
        g.beginFill(0x303030);
        g.moveTo(p1.x - r1, p1.y);
        g.lineTo(p2.x - r2, p2.y);
        g.lineTo(p2.x + r2, p2.y);
        g.lineTo(p1.x + r1, p1.y);
        g.closePath();
        g.endFill();
        if (settingsRef.current.fog) g.alpha = 1 - n / DRAW_DISTANCE;
        road.addChild(g);

        if (n % 20 === 0) {
          const tree = new PIXI.Graphics();
          tree.beginFill(0x006600).drawRect(-20, -40, 40, 40).endFill();
          tree.x = p2.x + r2 * 1.2;
          tree.y = p2.y;
          tree.scale.set(p2.scale, p2.scale);
          road.addChild(tree);
        }
      }

      carGraphics.forEach((c) => c.destroy());
      carGraphics.length = 0;
      cars.forEach((car) => {
        const seg = findSegment(car.z, segments);
        const wx = seg.p1.x + car.offset * ROAD_WIDTH;
        const p = project(
          { x: wx, y: seg.y, z: car.z },
          playerXRef.current,
          CAMERA_HEIGHT,
          positionRef.current,
          CAMERA_DEPTH,
          WIDTH,
          HEIGHT
        );
        const cg = new PIXI.Graphics();
        cg.beginFill(0x00ff00).drawRect(-20, -10, 40, 20).endFill();
        cg.x = p.x;
        cg.y = p.y;
        cg.scale.set(p.scale, p.scale);
        road.addChild(cg);
        carGraphics.push(cg);
        if (
          Math.abs(car.z - positionRef.current) < segmentLength &&
          Math.abs(wx - playerXRef.current) < 40
        ) {
          speedRef.current *= 0.5;
        }
      });
    });

    const keyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') keyRef.current.left = true;
      if (e.key === 'ArrowRight') keyRef.current.right = true;
      if (e.key === 'ArrowUp') keyRef.current.accel = true;
    };
    const keyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') keyRef.current.left = false;
      if (e.key === 'ArrowRight') keyRef.current.right = false;
      if (e.key === 'ArrowUp') keyRef.current.accel = false;
    };
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);

    return () => {
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      app.destroy(true, { children: true });
    };
  }, []);

  const handleTouch = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const mid = rect.width / 2;
    keyRef.current.left = x < mid - 10;
    keyRef.current.right = x > mid + 10;
    keyRef.current.accel = true;
  };
  const endTouch = () => {
    keyRef.current.left = false;
    keyRef.current.right = false;
    keyRef.current.accel = false;
  };

  return (
    <div className="relative w-full h-full text-white">
      <div ref={divRef} />
      <div className="absolute top-2 left-2 text-xs">
        Speed: {Math.round(speed)}
        <br />
        Time: {time.toFixed(1)}s
      </div>
      <div className="absolute top-2 right-2 text-xs">
        <label className="mr-1">
          <input
            type="checkbox"
            checked={settingsRef.current.fog}
            onChange={(e) => (settingsRef.current.fog = e.target.checked)}
          />
          Fog
        </label>
      </div>
      <div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 w-32 h-32 bg-white/20 rounded-full touch-none"
        onPointerDown={handleTouch}
        onPointerMove={handleTouch}
        onPointerUp={endTouch}
        onPointerLeave={endTouch}
      />
    </div>
  );
};

export default PixiRacer;
