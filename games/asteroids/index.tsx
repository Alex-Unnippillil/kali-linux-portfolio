"use client";

// Legacy implementation; not used by the app registry.
import React, { useEffect, useRef, useState, useCallback } from "react";

// Basic entity types
interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

interface Asteroid {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  shape: number[]; // flat array of x,y pairs
}

const DPR =
  typeof globalThis === "object" &&
  typeof (globalThis as any).devicePixelRatio !== "undefined"
    ? (globalThis as any).devicePixelRatio || 1
    : 1;

const AsteroidsGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shipRef = useRef({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    angle: 0,
    cooldown: 0,
  });
  const asteroidsRef = useRef<Asteroid[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const keysRef = useRef<Record<string, boolean>>({});
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [paused, setPaused] = useState(false);

  // Handle key events
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPaused((p) => !p);
      } else {
        keysRef.current[e.key] = true;
      }
    };
    const up = (e: KeyboardEvent) => {
      keysRef.current[e.key] = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);
  const initGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    shipRef.current = {
      x: canvas.width / 2 / DPR,
      y: canvas.height / 2 / DPR,
      vx: 0,
      vy: 0,
      angle: 0,
      cooldown: 0,
    };
    asteroidsRef.current = [];
    bulletsRef.current = [];
    for (let i = 0; i < 4; i++) spawnAsteroid(canvas);
    setLives(3);
    setScore(0);
  }, []);

  function spawnAsteroid(canvas: HTMLCanvasElement) {
    const r = 20 + Math.random() * 30;
    const x = Math.random() * canvas.width / DPR;
    const y = Math.random() * canvas.height / DPR;
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.5 + Math.random();
    const points: number[] = [];
    const verts = 8;
    for (let i = 0; i < verts; i++) {
      const theta = (i / verts) * Math.PI * 2;
      const offset = (Math.random() * 0.4 - 0.2) * r;
      points.push(Math.cos(theta) * r + offset);
      points.push(Math.sin(theta) * r + offset);
    }
    asteroidsRef.current.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r,
      shape: points,
    });
  }

  function wrap(obj: { x: number; y: number }, width: number, height: number) {
    if (obj.x < -20) obj.x = width + 20;
    if (obj.x > width + 20) obj.x = -20;
    if (obj.y < -20) obj.y = height + 20;
    if (obj.y > height + 20) obj.y = -20;
  }

  const update = useCallback((canvas: HTMLCanvasElement) => {
    const ship = shipRef.current;
    const keys = keysRef.current;
    if (keys["ArrowLeft"]) ship.angle -= 0.05;
    if (keys["ArrowRight"]) ship.angle += 0.05;
    if (keys["ArrowUp"]) {
      ship.vx += Math.cos(ship.angle) * 0.1;
      ship.vy += Math.sin(ship.angle) * 0.1;
    }
    ship.x += ship.vx;
    ship.y += ship.vy;
    ship.vx *= 0.99;
    ship.vy *= 0.99;
    wrap(ship, canvas.width / DPR, canvas.height / DPR);
    if (ship.cooldown > 0) ship.cooldown -= 1;
    if (keys[" "] && ship.cooldown <= 0) {
      bulletsRef.current.push({
        x: ship.x + Math.cos(ship.angle) * 10,
        y: ship.y + Math.sin(ship.angle) * 10,
        vx: Math.cos(ship.angle) * 5,
        vy: Math.sin(ship.angle) * 5,
        life: 60,
      });
      ship.cooldown = 10;
    }
    bulletsRef.current.forEach((b) => {
      b.x += b.vx;
      b.y += b.vy;
      b.life -= 1;
      wrap(b, canvas.width / DPR, canvas.height / DPR);
    });
    bulletsRef.current = bulletsRef.current.filter((b) => b.life > 0);

    asteroidsRef.current.forEach((a) => {
      a.x += a.vx;
      a.y += a.vy;
      wrap(a, canvas.width / DPR, canvas.height / DPR);
    });

    // bullet vs asteroid
    bulletsRef.current.forEach((b) => {
      asteroidsRef.current.forEach((a, idx) => {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        if (Math.hypot(dx, dy) < a.r) {
          asteroidsRef.current.splice(idx, 1);
          b.life = 0;
          spawnAsteroid(canvas);
          setScore((s) => s + 100);
        }
      });
    });
    bulletsRef.current = bulletsRef.current.filter((b) => b.life > 0);

    // ship collision
    asteroidsRef.current.forEach((a) => {
      const dx = ship.x - a.x;
      const dy = ship.y - a.y;
      if (Math.hypot(dx, dy) < a.r + 10) {
        setLives((l) => l - 1);
        ship.x = canvas.width / 2 / DPR;
        ship.y = canvas.height / 2 / DPR;
        ship.vx = ship.vy = 0;
        ship.angle = 0;
      }
    });
  }, []);

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineJoin = "round";
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#fff";
    ctx.shadowColor = "#0ff";
    ctx.shadowBlur = 4 * DPR;

    // ship
    const ship = shipRef.current;
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle);
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-10, 8);
    ctx.lineTo(-6, 0);
    ctx.lineTo(-10, -8);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    // asteroids
    asteroidsRef.current.forEach((a) => {
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.beginPath();
      const pts = a.shape;
      ctx.moveTo(pts[0], pts[1]);
      for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    });

    // bullets
    ctx.fillStyle = "#fff";
    ctx.shadowBlur = 0;
    bulletsRef.current.forEach((b) => {
      ctx.beginPath();
      ctx.arc(b.x, b.y, 2, 0, Math.PI * 2);
      ctx.fill();
    });
    },
    [],
  );

  // Initialise canvas and start loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function resize() {
      if (!canvas || !ctx) return;
      const { clientWidth, clientHeight } = canvas;
      canvas.width = clientWidth * DPR;
      canvas.height = clientHeight * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    initGame();

    let id: number;
    const loop = () => {
      if (!paused) {
        update(canvas);
        draw(ctx, canvas);
      }
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", resize);
    };
  }, [paused, initGame, update, draw]);

  const resetGame = () => {
    initGame();
    setPaused(false);
  };

  return (
    <div className="relative w-full h-full bg-black" data-testid="asteroids-game">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        aria-label="Legacy Asteroids game canvas"
      />
      <div className="pointer-events-none absolute inset-0 select-none">
        <div className="absolute top-2 left-2 flex gap-1">
          {Array.from({ length: lives }).map((_, i) => (
            <svg
              key={i}
              width="16"
              height="16"
              viewBox="0 0 16 16"
              className="text-white"
            >
              <polygon
                points="8,2 2,14 14,14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              />
            </svg>
          ))}
        </div>
        <div className="absolute top-2 right-2 text-white text-sm text-right min-w-[40px]">
          {score}
        </div>
        {paused && (
          <div className="pointer-events-auto absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
            <button
              className="text-[12px] px-2 py-1 bg-white text-black rounded"
              onClick={() => setPaused(false)}
            >
              Resume
            </button>
            <button
              className="text-[12px] px-2 py-1 bg-white text-black rounded"
              onClick={resetGame}
            >
              Restart
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AsteroidsGame;
