import { useEffect, useRef, useState } from 'react';
import Matter, { Engine, Render, World, Bodies, Body } from 'matter-js';

interface TableElement {
  type: 'flipper' | 'bumper';
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
}

interface Table {
  name: string;
  elements: TableElement[];
}

export default function Pinball() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const hitsRef = useRef(0);

  useEffect(() => {
    let engine: Engine;
    let render: Render;
    let flippers: Body[] = [];
    let bumpers: Body[] = [];
    let raf: number;

    async function init() {
      const params = new URLSearchParams(window.location.search);
      const tableName = params.get('table') || 'default';
      const table: Table = await (
        await fetch(`/apps/pinball/tables/${tableName}.json`)
      ).json();

      engine = Engine.create();
      const width = 400;
      const height = 600;

      render = Render.create({
        canvas: canvasRef.current as HTMLCanvasElement,
        engine,
        options: { width, height, wireframes: false, background: '#111' },
      });

      // walls
      World.add(engine.world, [
        Bodies.rectangle(width / 2, height, width, 20, { isStatic: true }),
        Bodies.rectangle(0, height / 2, 20, height, { isStatic: true }),
        Bodies.rectangle(width, height / 2, 20, height, { isStatic: true }),
        Bodies.rectangle(width / 2, 0, width, 20, { isStatic: true }),
      ]);

      table.elements.forEach((el) => {
        if (el.type === 'bumper') {
          const bumper = Bodies.circle(el.x, el.y, el.radius || 20, {
            isStatic: true,
            restitution: 1,
          });
          bumpers.push(bumper);
          World.add(engine.world, bumper);
        } else if (el.type === 'flipper') {
          const flipper = Bodies.rectangle(
            el.x,
            el.y,
            el.width || 80,
            el.height || 20,
            { isStatic: true }
          );
          flippers.push(flipper);
          World.add(engine.world, flipper);
        }
      });

      const ball = Bodies.circle(width / 2, height - 120, 10, {
        restitution: 0.9,
      });
      World.add(engine.world, ball);

      Matter.Events.on(engine, 'collisionStart', (event) => {
        event.pairs.forEach((pair) => {
          if (bumpers.includes(pair.bodyA) || bumpers.includes(pair.bodyB)) {
            hitsRef.current += 1;
            if (hitsRef.current % 5 === 0) {
              setMultiplier((m) => m + 1); // simple mission bonus
            }
            setScore((s) => s + 100 * multiplier);
            triggerHaptics();
          }
        });
      });

      Engine.run(engine);
      Render.run(render);

      function handleKey(e: KeyboardEvent) {
        if (e.code === 'ArrowLeft') rotate(flippers[0], -0.5);
        if (e.code === 'ArrowRight') rotate(flippers[1], 0.5);
      }
      window.addEventListener('keydown', handleKey);

      function handleTouch(e: TouchEvent) {
        const x = e.changedTouches[0].clientX;
        if (x < window.innerWidth / 2) rotate(flippers[0], -0.5);
        else rotate(flippers[1], 0.5);
      }
      window.addEventListener('touchstart', handleTouch);

      function pollGamepad() {
        const pads = navigator.getGamepads();
        const pad = pads[0];
        if (pad) {
          if (pad.buttons[0].pressed) rotate(flippers[0], -0.5);
          if (pad.buttons[1].pressed) rotate(flippers[1], 0.5);
        }
        raf = requestAnimationFrame(pollGamepad);
      }
      window.addEventListener('gamepadconnected', () => pollGamepad());

      return () => {
        cancelAnimationFrame(raf);
        window.removeEventListener('keydown', handleKey);
        window.removeEventListener('touchstart', handleTouch);
        window.removeEventListener('gamepadconnected', () => pollGamepad());
        Render.stop(render);
        Engine.clear(engine);
      };
    }

    init();
  }, [multiplier]);

  function rotate(body: Body | undefined, direction: number) {
    if (body) {
      Matter.Body.rotate(body, direction);
    }
  }

  function triggerHaptics() {
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    const pads = navigator.getGamepads();
    const pad = pads[0];
    if (pad && pad.vibrationActuator) {
      pad.vibrationActuator.playEffect('dual-rumble', {
        duration: 50,
        strongMagnitude: 1,
        weakMagnitude: 1,
      });
    }
  }

  async function saveScore() {
    await fetch('/api/pinball/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score, replay: [] }),
    });
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center text-white">
      <canvas ref={canvasRef} width={400} height={600} />
      <div className="mt-2">Score: {score} (x{multiplier})</div>
      <button
        onClick={saveScore}
        className="mt-2 px-2 py-1 bg-blue-600 text-white rounded"
      >
        Save Score
      </button>
    </div>
  );
}

