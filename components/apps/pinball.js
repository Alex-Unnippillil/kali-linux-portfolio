import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';
import useCanvasResize from '../../hooks/useCanvasResize';
import usePersistentState from '../../hooks/usePersistentState';

const WIDTH = 400;
const HEIGHT = 500;
const DEFAULT_LAYOUT = { bumpers: [] };
const TRAIL_LENGTH = 8;

const Pinball = () => {
  const canvasRef = useCanvasResize(WIDTH, HEIGHT);
  const [layout, setLayout] = usePersistentState('pinball-layout', DEFAULT_LAYOUT);
  const [editing, setEditing] = useState(false);
  const [tilt, setTilt] = useState(false);
  const [lightsEnabled, setLightsEnabled] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const nudgeTimes = useRef([]);
  const bumpersRef = useRef([]);
  const ballsRef = useRef([]);
  const jackpotRef = useRef({ active: false, pos: 0 });
  const lastGamepadNudge = useRef(0);
  const animRef = useRef();
  const lightsRef = useRef(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPrefersReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }
  }, []);

  useEffect(() => {
    lightsRef.current = lightsEnabled;
    bumpersRef.current.forEach((b) => {
      b.body.render.fillStyle = lightsEnabled ? (b.lit ? '#ffd700' : '#444') : '#222';
    });
  }, [lightsEnabled]);

  useEffect(() => {
    if (!canvasRef.current || editing) return;
    const { Engine, Render, Runner, Bodies, Composite, Body, Constraint, Events } = Matter;
    const engine = Engine.create();
    const world = engine.world;

    const walls = [
      Bodies.rectangle(WIDTH / 2, -10, WIDTH, 20, { isStatic: true }),
      Bodies.rectangle(WIDTH / 2, HEIGHT + 10, WIDTH, 20, { isStatic: true }),
      Bodies.rectangle(-10, HEIGHT / 2, 20, HEIGHT, { isStatic: true }),
      Bodies.rectangle(WIDTH + 10, HEIGHT / 2, 20, HEIGHT, { isStatic: true }),
    ];
    Composite.add(world, walls);

    const createBall = (x = WIDTH / 2, y = 50) => {
      const b = Bodies.circle(x, y, 8, {
        restitution: 0.9,
        label: 'ball',
        render: { fillStyle: '#fff' },
      });
      Composite.add(world, b);
      ballsRef.current.push({ body: b, trail: [] });
      return b;
    };
    createBall();

    // flippers
    const flipperLeft = Bodies.rectangle(110, HEIGHT - 40, 80, 20, { friction: 0, density: 1 });
    const flipperRight = Bodies.rectangle(WIDTH - 110, HEIGHT - 40, 80, 20, { friction: 0, density: 1 });
    Body.setInertia(flipperLeft, Infinity);
    Body.setInertia(flipperRight, Infinity);
    const pivotLeft = Constraint.create({ bodyA: flipperLeft, pointB: { x: 70, y: HEIGHT - 40 }, length: 0, stiffness: 1 });
    const pivotRight = Constraint.create({ bodyA: flipperRight, pointB: { x: WIDTH - 70, y: HEIGHT - 40 }, length: 0, stiffness: 1 });
    Composite.add(world, [flipperLeft, flipperRight, pivotLeft, pivotRight]);

    // bumpers with lights
    const bumpers = layout.bumpers.map((b, i) => {
      const bumper = Bodies.circle(b.x, b.y, b.r, {
        isStatic: true,
        restitution: 1.5,
        render: { fillStyle: lightsRef.current ? '#444' : '#222' },
      });
      bumper.plugin = { index: i };
      Composite.add(world, bumper);
      return { body: bumper, lit: false, flashUntil: 0 };
    });
    bumpersRef.current = bumpers;

    const getBumperData = (body) => {
      if (body.plugin && body.plugin.index != null) {
        return bumpersRef.current[body.plugin.index];
      }
      return null;
    };

    Events.on(engine, 'collisionStart', (event) => {
      event.pairs.forEach(({ bodyA, bodyB }) => {
        const bumperData = getBumperData(bodyA) || getBumperData(bodyB);
        if (bumperData && lightsRef.current) {
          bumperData.lit = !bumperData.lit;
          if (!prefersReducedMotion) {
            bumperData.flashUntil = performance.now() + 100;
            bumperData.body.render.fillStyle = '#fff';
          } else {
            bumperData.body.render.fillStyle = bumperData.lit ? '#ffd700' : '#444';
          }
          if (
            bumpersRef.current.length &&
            bumpersRef.current.every((b) => b.lit)
          ) {
            jackpotRef.current.active = true;
            jackpotRef.current.pos = -20;
          }
        }
      });
    });

    const render = Render.create({
      canvas: canvasRef.current,
      engine,
      options: { width: WIDTH, height: HEIGHT, background: '#000', wireframes: false },
    });
    Render.run(render);
    const runner = Runner.create();
    Runner.run(runner, engine);

    Events.on(render, 'afterRender', () => {
      const ctx = render.context;
      ctx.save();
      ballsRef.current.forEach((b) => {
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(
          b.body.position.x + 4,
          b.body.position.y + 4,
          b.body.circleRadius,
          b.body.circleRadius * 0.6,
          0,
          0,
          Math.PI * 2
        );
        ctx.fill();

        b.trail.forEach((p, i) => {
          const alpha = (i + 1) / b.trail.length;
          ctx.fillStyle = `rgba(255,255,255,${alpha * 0.5})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, b.body.circleRadius, 0, Math.PI * 2);
          ctx.fill();
        });
      });
      if (jackpotRef.current.active) {
        const pos = jackpotRef.current.pos;
        const grad = ctx.createLinearGradient(pos - 20, 0, pos + 20, 0);
        grad.addColorStop(0, 'rgba(255,215,0,0)');
        grad.addColorStop(0.5, 'rgba(255,215,0,0.7)');
        grad.addColorStop(1, 'rgba(255,215,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(pos - 20, 0, 40, HEIGHT);
      }
      ctx.restore();
    });

    const handleNudge = () => {
      const now = Date.now();
      nudgeTimes.current = nudgeTimes.current.filter((t) => now - t < 3000);
      nudgeTimes.current.push(now);
      ballsRef.current.forEach(({ body }) =>
        Body.applyForce(body, body.position, { x: 0.01, y: 0 })
      );
      if (nudgeTimes.current.length > 3) {
        setTilt(true);
      }
    };

    const checkGamepad = () => {
      const gps = navigator.getGamepads ? navigator.getGamepads() : [];
      const gp = gps && gps[0];
      if (!gp) return;
      const pressed = gp.buttons[5]?.pressed || gp.axes[1] < -0.8;
      if (pressed && performance.now() - lastGamepadNudge.current > 300) {
        handleNudge();
        lastGamepadNudge.current = performance.now();
      }
    };

    const animate = (time) => {
      bumpersRef.current.forEach((b) => {
        if (b.flashUntil && time > b.flashUntil) {
          b.flashUntil = 0;
          b.body.render.fillStyle = b.lit ? '#ffd700' : '#444';
        }
      });
      ballsRef.current.forEach((b) => {
        b.trail.push({ x: b.body.position.x, y: b.body.position.y });
        if (b.trail.length > TRAIL_LENGTH) b.trail.shift();
      });
      if (jackpotRef.current.active) {
        jackpotRef.current.pos += 5;
        if (jackpotRef.current.pos > WIDTH + 20) {
          jackpotRef.current.active = false;
          bumpersRef.current.forEach((b) => {
            b.lit = false;
            b.body.render.fillStyle = '#444';
          });
        }
      }
      checkGamepad();
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);

    const keydown = (e) => {
      if (tilt) return;
      if (e.key === 'ArrowLeft') Body.setAngle(flipperLeft, -0.5);
      if (e.key === 'ArrowRight') Body.setAngle(flipperRight, 0.5);
      if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'n') {
        handleNudge();
      }
      if (e.key.toLowerCase() === 'm') {
        createBall();
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
      cancelAnimationFrame(animRef.current);
    };
  }, [canvasRef, layout, editing, tilt, prefersReducedMotion]);

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
    <div className="relative h-full w-full flex flex-col items-center justify-start bg-ub-cool-grey text-white">
      <div className="p-1 space-x-2">
        <button className="px-2 bg-ub-orange text-black" onClick={() => setEditing(!editing)}>
          {editing ? 'Play' : 'Edit'}
        </button>
        <button className="px-2 bg-ub-orange text-black" onClick={saveShare}>
          Save/Share
        </button>
        <button
          className="px-2 bg-ub-orange text-black"
          onClick={() => setLightsEnabled(!lightsEnabled)}
          aria-pressed={lightsEnabled}
        >
          {lightsEnabled ? 'Lights On' : 'Lights Off'}
        </button>
        {tilt && (
          <span
            className="ml-2 text-red-500 motion-safe:animate-pulse"
            aria-live="assertive"
            role="alert"
          >
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
      {tilt && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-red-900 bg-opacity-70 pointer-events-none animate-pulse"
          role="alert"
          aria-live="assertive"
        >
          TILT
        </div>
      )}
      {editing && <div className="text-xs p-1">Click to add bumpers. Press Play when done.</div>}
      <div className="text-xs p-1">
        Press ArrowUp/N or gamepad RB to nudge. Three nudges in 3s causes tilt.
      </div>
    </div>
  );
};

export default Pinball;
