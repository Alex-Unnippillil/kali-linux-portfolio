import React, { useRef, useEffect } from 'react';
import { withGameErrorBoundary } from './GameErrorBoundary';

const Breakout = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    const paddle = { x: width / 2 - 40, y: height - 20, w: 80, h: 10 };
    const ball = { x: width / 2, y: height / 2, vx: 150, vy: -150, r: 5 };

    const keys = { left: false, right: false };

    const keyDown = (e) => {
      if (e.key === 'ArrowLeft') keys.left = true;
      if (e.key === 'ArrowRight') keys.right = true;
    };
    const keyUp = (e) => {
      if (e.key === 'ArrowLeft') keys.left = false;
      if (e.key === 'ArrowRight') keys.right = false;
    };
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);

    let lastTime = 0;
    const loop = (time) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      paddle.x += (keys.right - keys.left) * 300 * dt;
      paddle.x = Math.max(0, Math.min(width - paddle.w, paddle.x));

      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      if (ball.x < ball.r || ball.x > width - ball.r) ball.vx *= -1;
      if (ball.y < ball.r) ball.vy *= -1;

      if (
        ball.y + ball.r > paddle.y &&
        ball.x > paddle.x &&
        ball.x < paddle.x + paddle.w
      ) {
        ball.vy *= -1;
        ball.y = paddle.y - ball.r;
      }

      if (ball.y > height + ball.r) {
        ball.x = width / 2;
        ball.y = height / 2;
        ball.vx = 150 * (Math.random() > 0.5 ? 1 : -1);
        ball.vy = -150;
      }

      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = 'white';
      ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fill();

      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={640}
      height={480}
      className="h-full w-full bg-black"
    />
  );
};

const BreakoutWithBoundary = withGameErrorBoundary(Breakout);

export default BreakoutWithBoundary;
