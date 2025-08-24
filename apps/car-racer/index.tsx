import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';

interface TrackWall { x: number; y: number; w: number; h: number; }
interface TrackPoint { x: number; y: number; }
interface Track {
  width: number;
  height: number;
  start: { x: number; y: number; angle: number };
  walls: TrackWall[];
  checkpoints: { x: number; y: number; w: number; h: number }[];
  line: TrackPoint[];
}

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

interface GhostFrame { x: number; y: number; angle: number; time: number }

const CarRacer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [engineForce, setEngineForce] = useState(0.001);
  const [grip, setGrip] = useState(0.02);
  const [lapTime, setLapTime] = useState<number | null>(null);
  const [bestLap, setBestLap] = useState<number | null>(null);
  const ghostRef = useRef<GhostFrame[]>([]);
  const [ghost, setGhost] = useState<GhostFrame[] | null>(null);

  useEffect(() => {
    let engine = Matter.Engine.create();
    let render: Matter.Render;
    let runner = Matter.Runner.create();
    let track: Track;
    let player: Matter.Body;
    const aiCars: { body: Matter.Body; progress: number }[] = [];
    const checkpoints: Matter.Body[] = [];
    const keyState = { up: false, left: false, right: false };
    let currentCheckpoint = 0;
    let startTime = 0;
    let raf: number;

    async function init() {
      track = await (await fetch('/apps/car-racer/tracks/basic.json')).json();
      const canvas = canvasRef.current as HTMLCanvasElement;
      render = Matter.Render.create({
        engine,
        canvas,
        options: {
          width: track.width,
          height: track.height,
          background: '#222',
          wireframes: false,
        },
      });

      // create track walls
      track.walls.forEach(w => {
        const wall = Matter.Bodies.rectangle(w.x, w.y, w.w, w.h, { isStatic: true });
        Matter.World.add(engine.world, wall);
      });

      // checkpoints as sensors
      CHECKPOINTS.forEach((c, idx) => {
        const cp = Matter.Bodies.rectangle(
          c.x,
          (c.y1 + c.y2) / 2,
          20,
          c.y2 - c.y1,
          { isStatic: true, isSensor: true, label: `cp-${idx}` }
        );
        checkpoints.push(cp);
        Matter.World.add(engine.world, cp);
      });

      // player car
      player = Matter.Bodies.rectangle(track.start.x, track.start.y, 40, 20, {
        frictionAir: 0.1,
      });
      Matter.Body.setAngle(player, track.start.angle);
      Matter.World.add(engine.world, player);

      // AI cars
      for (let i = 0; i < 8; i++) {
        const car = Matter.Bodies.rectangle(track.start.x - i * 30, track.start.y + 40, 40, 20, {
          frictionAir: 0.1,
        });
        aiCars.push({ body: car, progress: 0 });
        Matter.World.add(engine.world, car);
      }

      Matter.Events.on(engine, 'beforeUpdate', (e) => {
        const dt = e.delta / 1000;
        // player controls
        if (keyState.up) {
          const force = {
            x: Math.cos(player.angle) * engineForce,
            y: Math.sin(player.angle) * engineForce,
          };
          Matter.Body.applyForce(player, player.position, force);
        }
        if (keyState.left) Matter.Body.setAngularVelocity(player, player.angularVelocity - 0.05);
        if (keyState.right) Matter.Body.setAngularVelocity(player, player.angularVelocity + 0.05);

        // drift - damp lateral velocity
        const forward = { x: Math.cos(player.angle), y: Math.sin(player.angle) };
        const lateral = { x: -forward.y, y: forward.x };
        const v = player.velocity;
        const latVel = v.x * lateral.x + v.y * lateral.y;
        const driftForce = { x: -latVel * lateral.x * grip, y: -latVel * lateral.y * grip };
        Matter.Body.applyForce(player, player.position, driftForce);

        ghostRef.current.push({ x: player.position.x, y: player.position.y, angle: player.angle, time: performance.now() - startTime });

        // simple AI following line
        aiCars.forEach((car) => {
          const target = track.line[Math.floor(car.progress) % track.line.length];
          const dir = Math.atan2(target.y - car.body.position.y, target.x - car.body.position.x);
          Matter.Body.setAngle(car.body, dir);
          Matter.Body.applyForce(car.body, car.body.position, {
            x: Math.cos(dir) * engineForce,
            y: Math.sin(dir) * engineForce,
          });
          car.progress += dt * 2;
        });
      });

      Matter.Events.on(engine, 'collisionStart', (ev) => {
        ev.pairs.forEach((pair) => {
          const labels = [pair.bodyA.label, pair.bodyB.label];
          labels.forEach((lab) => {
            if (lab === `cp-${currentCheckpoint}`) {
              currentCheckpoint += 1;
              if (currentCheckpoint >= checkpoints.length) {
                const now = performance.now();
                const lap = (now - startTime) / 1000;
                setLapTime(lap);
                if (!bestLap || lap < bestLap) {
                  setBestLap(lap);
                  setGhost([...ghostRef.current]);
                }
                startTime = now;
                currentCheckpoint = 0;
                ghostRef.current = [];
              }
            }
          });
        });
      });

      Matter.Render.run(render);
      Matter.Runner.run(runner, engine);
      startTime = performance.now();

      // ghost drawing overlay
      const drawGhost = () => {
        if (ghost && render.context) {
          const t = performance.now() - startTime;
          const frame = ghost.find((f) => f.time > t);
          if (frame) {
            const ctx = render.context;
            ctx.save();
            ctx.fillStyle = 'rgba(0,255,255,0.5)';
            ctx.translate(frame.x, frame.y);
            ctx.rotate(frame.angle);
            ctx.fillRect(-20, -10, 40, 20);
            ctx.restore();
          }
        }
        raf = requestAnimationFrame(drawGhost);
      };
      drawGhost();
    }

    const keyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') keyState.up = true;
      if (e.key === 'ArrowLeft') keyState.left = true;
      if (e.key === 'ArrowRight') keyState.right = true;
    };
    const keyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') keyState.up = false;
      if (e.key === 'ArrowLeft') keyState.left = false;
      if (e.key === 'ArrowRight') keyState.right = false;
    };
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);

    init();

    return () => {
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      cancelAnimationFrame(raf);
      Matter.Render.stop(render);
      Matter.Runner.stop(runner);
      Matter.World.clear(engine.world, false);
      engine.events = {} as any;
    };
  }, [engineForce, grip, ghost]);

  return (
    <div className="w-full h-full flex flex-col items-center text-white">
      <canvas ref={canvasRef} width={800} height={600} />
      <div className="mt-2 space-x-2">
        <label>Engine {engineForce.toFixed(3)}</label>
        <input type="range" min="0.0005" max="0.005" step="0.0005" value={engineForce} onChange={(e)=>setEngineForce(parseFloat(e.target.value))} />
        <label>Grip {grip.toFixed(2)}</label>
        <input type="range" min="0.01" max="0.1" step="0.01" value={grip} onChange={(e)=>setGrip(parseFloat(e.target.value))} />
      </div>
      <div className="mt-2">Lap: {lapTime ? lapTime.toFixed(2) : '--'}s Best: {bestLap ? bestLap.toFixed(2) : '--'}s</div>
    </div>
  );
};

export default CarRacer;
