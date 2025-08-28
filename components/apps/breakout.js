"use client";

import React, { useRef, useEffect, useState } from "react";
import levelsData from "./breakout-levels.json";
import GameLayout from "./GameLayout";

// Base logical canvas size (used if container size is unavailable)
const WIDTH = 640;
const HEIGHT = 480;

const BASE_PADDLE_WIDTH = 80;

// Build bricks from a 0/1 layout grid
const buildBricks = (layout, width) => {
  const rows = layout.length;
  const cols = layout[0].length;
  const brickWidth = width / cols;
  const brickHeight = 20;
  const bricks = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (layout[r][c]) {
        bricks.push({
          x: c * brickWidth,
          y: r * brickHeight + 40,
          w: brickWidth,
          h: brickHeight,
          alive: true,
        });
      }
    }
  }
  return bricks;
};

const LevelEditor = ({ onSave, cols = 8, rows = 5 }) => {
  const [grid, setGrid] = useState(
    Array.from({ length: rows }, () => Array(cols).fill(0))
  );

  const toggle = (r, c) => {
    setGrid((g) => {
      const next = g.map((row) => row.slice());
      next[r][c] = next[r][c] ? 0 : 1;
      return next;
    });
  };

  const save = () => {
    onSave(grid);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("breakout-custom-level", JSON.stringify(grid));
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${cols}, 20px)` }}
      >
        {grid.map((row, r) =>
          row.map((cell, c) => (
            <div
              key={`${r}-${c}`}
              className={`w-5 h-5 cursor-pointer ${
                cell ? "bg-white" : "bg-gray-700"
              }`}
              onClick={() => toggle(r, c)}
            />
          ))
        )}
      </div>
      <button className="px-2 py-1 bg-gray-700 hover:bg-gray-600" onClick={save}>
        Save Level
      </button>
    </div>
  );
};

const BreakoutGame = ({ levels }) => {
  const canvasRef = useRef(null);
  const [level, setLevel] = useState(0);
  const scoreRef = useRef(0);
  const highScoresRef = useRef({});
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const [soundOn, setSoundOn] = useState(true);
  const soundRef = useRef(true);
  const [resetKey, setResetKey] = useState(0);
  const audioCtxRef = useRef(null);
  const [prefersReduced, setPrefersReduced] = useState(false);
  const [announce, setAnnounce] = useState("");

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = () => setPrefersReduced(media.matches);
    handler();
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, []);

  // Load saved level and highscores
  useEffect(() => {
    if (typeof localStorage === "undefined") return;
    const savedLevel = parseInt(localStorage.getItem("breakout-level") || "0", 10);
    const savedHigh = JSON.parse(localStorage.getItem("breakout-highscores") || "{}");
    setLevel(Number.isFinite(savedLevel) ? savedLevel : 0);
    highScoresRef.current = savedHigh && typeof savedHigh === "object" ? savedHigh : {};
  }, []);

  const reset = () => {
    scoreRef.current = 0;
    setLevel(0);
    setResetKey((k) => k + 1);
  };

  const togglePause = () => {
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
  };

  const toggleSound = () => {
    soundRef.current = !soundRef.current;
    setSoundOn(soundRef.current);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const audioCtx =
      audioCtxRef.current ||
      (typeof window !== "undefined"
        ? new (window.AudioContext || window.webkitAudioContext)()
        : null);
    audioCtxRef.current = audioCtx;

    const playSound = (freq) => {
      if (!soundRef.current || !audioCtx) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      gain.gain.value = 0.5;
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
    };

    // Fit canvas to its container and device pixel ratio
    const fit = () => {
      const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
      const cssW = canvas.clientWidth || WIDTH;
      const cssH = canvas.clientHeight || HEIGHT;
      canvas.width = Math.floor(cssW * dpr);
      canvas.height = Math.floor(cssH * dpr);
      // Draw in CSS pixels; map them to device pixels
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    fit();
    window.addEventListener("resize", fit);

    // Use CSS pixel dimensions for game logic
    const width = canvas.clientWidth || WIDTH;
    const height = canvas.clientHeight || HEIGHT;

    let bricks = buildBricks(levels[level % levels.length], width);
    const paddle = {
      x: width / 2 - BASE_PADDLE_WIDTH / 2,
      y: height - 20,
      w: BASE_PADDLE_WIDTH,
      h: 10,
    };
    const balls = [{ x: width / 2, y: height / 2, vx: 150, vy: -150, r: 5 }];
    const powerUps = [];
    const shards = [];
    const fades = [];
    let paddleTimer = 0;
    let hitPause = 0;
    let pulse = 0;
    let aimTime = 0;
    const ADVANCED_LEVEL = 3;

    const keys = { left: false, right: false };
    const keyDown = (e) => {
      if (e.key === "ArrowLeft") keys.left = true;
      if (e.key === "ArrowRight") keys.right = true;
      if (e.key === "p") togglePause();
      if (e.key === "r") reset();
      if (e.key === "m") toggleSound();
    };
    const keyUp = (e) => {
      if (e.key === "ArrowLeft") keys.left = false;
      if (e.key === "ArrowRight") keys.right = false;
    };
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);

    let animationId;
    let lastTime = performance.now();

    const loop = (time) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;
      if (hitPause > 0) {
        hitPause -= delta;
        animationId = requestAnimationFrame(loop);
        return;
      }
      const dt = Math.min(0.05, delta); // clamp big frame gaps

      if (pausedRef.current) {
        animationId = requestAnimationFrame(loop);
        return;
      }

      // Update paddle
      paddle.x += (Number(keys.right) - Number(keys.left)) * 300 * dt;
      if (paddle.x < 0) paddle.x = 0;
      if (paddle.x > width - paddle.w) paddle.x = width - paddle.w;
      if (paddleTimer > 0) {
        paddleTimer -= dt;
        if (paddleTimer <= 0) paddle.w = BASE_PADDLE_WIDTH;
      }

      if (aimTime > 0) aimTime -= dt;

      // Update balls
      for (let i = balls.length - 1; i >= 0; i -= 1) {
        const ball = balls[i];
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;

        if (ball.x < ball.r || ball.x > width - ball.r) {
          ball.vx *= -1;
          playSound(100);
        }
        if (ball.y < ball.r) {
          ball.vy *= -1;
          playSound(100);
        }

        // Paddle collision
        if (
          ball.y + ball.r > paddle.y &&
          ball.x > paddle.x &&
          ball.x < paddle.x + paddle.w &&
          ball.vy > 0
        ) {
          const hit = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
          const angle = hit * (Math.PI / 3);
          const speed = Math.hypot(ball.vx, ball.vy);
          ball.vx = speed * Math.sin(angle);
          ball.vy = -speed * Math.cos(angle);
          ball.y = paddle.y - ball.r;
          aimTime = 0.3;
          playSound(300);
        }

        // Brick collisions
        for (let b = 0; b < bricks.length; b += 1) {
          const brick = bricks[b];
          if (
            brick.alive &&
            ball.x > brick.x &&
            ball.x < brick.x + brick.w &&
            ball.y > brick.y &&
            ball.y < brick.y + brick.h
          ) {
            brick.alive = false;
            ball.vy *= -1;
            scoreRef.current += 10;
            playSound(200);
            setAnnounce(`Score ${scoreRef.current}`);

            hitPause = 0.075;
            pulse = 1;

            if (prefersReduced) {
              fades.push({
                x: brick.x,
                y: brick.y,
                w: brick.w,
                h: brick.h,
                alpha: 1,
              });
            } else {
              const impactAngle = Math.atan2(ball.vy, ball.vx);
              for (let s = 0; s < 8; s += 1) {
                const spread = (Math.random() - 0.5) * (Math.PI / 3);
                const speed = 100 + Math.random() * 100;
                shards.push({
                  x: ball.x,
                  y: ball.y,
                  vx: Math.cos(impactAngle + spread) * speed,
                  vy: Math.sin(impactAngle + spread) * speed,
                  life: 1,
                });
              }
            }

            // 20% chance to spawn a power-up
            if (Math.random() < 0.2) {
              const type = Math.random() < 0.5 ? "multi" : "expand";
              const color = type === "multi" ? "#e11d48" : "#3b82f6"; // red vs blue
              powerUps.push({
                x: brick.x + brick.w / 2,
                y: brick.y + brick.h / 2,
                type,
                color,
                vy: 100,
              });
            }
            break;
          }
        }

        // Ball lost
        if (ball.y > height + ball.r) {
          balls.splice(i, 1);
        }
      }

      // Update power-ups
      for (let i = powerUps.length - 1; i >= 0; i -= 1) {
        const p = powerUps[i];
        p.y += p.vy * dt;
        if (p.y + 8 > paddle.y && p.x > paddle.x && p.x < paddle.x + paddle.w) {
          if (p.type === "multi") {
            const additions = [];
            for (const b of balls) {
              additions.push({ x: b.x, y: b.y, vx: -b.vx, vy: b.vy, r: b.r });
              additions.push({ x: b.x, y: b.y, vx: b.vx, vy: -b.vy, r: b.r });
            }
            balls.push(...additions);
          } else if (p.type === "expand") {
            paddle.w = BASE_PADDLE_WIDTH * 1.5;
            paddleTimer = 10;
          }
          playSound(250);
          powerUps.splice(i, 1);
        } else if (p.y > height) {
          powerUps.splice(i, 1);
        }
      }

      // Update shards (respect reduced motion)
      if (!prefersReduced) {
        for (let i = shards.length - 1; i >= 0; i -= 1) {
          const s = shards[i];
          s.x += s.vx * dt;
          s.y += s.vy * dt;
          s.life -= dt * 2;
          if (s.life <= 0) shards.splice(i, 1);
        }
      }

      // Update fades for reduced motion users
      if (prefersReduced) {
        for (let i = fades.length - 1; i >= 0; i -= 1) {
          const f = fades[i];
          f.alpha -= dt * 2;
          if (f.alpha <= 0) fades.splice(i, 1);
        }
      }

      if (pulse > 0) pulse = Math.max(0, pulse - dt * 5);

      // Ensure at least one ball remains
      if (balls.length === 0) {
        balls.push({ x: width / 2, y: height / 2, vx: 150, vy: -150, r: 5 });
        aimTime = 0.3;
      }

      // Render
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, width, height);

      // Paddle
      ctx.fillStyle = "white";
      ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);

      // Aim line
      if (aimTime > 0 && balls[0]) {
        const advanced = level >= ADVANCED_LEVEL;
        const alpha = advanced ? aimTime / 0.3 : 1;
        ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
        const px = paddle.x + paddle.w / 2;
        const py = paddle.y;
        const guide = balls[0];
        const speed = Math.hypot(guide.vx, guide.vy) || 1;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(
          px + (guide.vx / speed) * 100,
          py + (guide.vy / speed) * 100
        );
        ctx.stroke();
      }

      // Balls
      for (const ball of balls) {
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Bricks
      for (const brick of bricks) {
        if (brick.alive) {
          ctx.fillRect(brick.x, brick.y, brick.w - 2, brick.h - 2);
        }
      }

      // Fades (reduced motion)
      if (prefersReduced) {
        for (const f of fades) {
          ctx.fillStyle = `rgba(255,255,255,${f.alpha})`;
          ctx.fillRect(f.x, f.y, f.w - 2, f.h - 2);
        }
      }

      // Shards
      if (!prefersReduced) {
        ctx.fillStyle = "#fff";
        for (const s of shards) {
          ctx.globalAlpha = s.life;
          ctx.fillRect(s.x, s.y, 2, 2);
        }
        ctx.globalAlpha = 1;
      }

      // Pulse overlay
      if (pulse > 0) {
        ctx.fillStyle = `rgba(255,255,255,${pulse})`;
        ctx.fillRect(0, 0, width, height);
      }

      // Power-ups
      for (const p of powerUps) {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      // HUD
      ctx.fillStyle = "white";
      ctx.font = "14px monospace";
      ctx.textBaseline = "top";
      ctx.textAlign = "left";
      ctx.fillText(`Level: ${level + 1}`, 10, 10);
      ctx.fillText(`Score: ${scoreRef.current}`, 10, 26);
      ctx.fillText(`High: ${highScoresRef.current[level] || 0}`, 10, 42);

      if (pausedRef.current) {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.font = "20px monospace";
        ctx.fillText("Paused", width / 2, height / 2);
        ctx.textAlign = "left";
      }

      // Level complete
      if (bricks.every((b) => !b.alive)) {
        highScoresRef.current[level] = Math.max(
          highScoresRef.current[level] || 0,
          scoreRef.current
        );
        if (typeof localStorage !== "undefined") {
          localStorage.setItem(
            "breakout-highscores",
            JSON.stringify(highScoresRef.current)
          );
          const nextLevel = level + 1;
          localStorage.setItem("breakout-level", String(nextLevel));
        }
        setLevel((v) => v + 1);
        scoreRef.current = 0;
        return; // stop this loop; next render will re-init with new level
      }

      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      window.removeEventListener("resize", fit);
    };
  }, [level, levels, resetKey, prefersReduced]);

  return (
    <div className="relative h-full w-full">
      <canvas ref={canvasRef} className="h-full w-full bg-black" />
      <div className="sr-only" aria-live="polite" role="status">
        {announce}
      </div>
      <div className="absolute top-2 right-2 flex gap-2 z-10 text-xs">
        <button
          type="button"
          className="bg-gray-700 px-2 py-1"
          onClick={reset}
        >
          Reset
        </button>
        <button
          type="button"
          className="bg-gray-700 px-2 py-1"
          onClick={togglePause}
        >
          {paused ? "Play" : "Pause"}
        </button>
        <button
          type="button"
          className="bg-gray-700 px-2 py-1"
          onClick={toggleSound}
        >
          {soundOn ? "Mute" : "Sound"}
        </button>
      </div>
    </div>
  );
};

const Breakout = () => {
  const [levels, setLevels] = useState(levelsData || []);

  useEffect(() => {
    if (typeof localStorage === "undefined") return;
    const custom = localStorage.getItem("breakout-custom-level");
    if (custom) {
      try {
        const grid = JSON.parse(custom);
        if (Array.isArray(grid)) setLevels((lvls) => [...lvls, grid]);
      } catch {
        // ignore invalid JSON
      }
    }
  }, []);

  const addLevel = (grid) => {
    setLevels((lvls) => [...lvls, grid]);
  };

  return (
    <GameLayout editor={<LevelEditor onSave={addLevel} />}>
      <BreakoutGame levels={levels} />
    </GameLayout>
  );
};

export default Breakout;
