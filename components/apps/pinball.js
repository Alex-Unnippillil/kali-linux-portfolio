import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';
import useCanvasResize from '../../hooks/useCanvasResize';
import usePersistentState from '../../hooks/usePersistentState';

const WIDTH = 400;
const HEIGHT = 500;
const DEFAULT_LAYOUT = { bumpers: [] };
const TABLE_PRESETS = {
  classic: {
    name: 'Classic',
    layout: {
      bumpers: [
        { x: WIDTH / 2, y: 200, r: 20 },
        { x: WIDTH / 3, y: 300, r: 20 },
        { x: (2 * WIDTH) / 3, y: 300, r: 20 },
      ],
    },
  },
  spread: {
    name: 'Spread',
    layout: {
      bumpers: [
        { x: 80, y: 150, r: 20 },
        { x: WIDTH - 80, y: 150, r: 20 },
        { x: WIDTH / 2, y: 250, r: 25 },
        { x: 80, y: 350, r: 20 },
        { x: WIDTH - 80, y: 350, r: 20 },
      ],
    },
  },
  empty: { name: 'Empty', layout: DEFAULT_LAYOUT },
};
const DEFAULT_LAYOUTS = Object.fromEntries(
  Object.entries(TABLE_PRESETS).map(([k, v]) => [k, v.layout])
);
const TRAIL_LENGTH = 8;
const BASE_POINTS = 10;
const MULTIPLIER_DURATION = 5000;
const COMBO_WINDOW = 3000;
const FLIPPER_MAX = 0.5;
const FLIPPER_SPEED = 0.25;

