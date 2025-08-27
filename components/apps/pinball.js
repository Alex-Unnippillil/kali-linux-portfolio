import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';
import useCanvasResize from '../../hooks/useCanvasResize';
import usePersistentState from '../../hooks/usePersistentState';

const WIDTH = 400;
const HEIGHT = 500;
const DEFAULT_LAYOUT = { bumpers: [] };

const Pinball = () => {
  const canvasRef = useCanvasResize(WIDTH, HEIGHT);
  const [layout, setLayout] = usePersistentState('pinball-layout', DEFAULT_LAYOUT);
  const [editing, setEditing] = useState(false);
  const [tilt, setTilt] = useState(false);
  const nudgeTimes = useRef([]);

  useEffect(() => {
    if (!canvasRef.current || editing) return;
    const { Engine, Render, Runner, Bodies, Composite, Body, Constraint } = Matter;
    const engine = Engine.create();
    const world = engine.world;

    const walls = [
      Bodies.rectangle(WIDTH / 2, -10, WIDTH, 20, { isStatic: true }),
      Bodies.rectangle(WIDTH / 2, HEIGHT + 10, WIDTH, 20, { isStatic: true }),
      Bodies.rectangle(-10, HEIGHT / 2, 20, HEIGHT, { isStatic: true }),
      Bodies.rectangle(WIDTH + 10, HEIGHT / 2, 20, HEIGHT, { isStatic: true }),
    ];
    Composite.add(world, walls);

    const ball = Bodies.circle(WIDTH / 2, 50, 8, { restitution: 0.9 });
    Composite.add(world, ball);

    // flippers
    const flipperLeft = Bodies.rectangle(110, HEIGHT - 40, 80, 20, { friction: 0, density: 1 });
    const flipperRight = Bodies.rectangle(WIDTH - 110, HEIGHT - 40, 80, 20, { friction: 0, density: 1 });
    Body.setInertia(flipperLeft, Infinity);
    Body.setInertia(flipperRight, Infinity);
    const pivotLeft = Constraint.create({ bodyA: flipperLeft, pointB: { x: 70, y: HEIGHT - 40 }, length: 0, stiffness: 1 });
    const pivotRight = Constraint.create({ bodyA: flipperRight, pointB: { x: WIDTH - 70, y: HEIGHT - 40 }, length: 0, stiffness: 1 });
    Composite.add(world, [flipperLeft, flipperRight, pivotLeft, pivotRight]);

    // bumpers
    layout.bumpers.forEach((b) => {
      const bumper = Bodies.circle(b.x, b.y, b.r, { isStatic: true, restitution: 1.5 });
      Composite.add(world, bumper);
    });

    const render = Render.create({
      canvas: canvasRef.current,
      engine,
      options: { width: WIDTH, height: HEIGHT, background: '#000', wireframes: false },
    });
    Render.run(render);
    const runner = Runner.create();
    Runner.run(runner, engine);

    const keydown = (e) => {
      if (tilt) return;
      if (e.key === 'ArrowLeft') Body.setAngle(flipperLeft, -0.5);
      if (e.key === 'ArrowRight') Body.setAngle(flipperRight, 0.5);
      if (e.key.toLowerCase() === 'n') {
        const now = Date.now();
        nudgeTimes.current = nudgeTimes.current.filter((t) => now - t < 3000);
        nudgeTimes.current.push(now);
        Body.applyForce(ball, ball.position, { x: 0.02, y: 0 });
        if (nudgeTimes.current.length > 3) {
          setTilt(true);
        }
      }
    };
    const keyup = (e) => {
      if (e.key === 'ArrowLeft') Body.setAngle(flipperLeft, 0);
      if (e.key === 'ArrowRight') Body.setAngle(flipperRight, 0);
    };
    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);

    return () => {
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
      Render.stop(render);
      Runner.stop(runner);
      Engine.clear(engine);
    };
  }, [canvasRef, layout, editing, tilt]);

  const handleClick = (e) => {
    if (!editing || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setLayout({ ...layout, bumpers: [...layout.bumpers, { x, y, r: 20 }] });
  };

  const saveShare = () => {
    const json = JSON.stringify(layout);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(json);
      alert('Layout copied to clipboard');
    }
  };

  const resetTilt = () => {
    setTilt(false);
    nudgeTimes.current = [];
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-start bg-ub-cool-grey text-white">
      <div className="p-1 space-x-2">
        <button className="px-2 bg-ub-orange text-black" onClick={() => setEditing(!editing)}>
          {editing ? 'Play' : 'Edit'}
        </button>
        <button className="px-2 bg-ub-orange text-black" onClick={saveShare}>
          Save/Share
        </button>
        {tilt && (
          <span className="ml-2 text-red-500">
            TILT <button onClick={resetTilt}>Reset</button>
          </span>
        )}
      </div>
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        className="bg-black"
        width={WIDTH}
        height={HEIGHT}
      />
      {editing && <div className="text-xs p-1">Click to add bumpers. Press Play when done.</div>}
      <div className="text-xs p-1">Press &apos;n&apos; to nudge. Three nudges in 3s causes tilt.</div>
    </div>
  );
};

export default Pinball;
