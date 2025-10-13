"use client";

import React, { useRef, useEffect, useState } from 'react';
import seedrandom from 'seedrandom';
import GameLayout from './GameLayout';
import useCanvasResize from '../../hooks/useCanvasResize';
import BreakoutEditor from './breakoutEditor';
import BreakoutLevels from './breakoutLevels';

// Basic canvas dimensions
const WIDTH = 400;
const HEIGHT = 300;
const HUD_HEIGHT = 20;
const PADDLE_WIDTH = WIDTH * 0.15;
const PADDLE_HEIGHT = HEIGHT * 0.033;
const PADDLE_Y = HEIGHT - PADDLE_HEIGHT * 2;
const BALL_RADIUS = 5;
const ROWS = 5;
const COLS = 10;
const BRICK_WIDTH = WIDTH / COLS;
const BRICK_HEIGHT = HEIGHT * 0.05;
const DEFAULT_LAYOUT = Array.from({ length: ROWS }, () => Array(COLS).fill(1));
const TRAIL_LENGTH = 10;

const createBricks = (layout) => {
  const bricks = [];
  for (let r = 0; r < layout.length; r += 1) {
    for (let c = 0; c < layout[r].length; c += 1) {
      const type = layout[r][c];
      if (type > 0) {
        bricks.push({
          x: c * BRICK_WIDTH,
          y: HUD_HEIGHT + r * (BRICK_HEIGHT + 2),
          w: BRICK_WIDTH - 2,
          h: BRICK_HEIGHT,
          type,
          alive: true,
        });
      }
    }
  }
  return bricks;
};

