import React, { useEffect, useRef } from 'react';
import type * as PIXI from 'pixi.js';
import {
  project,
  findSegment,
  Segment,
  segmentLength,
} from '../pixi-racer/projection';

interface LineCheckpoint { x: number; y1: number; y2: number }

export const CHECKPOINTS: LineCheckpoint[] = [
  { x: 100, y1: 250, y2: 350 },
  { x: 400, y1: 250, y2: 350 },
  { x: 700, y1: 250, y2: 350 },
];

const crosses = (
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  cp: LineCheckpoint
) => {
  if ((p1.x < cp.x && p2.x >= cp.x) || (p2.x < cp.x && p1.x >= cp.x)) {
    const y = p1.y + ((p2.y - p1.y) * (cp.x - p1.x)) / (p2.x - p1.x);
    return y >= cp.y1 && y <= cp.y2;
  }
  return false;
};

export function advanceCheckpoints(
  prev: { x: number; y: number },
  curr: { x: number; y: number },
  next: number,
  lapLineCrossed: boolean,
  list: LineCheckpoint[] = CHECKPOINTS
) {
  let lapStarted = false;
  let lapCompleted = false;
  if (!lapLineCrossed && crosses(prev, curr, list[0])) {
    lapLineCrossed = true;
    lapStarted = true;
    next = 1;
  } else if (crosses(prev, curr, list[next])) {
    next += 1;
    if (next >= list.length) {
      lapCompleted = true;
      lapLineCrossed = false;
      next = 0;
    }
  }
  return { nextCheckpoint: next, lapLineCrossed, lapStarted, lapCompleted };
}

// ---- outrun style renderer ----

const WIDTH = 800;
const HEIGHT = 450;
const CAMERA_HEIGHT = 1000;
const ROAD_WIDTH = 2000;
const DRAW_DISTANCE = 200;
const CAMERA_DEPTH = 1 / Math.tan(Math.PI / 4 / 2);

interface RoadSprite {
  offset: number; // -1..1 from road center
  sprite?: PIXI.Graphics;
}

interface RoadSegment extends Segment {
  sprites: RoadSprite[];
}

function buildTrack(): RoadSegment[] {
  const segments: RoadSegment[] = [];
  let y = 0;
  for (let i = 0; i < 1000; i++) {
    const curve = i > 100 && i < 180 ? 0.6 : i > 300 && i < 380 ? -0.6 : 0;
    let hill = 0;
    if (i > 450 && i <= 480) hill = 20;
    else if (i > 480 && i <= 510) hill = -20;
    const p1y = y;
    y += hill;
    const p2y = y;
    const seg: RoadSegment = {
      index: i,
      curve,
      y: p1y,
      p1: { x: 0, y: p1y, z: i * segmentLength },
      p2: { x: 0, y: p2y, z: (i + 1) * segmentLength },
      sprites: [],
    };
    if (i % 40 === 0) seg.sprites.push({ offset: -1 });
    if (i % 60 === 0) seg.sprites.push({ offset: 1 });
    segments.push(seg);
  }
  return segments;
}