const Pinball = () => {
  const canvasRef = useCanvasResize(WIDTH, HEIGHT);
  const [table, setTable] = usePersistentState('pinball-table', 'classic');
  const [layouts, setLayouts] = usePersistentState('pinball-layouts', DEFAULT_LAYOUTS);
  const layout = layouts[table] || DEFAULT_LAYOUT;
  const setLayout = (l) => setLayouts((prev) => ({ ...prev, [table]: l }));
  const [editing, setEditing] = useState(false);
  const [tilt, setTilt] = useState(false);
  const [lightsEnabled, setLightsEnabled] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [score, setScore] = useState(0);
  const [highScores, setHighScores] = usePersistentState('pinball-highscores', {});
  const highScore = highScores[table] || 0;
  const [multiplier, setMultiplier] = useState(1);
  const [combo, setCombo] = useState(1);
  const nudgeTimes = useRef([]);
  const bumpersRef = useRef([]);
  const ballsRef = useRef([]);
  const jackpotRef = useRef({ active: false, pos: 0 });
  const lastGamepadNudge = useRef(0);
  const animRef = useRef();
  const lightsRef = useRef(true);
  const multiplierRef = useRef(1);
  const comboRef = useRef(1);
  const multiplierTimeout = useRef();
  const comboTimeout = useRef();
  const highScoreRef = useRef(0);

  useEffect(() => {
    highScoreRef.current = highScore;
  }, [highScore]);

  useEffect(() => {
    setScore(0);
    multiplierRef.current = 1;
    setMultiplier(1);
    comboRef.current = 1;
    setCombo(1);
  }, [table]);

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
    engine.positionIterations = 8;
    engine.velocityIterations = 6;
    const world = engine.world;

    const walls = [
      Bodies.rectangle(WIDTH / 2, -10, WIDTH, 20, {
        isStatic: true,
        restitution: 1,
        friction: 0,
        slop: 0,
      }),
      Bodies.rectangle(WIDTH / 2, HEIGHT + 10, WIDTH, 20, {
        isStatic: true,
        restitution: 1,
        friction: 0,
        slop: 0,
      }),
      Bodies.rectangle(-10, HEIGHT / 2, 20, HEIGHT, {
        isStatic: true,
        restitution: 1,
        friction: 0,
        slop: 0,
      }),
      Bodies.rectangle(WIDTH + 10, HEIGHT / 2, 20, HEIGHT, {
        isStatic: true,
        restitution: 1,
        friction: 0,
        slop: 0,
      }),
    ];
    Composite.add(world, walls);

    const createBall = (x = WIDTH / 2, y = 50) => {
      const b = Bodies.circle(x, y, 8, {
        restitution: 0.95,
        friction: 0,
        frictionAir: 0.01,
        slop: 0.01,
        label: 'ball',
        render: { fillStyle: '#fff' },
      });
      Composite.add(world, b);
      ballsRef.current.push({ body: b, trail: [] });
      return b;
    };
    createBall();

    // flippers
    const flipperLeft = Bodies.rectangle(110, HEIGHT - 40, 80, 20, {
      friction: 0,
      density: 1,
      restitution: 1,
    });
    const flipperRight = Bodies.rectangle(WIDTH - 110, HEIGHT - 40, 80, 20, {
      friction: 0,
      density: 1,
      restitution: 1,
    });
    Body.setInertia(flipperLeft, Infinity);
    Body.setInertia(flipperRight, Infinity);
    const pivotLeft = Constraint.create({ bodyA: flipperLeft, pointB: { x: 70, y: HEIGHT - 40 }, length: 0, stiffness: 1 });
    const pivotRight = Constraint.create({ bodyA: flipperRight, pointB: { x: WIDTH - 70, y: HEIGHT - 40 }, length: 0, stiffness: 1 });
    Composite.add(world, [flipperLeft, flipperRight, pivotLeft, pivotRight]);

    // lane targets for score multipliers
    const lanes = [
      Bodies.rectangle(WIDTH / 4, 80, 60, 10, {
        isStatic: true,
        isSensor: true,
        label: 'lane',
        render: { fillStyle: '#222' },
      }),
      Bodies.rectangle(WIDTH / 2, 80, 60, 10, {
        isStatic: true,
        isSensor: true,
        label: 'lane',
        render: { fillStyle: '#222' },
      }),
      Bodies.rectangle((3 * WIDTH) / 4, 80, 60, 10, {
        isStatic: true,
        isSensor: true,
        label: 'lane',
        render: { fillStyle: '#222' },
      }),
    ];
    Composite.add(world, lanes);

    // bumpers with lights
    const bumpers = layout.bumpers.map((b, i) => {
      const bumper = Bodies.circle(b.x, b.y, b.r, {
        isStatic: true,
        restitution: 1.7,
        render: { fillStyle: lightsRef.current ? '#444' : '#222' },
      });
      bumper.plugin = { index: i };
      Composite.add(world, bumper);
      return { body: bumper, lit: false, flashUntil: 0, flashState: false };
    });
    bumpersRef.current = bumpers;

    const getBumperData = (body) => {
      if (body.plugin && body.plugin.index != null) {
        return bumpersRef.current[body.plugin.index];
      }
      return null;
    };

    const handleComboHit = () => {
      comboRef.current += 1;
      setCombo(comboRef.current);
      clearTimeout(comboTimeout.current);
      comboTimeout.current = setTimeout(() => {
        comboRef.current = 1;
        setCombo(1);
      }, COMBO_WINDOW);
    };

    Events.on(engine, 'collisionStart', (event) => {
      event.pairs.forEach(({ bodyA, bodyB }) => {
        const bumperData = getBumperData(bodyA) || getBumperData(bodyB);
        if (bumperData && lightsRef.current) {
          handleComboHit();
          bumperData.lit = !bumperData.lit;
          if (!prefersReducedMotion) {
            bumperData.flashUntil = performance.now() + 300;
            bumperData.flashState = true;
          } else {
            bumperData.body.render.fillStyle = bumperData.lit ? '#ffd700' : '#444';
          }
          const points = BASE_POINTS * multiplierRef.current * comboRef.current;
          setScore((s) => {
            const next = s + points;
            if (next > highScoreRef.current)
              setHighScores((hs) => ({ ...hs, [table]: next }));
            return next;
          });
          if (
            bumpersRef.current.length &&
            bumpersRef.current.every((b) => b.lit)
          ) {
            jackpotRef.current.active = true;
            jackpotRef.current.pos = -20;
          }
        }
        if (bodyA.label === 'lane' || bodyB.label === 'lane') {
          multiplierRef.current = Math.min(multiplierRef.current + 1, 5);
          setMultiplier(multiplierRef.current);
          comboRef.current = 1;
          setCombo(1);
          clearTimeout(multiplierTimeout.current);
          multiplierTimeout.current = setTimeout(() => {
            multiplierRef.current = 1;
            setMultiplier(1);
          }, MULTIPLIER_DURATION);
        }
      });
    });

    Events.on(engine, 'beforeUpdate', () => {
      if (flipperLeft.angle < -FLIPPER_MAX) {
        Body.setAngularVelocity(flipperLeft, 0);
        Body.setAngle(flipperLeft, -FLIPPER_MAX);
      } else if (flipperLeft.angle > 0) {
        Body.setAngularVelocity(flipperLeft, 0);
        Body.setAngle(flipperLeft, 0);
      }
      if (flipperRight.angle > FLIPPER_MAX) {
        Body.setAngularVelocity(flipperRight, 0);
        Body.setAngle(flipperRight, FLIPPER_MAX);
      } else if (flipperRight.angle < 0) {
        Body.setAngularVelocity(flipperRight, 0);
        Body.setAngle(flipperRight, 0);
      }
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
        if (b.flashUntil && time < b.flashUntil) {
          b.body.render.fillStyle = b.flashState ? '#fff' : '#ffd700';
          b.flashState = !b.flashState;
        } else if (b.flashUntil && time >= b.flashUntil) {
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
      if (e.key === 'ArrowLeft') Body.setAngularVelocity(flipperLeft, -FLIPPER_SPEED);
      if (e.key === 'ArrowRight') Body.setAngularVelocity(flipperRight, FLIPPER_SPEED);
      if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'n') {
        handleNudge();
      }
      if (e.key.toLowerCase() === 'm') {
        createBall();
      }
    };
    const keyup = (e) => {
      if (e.key === 'ArrowLeft') Body.setAngularVelocity(flipperLeft, FLIPPER_SPEED);
      if (e.key === 'ArrowRight') Body.setAngularVelocity(flipperRight, -FLIPPER_SPEED);
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
      clearTimeout(multiplierTimeout.current);
      clearTimeout(comboTimeout.current);
    };
  }, [canvasRef, layout, editing, tilt, prefersReducedMotion, table, setHighScores]);

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
        <select
          className="px-2 bg-ub-grey text-black"
          value={table}
          onChange={(e) => setTable(e.target.value)}
        >
          {Object.entries(TABLE_PRESETS).map(([key, p]) => (
            <option key={key} value={key}>
              {p.name}
            </option>
          ))}
        </select>
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
      <div className="p-1 text-xs">
        Score: {score} {multiplier > 1 && `x${multiplier}`} {combo > 1 && `Combo x${combo}`} | High: {highScore}
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
