"use client";

import React, { useRef, useEffect } from 'react';
import seedrandom from 'seedrandom';
import GameLayout from './GameLayout';
import useCanvasResize from '../../hooks/useCanvasResize';

// Basic canvas dimensions
const WIDTH = 400;
const HEIGHT = 300;
const PADDLE_WIDTH = 60;
const PADDLE_HEIGHT = 10;
const BALL_RADIUS = 5;

// Simple Breakout placeholder with a single paddle and ball
const Breakout = () => {
  const canvasRef = useCanvasResize(WIDTH, HEIGHT);
  const paddleX = useRef(WIDTH / 2 - PADDLE_WIDTH / 2);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const ball = { x: WIDTH / 2, y: HEIGHT / 2, vx: 2, vy: -2 };
    let animationId;

    const draw = () => {
      ctx.clearRect(0, 0, WIDTH, HEIGHT);

      // Draw paddle
      ctx.fillStyle = '#fff';
      ctx.fillRect(paddleX.current, HEIGHT - 20, PADDLE_WIDTH, PADDLE_HEIGHT);

      // Draw ball
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fill();

      // Move ball
      ball.x += ball.vx;
      ball.y += ball.vy;

      // Wall collisions
      if (ball.x < BALL_RADIUS || ball.x > WIDTH - BALL_RADIUS) {
        ball.vx *= -1;
      }
      if (ball.y < BALL_RADIUS) {
        ball.vy *= -1;
      }

      // Paddle collision
      if (
        ball.y >= HEIGHT - 20 - BALL_RADIUS &&
        ball.x >= paddleX.current &&
        ball.x <= paddleX.current + PADDLE_WIDTH
      ) {
        ball.vy *= -1;
        ball.y = HEIGHT - 20 - BALL_RADIUS;
      }

      // Reset if ball falls below
      if (ball.y > HEIGHT + BALL_RADIUS) {
        ball.x = WIDTH / 2;
        ball.y = HEIGHT / 2;
        ball.vx = 2;
        ball.vy = -2;
      }

      animationId = requestAnimationFrame(draw);
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
        paddleX.current = Math.min(
          WIDTH - PADDLE_WIDTH,
          paddleX.current + 20,
        );
      }
    };

    canvas.addEventListener('mousemove', handleMove);
    window.addEventListener('keydown', handleKey);
    draw();

    return () => {
      cancelAnimationFrame(animationId);
      canvas.removeEventListener('mousemove', handleMove);
      window.removeEventListener('keydown', handleKey);
    };
  }, [canvasRef]);

  return (
    <GameLayout gameId="breakout">
      <canvas ref={canvasRef} className="w-full h-full bg-black" />
    </GameLayout>
  );
};

export default Breakout;

// Exported for tests
export const createRng = (seed) => (seed ? seedrandom(seed) : Math.random);

