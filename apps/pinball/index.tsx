"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Engine, Render, World, Bodies, Body, Runner, Events } from "matter-js";
import { useTiltSensor } from "./tilt";

const themes = {
  classic: { bg: "#0b3d91", flipper: "#ffd700" },
  space: { bg: "#000000", flipper: "#00ffff" },
  forest: { bg: "#064e3b", flipper: "#9acd32" },
} as const;

type Theme = keyof typeof themes;

export default function Pinball() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // References for core Matter.js entities

  const engineRef = useRef<Engine | null>(null);
  const leftFlipperRef = useRef<Body | null>(null);
  const rightFlipperRef = useRef<Body | null>(null);
  const ballRef = useRef<Body | null>(null);
  const sparksRef = useRef<{ x: number; y: number; life: number }[]>([]);
  const laneGlowRef = useRef<{ left: boolean; right: boolean }>({
    left: false,
    right: false,
  });
  const [theme, setTheme] = useState<Theme>("classic");
  const [power, setPower] = useState(1);
  const [bounce, setBounce] = useState(0.5);
  const [tilt, setTilt] = useState(false);
  const [score, setScore] = useState(0);
  const nudgesRef = useRef<number[]>([]);
  const lastNudgeRef = useRef(0);
  const currentTheme = themes[theme] ?? themes.classic;

  const handleTilt = useCallback(() => {
    setTilt(true);
    setTimeout(() => {
      setTilt(false);
      nudgesRef.current = [];
    }, 3000);
  }, []);

  const handleNudge = useCallback(() => {
    const now = Date.now();
    nudgesRef.current = nudgesRef.current.filter((t) => now - t < 3000);
    nudgesRef.current.push(now);
    if (ballRef.current) {
      Body.applyForce(ballRef.current, ballRef.current.position, {
        x: 0.02,
        y: 0,
      });
    }
    if (nudgesRef.current.length >= 3) {
      handleTilt();
    }
  }, [handleTilt]);

  const tryNudge = useCallback(() => {
    if (tilt) return;
    const now = Date.now();
    if (now - lastNudgeRef.current < 500) return;
    lastNudgeRef.current = now;
    handleNudge();
  }, [tilt, handleNudge]);

  useTiltSensor(25, handleTilt);

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
        background: currentTheme.bg,
      },
    });
    engineRef.current = engine;

    const ball = Bodies.circle(200, 100, 12, {
      restitution: 0.9,
      render: { visible: false },
    });
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
      render: { fillStyle: currentTheme.flipper },
    });
    const rightFlipper = Bodies.rectangle(280, 560, 80, 20, {
      isStatic: true,
      angle: -Math.PI / 8,
      restitution: bounce,
      render: { fillStyle: currentTheme.flipper },
    });
    leftFlipperRef.current = leftFlipper;
    rightFlipperRef.current = rightFlipper;
    const leftLane = Bodies.rectangle(80, 80, 40, 10, {
      isStatic: true,
      isSensor: true,
    });
    const rightLane = Bodies.rectangle(320, 80, 40, 10, {
      isStatic: true,
      isSensor: true,
    });
    World.add(engine.world, [
      ball,
      ...walls,
      leftFlipper,
      rightFlipper,
      leftLane,
      rightLane,
    ]);
    Render.run(render);
    const runner = Runner.create();
    Runner.run(runner, engine);

    Events.on(engine, "collisionStart", (evt) => {
      evt.pairs.forEach((pair) => {
        const bodies = [pair.bodyA, pair.bodyB];
        if (bodies.includes(ball) && bodies.includes(leftFlipper)) {
          const support = pair.collision.supports[0];
          if (support) {
            const { x, y } = support;
            sparksRef.current.push({ x, y, life: 1 });
          }
        }
        if (bodies.includes(ball) && bodies.includes(rightFlipper)) {
          const support = pair.collision.supports[0];
          if (support) {
            const { x, y } = support;
            sparksRef.current.push({ x, y, life: 1 });
          }

        }
        if (bodies.includes(ball) && bodies.includes(leftLane)) {
          laneGlowRef.current.left = true;
          setScore((s) => s + 100);
          setTimeout(() => (laneGlowRef.current.left = false), 500);
        }
        if (bodies.includes(ball) && bodies.includes(rightLane)) {
          laneGlowRef.current.right = true;
          setScore((s) => s + 100);
          setTimeout(() => (laneGlowRef.current.right = false), 500);
        }
      });
    });

    Events.on(render, "afterRender", () => {
      const ctx = render.context;
      if (!ballRef.current) return;
      const ball = ballRef.current;
      const { x, y } = ball.position;
      const radius = 12;
      const gradient = ctx.createRadialGradient(
        x - 4,
        y - 4,
        radius / 4,
        x,
        y,
        radius,
      );
      gradient.addColorStop(0, "#fff");
      gradient.addColorStop(1, "#999");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();

      [
        { lane: leftLane, glow: laneGlowRef.current.left },
        { lane: rightLane, glow: laneGlowRef.current.right },
      ].forEach(({ lane, glow }) => {
        const { x: lx, y: ly } = lane.position;
        ctx.save();
        if (glow) {
          ctx.shadowColor = "#ffff00";
          ctx.shadowBlur = 20;
          ctx.fillStyle = "#ff0";
        } else {
          ctx.fillStyle = "#555";
        }
        ctx.fillRect(lx - 20, ly - 5, 40, 10);
        ctx.restore();
      });

      sparksRef.current = sparksRef.current.filter((s) => {
        const r = 8 * s.life;
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r);
        g.addColorStop(0, "rgba(255,255,200,0.8)");
        g.addColorStop(1, "rgba(255,200,0,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
        ctx.fill();
        s.life -= 0.05;
        return s.life > 0;
      });
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (tilt) return;
      if (e.code === "ArrowLeft") {
        Body.setAngle(leftFlipper, (-Math.PI / 4) * power);
      } else if (e.code === "ArrowRight") {
        Body.setAngle(rightFlipper, (Math.PI / 4) * power);
      } else if (e.code === "KeyN") {
        tryNudge();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "ArrowLeft") {
        Body.setAngle(leftFlipper, Math.PI / 8);
      }
      if (e.code === "ArrowRight") {
        Body.setAngle(rightFlipper, -Math.PI / 8);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      Render.stop(render);
      Runner.stop(runner);
      World.clear(engine.world, false);
      Engine.clear(engine);
    };
  }, [theme, power, bounce, tilt, tryNudge]);

  useEffect(() => {
    let raf: number;
    let lastPressed = false;
    const poll = () => {
      const gp = navigator.getGamepads ? navigator.getGamepads()[0] : null;
      if (gp) {
        const pressed =
          gp.buttons[5]?.pressed || (gp.axes[1] ?? 0) < -0.8;
        if (pressed && !lastPressed) {
          tryNudge();
        }
        lastPressed = pressed;
      }
      raf = requestAnimationFrame(poll);
    };
    raf = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(raf);
  }, [tryNudge]);

  useEffect(() => {
    if (leftFlipperRef.current) {
      leftFlipperRef.current.restitution = bounce;
      leftFlipperRef.current.render.fillStyle = currentTheme.flipper;
    }
    if (rightFlipperRef.current) {
      rightFlipperRef.current.restitution = bounce;
      rightFlipperRef.current.render.fillStyle = currentTheme.flipper;
    }
    if (engineRef.current) {
      (engineRef.current.render.options as any).background = currentTheme.bg;
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
            aria-label="Power"
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
            aria-label="Bounce"
          />
        </label>
        <label className="flex flex-col text-xs">
          Theme
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as Theme)}
          >
            {(Object.keys(themes) as Theme[]).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={400}
          height={600}
          className="border"
          aria-label="Pinball table"
        />
        <div className="absolute top-2 left-1/2 -translate-x-1/2 text-white font-mono text-xl">
          {score.toString().padStart(6, "0")}
        </div>
        {!tilt && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-white text-xs opacity-75">
            Press N or RB to nudge
          </div>
        )}
        {tilt && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-700/80">
            <div className="text-white font-bold text-4xl px-6 py-3 border-4 border-white rounded">
              TILT
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
