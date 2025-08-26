import React, { useEffect, useState, useRef } from 'react';
import useCanvasResize from '../../hooks/useCanvasResize';
import GameLayout from './GameLayout';
const WIDTH = 400;
const HEIGHT = 500;

const Pinball = () => {
  const canvasRef = useCanvasResize(WIDTH, HEIGHT);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const scoreRef = useRef(0);
  const displayScoreRef = useRef(0);
  const highRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = WIDTH;
    const height = HEIGHT;

    const savedHigh = Number(localStorage.getItem('pinballHighScore')) || 0;
    setHighScore(savedHigh);
    highRef.current = savedHigh;

    const ball = { x: width / 2, y: 50, vx: 80, vy: 0, r: 8 };
    const gravity = 400; // px per second^2
    const damping = 0.99;
    const flippers = { left: false, right: false };
    const floor = height - 20;

    const nudge = () => {
      ball.vx += (Math.random() - 0.5) * 200;
      ball.vy -= 150;
    };

    const keydown = (e) => {
      if (e.key === 'ArrowLeft') flippers.left = true;
      if (e.key === 'ArrowRight') flippers.right = true;
      if (e.key === 'ArrowUp' || e.key === ' ') nudge();
    };

    const keyup = (e) => {
      if (e.key === 'ArrowLeft') flippers.left = false;
      if (e.key === 'ArrowRight') flippers.right = false;
    };

    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);

    const touchstart = (e) => {
      e.preventDefault();
      if (e.touches.length > 1) {
        nudge();
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const x = e.touches[0].clientX - rect.left;
      if (x < width / 2) flippers.left = true;
      else flippers.right = true;
    };

    const touchend = () => {
      flippers.left = false;
      flippers.right = false;
    };

    canvas.addEventListener('touchstart', touchstart, { passive: false });
    canvas.addEventListener('touchend', touchend);

    const reset = () => {
      if (scoreRef.current > highRef.current) {
        highRef.current = Math.floor(scoreRef.current);
        setHighScore(highRef.current);
        localStorage.setItem('pinballHighScore', String(highRef.current));
      }
      scoreRef.current = 0;
      setScore(0);
      ball.x = width / 2;
      ball.y = 50;
      ball.vx = 80 * (Math.random() > 0.5 ? 1 : -1);
      ball.vy = 0;
    };

    let last = 0;
    let animationId;

    const loop = (time) => {
      animationId = requestAnimationFrame(loop);
      const dt = Math.min((time - last) / 1000, 0.02);
      last = time;

      ball.vy += gravity * dt;
      ball.vx *= damping;
      ball.vy *= damping;
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      scoreRef.current += dt * 10;
      const currentScore = Math.floor(scoreRef.current);
      if (currentScore !== displayScoreRef.current) {
        displayScoreRef.current = currentScore;
        setScore(currentScore);
      }

      if (ball.x < ball.r) {
        ball.x = ball.r;
        ball.vx *= -1;
      }
      if (ball.x > width - ball.r) {
        ball.x = width - ball.r;
        ball.vx *= -1;
      }

      if (ball.y < ball.r) {
        ball.y = ball.r;
        ball.vy *= -1;
      }

      if (ball.y + ball.r > floor) {
        if (flippers.left && ball.x < width / 2) {
          ball.vy = -350;
          ball.vx = -200;
        } else if (flippers.right && ball.x >= width / 2) {
          ball.vy = -350;
          ball.vx = 200;
        } else {
          reset();
        }
      }

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#ff6f00';
      ctx.save();
      ctx.translate(80, floor);
      ctx.rotate(flippers.left ? -0.5 : 0);
      ctx.fillRect(-40, -5, 40, 10);
      ctx.restore();

      ctx.save();
      ctx.translate(width - 80, floor);
      ctx.rotate(flippers.right ? 0.5 : 0);
      ctx.fillRect(0, -5, 40, 10);
      ctx.restore();

      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fill();
    };

    reset();
    animationId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
      canvas.removeEventListener('touchstart', touchstart);
      canvas.removeEventListener('touchend', touchend);
    };
  }, [canvasRef]);

  return (
    <GameLayout stage={1} lives={1} score={score} highScore={highScore}>
      <canvas
        ref={canvasRef}
        className="bg-black w-full h-full"
        role="application"
        aria-label="Pinball game board"
        tabIndex={0}
      />
    </GameLayout>
  );
};

export default Pinball;

