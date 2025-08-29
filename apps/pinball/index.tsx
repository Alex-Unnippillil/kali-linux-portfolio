'use client';

import { useEffect, useRef, useState } from 'react';
import { Engine, Render, World, Bodies, Body, Runner } from 'matter-js';

const themes: Record<string, { bg: string; flipper: string }> = {
  classic: { bg: '#0b3d91', flipper: '#ffd700' },
  space: { bg: '#000000', flipper: '#00ffff' },
  forest: { bg: '#064e3b', flipper: '#9acd32' },
};

export default function Pinball() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine>();
  const leftFlipperRef = useRef<Body>();
  const rightFlipperRef = useRef<Body>();
  const ballRef = useRef<Body>();
  const [theme, setTheme] = useState<keyof typeof themes>('classic');
  const [power, setPower] = useState(1);
  const [bounce, setBounce] = useState(0.5);
  const [tilt, setTilt] = useState(false);
  const nudgesRef = useRef<number[]>([]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = Engine.create();
    engine.gravity.y = 1;
    const render = Render.create({
      canvas: canvasRef.current,
      engine,
      options: {
        width: 400,
        height: 600,
        wireframes: false,
        background: themes[theme].bg,
      },
    });
    engineRef.current = engine;

    const ball = Bodies.circle(200, 100, 12, { restitution: 0.9 });
    ballRef.current = ball;
    const walls = [
      Bodies.rectangle(200, 0, 400, 40, { isStatic: true }),
      Bodies.rectangle(200, 600, 400, 40, { isStatic: true }),
      Bodies.rectangle(0, 300, 40, 600, { isStatic: true }),
      Bodies.rectangle(400, 300, 40, 600, { isStatic: true }),
    ];
    const leftFlipper = Bodies.rectangle(120, 560, 80, 20, {
      isStatic: true,
      angle: Math.PI / 8,
      restitution: bounce,
      render: { fillStyle: themes[theme].flipper },
    });
    const rightFlipper = Bodies.rectangle(280, 560, 80, 20, {
      isStatic: true,
      angle: -Math.PI / 8,
      restitution: bounce,
      render: { fillStyle: themes[theme].flipper },
    });
    leftFlipperRef.current = leftFlipper;
    rightFlipperRef.current = rightFlipper;
    World.add(engine.world, [ball, ...walls, leftFlipper, rightFlipper]);
    Render.run(render);
    const runner = Runner.create();
    Runner.run(runner, engine);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (tilt) return;
      if (e.code === 'ArrowLeft') {
        Body.setAngle(leftFlipper, -Math.PI / 4 * power);
      } else if (e.code === 'ArrowRight') {
        Body.setAngle(rightFlipper, Math.PI / 4 * power);
      } else if (e.code === 'KeyN') {
        const now = Date.now();
        nudgesRef.current = nudgesRef.current.filter((t) => now - t < 5000);
        nudgesRef.current.push(now);
        Body.applyForce(ballRef.current!, ballRef.current!.position, { x: 0.02, y: 0 });
        if (nudgesRef.current.length >= 3) {
          setTilt(true);
          setTimeout(() => {
            setTilt(false);
            nudgesRef.current = [];
          }, 3000);
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') {
        Body.setAngle(leftFlipper, Math.PI / 8);
      }
      if (e.code === 'ArrowRight') {
        Body.setAngle(rightFlipper, -Math.PI / 8);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      Render.stop(render);
      Runner.stop(runner);
      World.clear(engine.world, false);
      Engine.clear(engine);
    };
  }, [theme, power, bounce, tilt]);

  useEffect(() => {
    if (leftFlipperRef.current) {
      leftFlipperRef.current.restitution = bounce;
      leftFlipperRef.current.render.fillStyle = themes[theme].flipper;
    }
    if (rightFlipperRef.current) {
      rightFlipperRef.current.restitution = bounce;
      rightFlipperRef.current.render.fillStyle = themes[theme].flipper;
    }
    if (engineRef.current) {
      (engineRef.current.render.options as any).background = themes[theme].bg;
    }
  }, [bounce, theme]);

  return (
    <div className="flex flex-col items-center space-y-2">
      <div className="flex space-x-4">
        <label className="flex flex-col text-xs">
          Power
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={power}
            onChange={(e) => setPower(parseFloat(e.target.value))}
          />
        </label>
        <label className="flex flex-col text-xs">
          Bounce
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={bounce}
            onChange={(e) => setBounce(parseFloat(e.target.value))}
          />
        </label>
        <label className="flex flex-col text-xs">
          Theme
          <select value={theme} onChange={(e) => setTheme(e.target.value as keyof typeof themes)}>
            {Object.keys(themes).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>
      {tilt && <div className="text-red-500 font-bold">TILT!</div>}
      <canvas ref={canvasRef} width={400} height={600} className="border" />
      <p className="text-xs">Left/Right arrows to flip, N to nudge.</p>
    </div>
  );
}