const CarRacer: React.FC = () => {
  const divRef = useRef<HTMLDivElement>(null);
  const keyRef = useRef({ left: false, right: false, accel: false });
  const positionRef = useRef(0);
  const speedRef = useRef(0);
  const playerXRef = useRef(0);

  useEffect(() => {
    let app: PIXI.Application | null = null;
    let raf = 0;
    let keyDown: ((e: KeyboardEvent) => void) | undefined;
    let keyUp: ((e: KeyboardEvent) => void) | undefined;

    (async () => {
      const PIXI = await import('pixi.js');
      app = new PIXI.Application({
        width: WIDTH,
        height: HEIGHT,
        background: '#80d0ff',
        antialias: true,
        resolution: window.devicePixelRatio,
        autoDensity: true,
        autoStart: false,
      });
      const container = divRef.current as HTMLDivElement;
      container.innerHTML = '';
      container.appendChild(app.view as HTMLCanvasElement);

      const farMount = new PIXI.Graphics();
      for (let i = 0; i < 5; i++) {
        farMount
          .beginFill(0x88aaff)
          .moveTo(i * 160, 80)
          .lineTo(i * 160 + 80, 0)
          .lineTo(i * 160 + 160, 80)
          .endFill();
      }
      const farTex = app.renderer.generateTexture(farMount);
      const bgFar = new PIXI.TilingSprite(farTex, WIDTH, 80);
      bgFar.y = HEIGHT / 2 - 100;
      app.stage.addChild(bgFar);

      const nearMount = new PIXI.Graphics();
      for (let i = 0; i < 5; i++) {
        nearMount
          .beginFill(0x3355aa)
          .moveTo(i * 160, 120)
          .lineTo(i * 160 + 80, 20)
          .lineTo(i * 160 + 160, 120)
          .endFill();
      }
      const nearTex = app.renderer.generateTexture(nearMount);
      const bgNear = new PIXI.TilingSprite(nearTex, WIDTH, 120);
      bgNear.y = HEIGHT / 2 - 60;
      app.stage.addChild(bgNear);

      const road = new PIXI.Container();
      app.stage.addChild(road);

      const segments = buildTrack();

      function update(dt: number) {
        const gp = navigator.getGamepads()[0];
        if (gp) {
          const steer = gp.axes[0] || 0;
          keyRef.current.left = steer < -0.2;
          keyRef.current.right = steer > 0.2;
          keyRef.current.accel =
            gp.buttons[0]?.pressed || gp.buttons[7]?.pressed || false;
        }

        const speed = keyRef.current.accel
          ? Math.min(400, speedRef.current + 200 * dt)
          : Math.max(0, speedRef.current - 150 * dt);
        speedRef.current = speed;
        positionRef.current += speed * dt;

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
          seg.p1.z = seg.index * segmentLength;
          x += dx;
          dx += seg.curve;
          seg.p2.x = x;
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

          if (p1.y >= HEIGHT && p2.y >= HEIGHT) continue;
          const r1 = ROAD_WIDTH * p1.scale;
          const r2 = ROAD_WIDTH * p2.scale;
          const g = new PIXI.Graphics();
          g.beginFill(n % 2 === 0 ? 0x444444 : 0x3a3a3a);
          g.moveTo(p1.x - r1, p1.y);
          g.lineTo(p2.x - r2, p2.y);
          g.lineTo(p2.x + r2, p2.y);
          g.lineTo(p1.x + r1, p1.y);
          g.closePath();
          g.endFill();
          road.addChild(g);

          seg.sprites.forEach((spr) => {
            const wx = seg.p1.x + spr.offset * ROAD_WIDTH;
            const p = project(
              { x: wx, y: seg.p1.y, z: seg.p1.z },
              playerXRef.current,
              CAMERA_HEIGHT,
              positionRef.current,
              CAMERA_DEPTH,
              WIDTH,
              HEIGHT
            );
            if (p.scale <= 0 || p.y < 0 || p.y > HEIGHT) return; // cull
            if (!spr.sprite) {
              const tree = new PIXI.Graphics();
              tree.beginFill(0x006600).drawRect(-20, -60, 40, 60).endFill();
              spr.sprite = tree;
            }
            const s = spr.sprite;
            if (s) {
              s.x = p.x;
              s.y = p.y;
              s.scale.set(p.scale, p.scale);
              road.addChild(s);
            }
          });
        }

        bgFar.tilePosition.x = positionRef.current * 0.02;
        bgNear.tilePosition.x = positionRef.current * 0.05;
      }

      let last = performance.now();
      let acc = 0;
      const step = 1 / 60;
      const frame = (now: number) => {
        const delta = (now - last) / 1000;
        acc += delta;
        while (acc >= step) {
          update(step);
          acc -= step;
        }
        app!.renderer.render(app!.stage);
        last = now;
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);

      keyDown = (e: KeyboardEvent) => {
        if (e.key === 'ArrowLeft') keyRef.current.left = true;
        if (e.key === 'ArrowRight') keyRef.current.right = true;
        if (e.key === 'ArrowUp') keyRef.current.accel = true;
      };
      keyUp = (e: KeyboardEvent) => {
        if (e.key === 'ArrowLeft') keyRef.current.left = false;
        if (e.key === 'ArrowRight') keyRef.current.right = false;
        if (e.key === 'ArrowUp') keyRef.current.accel = false;
      };
      window.addEventListener('keydown', keyDown);
      window.addEventListener('keyup', keyUp);
    })();

    return () => {
      window.removeEventListener('keydown', keyDown!);
      window.removeEventListener('keyup', keyUp!);
      cancelAnimationFrame(raf);
      app?.destroy(true, { children: true });
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

export default CarRacer;
