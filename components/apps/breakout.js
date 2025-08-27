"use client";

import React, { useRef, useEffect, useState } from "react";
import levelsData from "./breakout-levels.json";
import GameLayout from "./GameLayout";

// Base logical canvas size (used if container size is unavailable)
const WIDTH = 640;
const HEIGHT = 480;

const BASE_PADDLE_WIDTH = 80;

// Build bricks from a 0/1 layout grid
export const buildBricks = (layout, width) => {
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

// Resolve paddle collisions with optional magnet and precision assist
export const handlePaddleCollision = (
  ball,
  paddle,
  magnet = false,
  assist = false
) => {
  if (
    ball.y + ball.r > paddle.y &&
    ball.x > paddle.x &&
    ball.x < paddle.x + paddle.w &&
    ball.vy > 0
  ) {
    ball.y = paddle.y - ball.r;
    if (magnet) {
      ball.stuck = true;
      ball.vx = 0;
      ball.vy = 0;
    } else {
      ball.vy *= -1;
      if (assist) {
        const hit =
          (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
        ball.vx = hit * Math.abs(ball.vy);
      }
    }
    return true;
  }
  return false;
};

// Handle brick collisions, scoring and power-ups
export const handleBallBrickCollision = (
  ball,
  bricks,
  scoreRef,
  powerUps = []
) => {
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
      if (scoreRef) scoreRef.current += 10;
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(50);
      }
      if (powerUps) {
        if (Math.random() < 0.2) {
          const type = Math.random() < 0.5 ? "multi" : "expand";
          powerUps.push({
            x: brick.x + brick.w / 2,
            y: brick.y + brick.h / 2,
            type,
            vy: 100,
          });
        }
      }
      return true;
    }
  }
  return false;
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
  const livesRef = useRef(3);
  const magnetRef = useRef(false);
  const assistRef = useRef(false);

  // Load saved level and highscores
  useEffect(() => {
    if (typeof localStorage === "undefined") return;
    const savedLevel = parseInt(localStorage.getItem("breakout-level") || "0", 10);
    const savedHigh = JSON.parse(localStorage.getItem("breakout-highscores") || "{}");
    setLevel(Number.isFinite(savedLevel) ? savedLevel : 0);
    highScoresRef.current = savedHigh && typeof savedHigh === "object" ? savedHigh : {};
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

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
    let paddleTimer = 0;

    const keys = { left: false, right: false };
    const keyDown = (e) => {
      if (e.key === "ArrowLeft") keys.left = true;
      if (e.key === "ArrowRight") keys.right = true;
      if (e.key === "m") magnetRef.current = !magnetRef.current;
      if (e.key === "p") assistRef.current = !assistRef.current;
      if (e.key === " ") {
        balls.forEach((b) => {
          if (b.stuck) {
            b.stuck = false;
            b.vy = -150;
          }
        });
      }
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
      const dt = Math.min(0.05, (time - lastTime) / 1000); // clamp big frame gaps
      lastTime = time;

      // Update paddle
      paddle.x += (Number(keys.right) - Number(keys.left)) * 300 * dt;
      if (paddle.x < 0) paddle.x = 0;
      if (paddle.x > width - paddle.w) paddle.x = width - paddle.w;
      if (paddleTimer > 0) {
        paddleTimer -= dt;
        if (paddleTimer <= 0) paddle.w = BASE_PADDLE_WIDTH;
      }

      // Update balls
      for (let i = balls.length - 1; i >= 0; i -= 1) {
        const ball = balls[i];
        if (ball.stuck) {
          ball.x = paddle.x + paddle.w / 2;
          ball.y = paddle.y - ball.r;
          continue;
        }
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;

        if (ball.x < ball.r || ball.x > width - ball.r) ball.vx *= -1;
        if (ball.y < ball.r) ball.vy *= -1;

        handlePaddleCollision(
          ball,
          paddle,
          magnetRef.current,
          assistRef.current
        );

        handleBallBrickCollision(ball, bricks, scoreRef, powerUps);

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
            balls.push({
              x: paddle.x + paddle.w / 2,
              y: paddle.y - 10,
              vx: 150,
              vy: -150,
              r: 5,
            });
          } else if (p.type === "expand") {
            paddle.w = BASE_PADDLE_WIDTH * 1.5;
            paddleTimer = 10;
          }
          powerUps.splice(i, 1);
        } else if (p.y > height) {
          powerUps.splice(i, 1);
        }
      }

      // Ensure at least one ball remains and handle lives
      if (balls.length === 0) {
        livesRef.current -= 1;
        if (livesRef.current > 0) {
          balls.push({
            x: width / 2,
            y: height / 2,
            vx: 150,
            vy: -150,
            r: 5,
          });
        } else {
          livesRef.current = 3;
          scoreRef.current = 0;
          setLevel(0);
          bricks = buildBricks(levels[0], width);
        }
      }

      // Render
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, width, height);

      // Paddle
      ctx.fillStyle = "white";
      ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);

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

      // Power-ups
      for (const p of powerUps) {
        ctx.fillStyle = p.type === "multi" ? "red" : "blue";
        ctx.fillRect(p.x - 5, p.y - 5, 10, 10);
      }

      // HUD
      ctx.fillStyle = "white";
      ctx.font = "14px monospace";
      ctx.textBaseline = "top";
      ctx.fillText(`Level: ${level + 1}`, 10, 10);
      ctx.fillText(`Score: ${scoreRef.current}`, 10, 26);
      ctx.fillText(`High: ${highScoresRef.current[level] || 0}`, 10, 42);
      ctx.fillText(`Lives: ${livesRef.current}`, 10, 58);
      ctx.fillText(
        `Mag: ${magnetRef.current ? "ON" : "OFF"}`,
        width - 100,
        10
      );
      ctx.fillText(
        `Aim: ${assistRef.current ? "ON" : "OFF"}`,
        width - 100,
        26
      );

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
  }, [level, levels]);

  return <canvas ref={canvasRef} className="h-full w-full bg-black" />;
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
