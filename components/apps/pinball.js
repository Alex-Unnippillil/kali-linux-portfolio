import React, { useRef, useEffect } from 'react';

const Pinball = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Offload rendering and game loop to a worker when supported
    if (canvas.transferControlToOffscreen && typeof Worker !== 'undefined') {
      const off = canvas.transferControlToOffscreen();
      const worker = new Worker(new URL('./pinball.worker.js', import.meta.url));
      worker.postMessage({ canvas: off }, [off]);
      const handleKey = (e) =>
        worker.postMessage({ type: 'key', key: e.key, down: e.type === 'keydown' });
      window.addEventListener('keydown', handleKey);
      window.addEventListener('keyup', handleKey);
      return () => {
        worker.terminate();
        window.removeEventListener('keydown', handleKey);
        window.removeEventListener('keyup', handleKey);
      };
    }

    // Fallback to main-thread implementation
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    const ball = { x: width / 2, y: 50, vx: 100, vy: 0, r: 8 };
    const gravity = 500; // px per second^2
    const flippers = { left: false, right: false };
    const floor = height - 20;

    const keydown = (e) => {
      if (e.key === 'ArrowLeft') flippers.left = true;
      if (e.key === 'ArrowRight') flippers.right = true;
    };

    const keyup = (e) => {
      if (e.key === 'ArrowLeft') flippers.left = false;
      if (e.key === 'ArrowRight') flippers.right = false;
    };

    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);

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

      if (ball.y + ball.r > floor) {
        if (flippers.left && ball.x < width / 2) {
          ball.vy = -300;
          ball.vx = -150;
        } else if (flippers.right && ball.x >= width / 2) {
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
    };
  }, []);

  return (
    <div className="h-full w-full flex items-center justify-center bg-panel">
      <canvas ref={canvasRef} width={400} height={500} className="bg-black" />
    </div>
  );
};

export default Pinball;

