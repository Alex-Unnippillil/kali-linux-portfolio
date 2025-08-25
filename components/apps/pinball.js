import React, { useRef, useEffect } from 'react';
import useGameControls from '../../hooks/useGameControls';

const Pinball = () => {
  const canvasRef = useRef(null);

  const flippers = useRef({ left: false, right: false });
  useGameControls({
    keydown: {
      ArrowLeft: () => (flippers.current.left = true),
      ArrowRight: () => (flippers.current.right = true),
    },
    keyup: {
      ArrowLeft: () => (flippers.current.left = false),
      ArrowRight: () => (flippers.current.right = false),
    },
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    const ball = { x: width / 2, y: 50, vx: 100, vy: 0, r: 8 };
    const gravity = 500; // px per second^2
    const floor = height - 20;

    const reset = () => {
      ball.x = width / 2;
      ball.y = 50;
      ball.vx = 100 * (Math.random() > 0.5 ? 1 : -1);
      ball.vy = 0;
    };

    let last = 0;
    let animationId;

    const loop = (time) => {
      animationId = requestAnimationFrame(loop);
      const dt = (time - last) / 1000;
      last = time;

      ball.vy += gravity * dt;
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

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

      const f = flippers.current;
      if (ball.y + ball.r > floor) {
        if (f.left && ball.x < width / 2) {
          ball.vy = -300;
          ball.vx = -150;
        } else if (f.right && ball.x >= width / 2) {
          ball.vy = -300;
          ball.vx = 150;
        } else {
          reset();
        }
      }

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#ff6f00';
      const f = flippers.current;
      ctx.save();
      ctx.translate(80, floor);
      ctx.rotate(f.left ? -0.5 : 0);
      ctx.fillRect(-40, -5, 40, 10);
      ctx.restore();

      ctx.save();
      ctx.translate(width - 80, floor);
      ctx.rotate(f.right ? 0.5 : 0);
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
    };
  }, []);

  return (
    <div className="h-full w-full flex items-center justify-center bg-ub-cool-grey">
      <canvas ref={canvasRef} width={400} height={500} className="bg-black" />
    </div>
  );
};

export default Pinball;