// Breakout with level editor, selection, multi-ball and magnet power-up
const Breakout = () => {
  const canvasRef = useCanvasResize(WIDTH, HEIGHT);
  const paddleX = useRef(WIDTH / 2 - PADDLE_WIDTH / 2);
  const ballsRef = useRef([]);
  const bricksRef = useRef([]);
  const levelRef = useRef(DEFAULT_LAYOUT);
  const magnetRef = useRef(0);
  const animationRef = useRef(0);
  const livesRef = useRef(3);
  const levelNumRef = useRef(1);
  const [selecting, setSelecting] = useState(true);

  const startLevel = (layout) => {
    const grid = layout || DEFAULT_LAYOUT;
    levelRef.current = grid;
    bricksRef.current = createBricks(grid);
    ballsRef.current = [
      {
        x: WIDTH / 2,
        y: HEIGHT / 2,
        vx: 2,
        vy: -2,
        stuck: false,
        trail: [],
      },
    ];
    magnetRef.current = 0;
    setSelecting(false);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || selecting) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const release = () => {
      ballsRef.current.forEach((b) => {
        if (b.stuck) {
          b.stuck = false;
          b.vy = -2;
          b.vx = 2 * (Math.random() - 0.5);
        }
      });
    };

    const handleMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      paddleX.current = Math.max(
        0,
        Math.min(WIDTH - PADDLE_WIDTH, x - PADDLE_WIDTH / 2),
      );
    };

    const handleKey = (e) => {
      if (e.key === 'ArrowLeft') {
        paddleX.current = Math.max(0, paddleX.current - 20);
      } else if (e.key === 'ArrowRight') {
        paddleX.current = Math.min(WIDTH - PADDLE_WIDTH, paddleX.current + 20);
      } else if (e.key === ' ') {
        release();
      }
    };

    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('click', release);
    window.addEventListener('keydown', handleKey);

    const draw = () => {
      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      magnetRef.current = Math.max(0, magnetRef.current - 1);

      // HUD
      ctx.fillStyle = '#fff';
      ctx.font = '12px sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillText(`Lives: ${livesRef.current}`, 4, 2);
      ctx.fillText(`Level: ${levelNumRef.current}`, WIDTH - 60, 2);

      // Power-up icons
      const icons = [];
      if (magnetRef.current > 0) icons.push('magnet');
      if (ballsRef.current.length > 1) icons.push('multi');
      const iconSize = 12;
      const spacing = 6;
      let iconX =
        WIDTH / 2 -
        (icons.length * iconSize + (icons.length - 1) * spacing) / 2;
      icons.forEach((ic) => {
        ctx.save();
        ctx.translate(iconX, 4);
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#fff';
        if (ic === 'magnet') {
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(iconSize / 2, iconSize / 2, iconSize / 2 - 1, Math.PI * 0.1, Math.PI * 0.9);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(iconSize / 2, iconSize / 2);
          ctx.lineTo(iconSize / 2, iconSize - 1);
          ctx.stroke();
        } else if (ic === 'multi') {
          ctx.beginPath();
          ctx.arc(iconSize / 3, iconSize / 2, iconSize / 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc((iconSize / 3) * 2, iconSize / 2, iconSize / 4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        iconX += iconSize + spacing;
      });

      // Draw paddle
      ctx.fillStyle = '#fff';
      ctx.fillRect(paddleX.current, PADDLE_Y, PADDLE_WIDTH, PADDLE_HEIGHT);

      // Draw bricks
      bricksRef.current.forEach((br) => {
        if (!br.alive) return;
        ctx.fillStyle =
          br.type === 1 ? '#999' : br.type === 2 ? '#0f0' : '#f00';
        ctx.fillRect(br.x, br.y, br.w, br.h);
      });

      // Update balls
      ballsRef.current.forEach((ball) => {
        if (ball.stuck) {
          ball.x = paddleX.current + ball.offset;
          ball.y = PADDLE_Y - BALL_RADIUS;
          ball.trail = [];
        } else {
          ball.trail.push({ x: ball.x, y: ball.y });
          if (ball.trail.length > TRAIL_LENGTH) ball.trail.shift();
          ball.x += ball.vx;
          ball.y += ball.vy;
        }

        // Wall collisions
        if (ball.x < BALL_RADIUS || ball.x > WIDTH - BALL_RADIUS) {
          ball.vx *= -1;
        }
        if (ball.y < BALL_RADIUS) {
          ball.vy *= -1;
        }

        // Paddle collision
        if (
          !ball.stuck &&
          ball.y >= PADDLE_Y - BALL_RADIUS &&
          ball.x >= paddleX.current &&
          ball.x <= paddleX.current + PADDLE_WIDTH
        ) {
          ball.vy *= -1;
          ball.y = PADDLE_Y - BALL_RADIUS;
          if (magnetRef.current > 0) {
            ball.stuck = true;
            ball.offset = BALL_RADIUS;
          }
        }

        // Brick collisions
        bricksRef.current.forEach((br) => {
          if (!br.alive) return;
          if (
            ball.x > br.x &&
            ball.x < br.x + br.w &&
            ball.y > br.y &&
            ball.y < br.y + br.h
          ) {
            br.alive = false;
            ball.vy *= -1;
            if (br.type === 2) {
              ballsRef.current.push({
                x: ball.x,
                y: ball.y,
                vx: -ball.vx,
                vy: ball.vy,
                stuck: false,
                trail: [],
              });
            } else if (br.type === 3) {
              magnetRef.current = 300;
            }
          }
        });

        // Draw trail
        ball.trail.forEach((p, i) => {
          ctx.fillStyle = `rgba(255,255,255,${
            ((i + 1) / ball.trail.length) * 0.5
          })`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, BALL_RADIUS, 0, Math.PI * 2);
          ctx.fill();
        });

        // Draw ball
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      });

      if (bricksRef.current.every((br) => !br.alive)) {
        levelNumRef.current += 1;
        startLevel(levelRef.current);
        return;
      }

      // Remove lost balls
      ballsRef.current = ballsRef.current.filter(
        (b) => b.y < HEIGHT + BALL_RADIUS,
      );
      if (ballsRef.current.length === 0) {
        livesRef.current -= 1;
        if (livesRef.current > 0) {
          startLevel(levelRef.current);
        } else {
          livesRef.current = 3;
          levelNumRef.current = 1;
          startLevel(levelRef.current);
        }
        return;
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    animationRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animationRef.current);
      canvas.removeEventListener('mousemove', handleMove);
      canvas.removeEventListener('click', release);
      window.removeEventListener('keydown', handleKey);
    };
  }, [canvasRef, selecting]);

  const handleSelect = (layout) => {
    livesRef.current = 3;
    levelNumRef.current = 1;
    startLevel(layout);
  };

  return (
    <GameLayout
      gameId="breakout"
      editor={<BreakoutEditor onLoad={handleSelect} />}
    >
      {selecting && <BreakoutLevels onSelect={handleSelect} />}
      <canvas ref={canvasRef} className="w-full h-full bg-black" />
    </GameLayout>
  );
};

export default Breakout;

// Exported for tests
export const createRng = (seed) => (seed ? seedrandom(seed) : Math.random);

