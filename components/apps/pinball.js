import React, { useEffect, useRef } from 'react';
import useCanvasResize from '../../hooks/useCanvasResize';

const WIDTH = 400;
const HEIGHT = 500;

const distanceToSegment = (px, py, x1, y1, x2, y2) => {
  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;
  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;
  if (lenSq !== 0) param = dot / lenSq;
  if (param < 0) param = 0;
  if (param > 1) param = 1;
  const xx = x1 + param * C;
  const yy = y1 + param * D;
  const dx = px - xx;
  const dy = py - yy;
  return Math.hypot(dx, dy);
};

const Pinball = () => {
  const canvasRef = useCanvasResize(WIDTH, HEIGHT);
  const controlsRef = useRef({ left: false, right: false });
  const animRef = useRef();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const ball = { x: WIDTH / 2, y: 100, vx: 2, vy: 2, r: 8 };
    const flippers = [
      { pivot: { x: 90, y: HEIGHT - 40 }, length: 70, orientation: 0, angle: 0 },
      { pivot: { x: WIDTH - 90, y: HEIGHT - 40 }, length: 70, orientation: Math.PI, angle: 0 },
    ];

    const gravity = 0.2;
    const friction = 0.99;
    const restitution = 1;

    const step = () => {
      // physics
      ball.vy += gravity;
      ball.vx *= friction;
      ball.vy *= friction;
      ball.x += ball.vx;
      ball.y += ball.vy;

      // wall collisions (elastic)
      if (ball.x - ball.r < 0) {
        ball.x = ball.r;
        ball.vx = Math.abs(ball.vx) * restitution;
      }
      if (ball.x + ball.r > WIDTH) {
        ball.x = WIDTH - ball.r;
        ball.vx = -Math.abs(ball.vx) * restitution;
      }
      if (ball.y - ball.r < 0) {
        ball.y = ball.r;
        ball.vy = Math.abs(ball.vy) * restitution;
      }
      if (ball.y + ball.r > HEIGHT) {
        ball.y = HEIGHT - ball.r;
        ball.vy = -Math.abs(ball.vy) * restitution;
      }

      // flipper control and collision
      flippers.forEach((f, i) => {
        const pressed = i === 0 ? controlsRef.current.left : controlsRef.current.right;
        const target = pressed ? (i === 0 ? -0.7 : 0.7) : 0;
        f.angle += (target - f.angle) * 0.2;
        const theta = f.orientation + f.angle;
        f.end = {
          x: f.pivot.x + f.length * Math.cos(theta),
          y: f.pivot.y + f.length * Math.sin(theta),
        };

        const dist = distanceToSegment(
          ball.x,
          ball.y,
          f.pivot.x,
          f.pivot.y,
          f.end.x,
          f.end.y,
        );
        if (dist < ball.r && ball.y > f.pivot.y - 60) {
          const nx = f.end.y - f.pivot.y;
          const ny = -(f.end.x - f.pivot.x);
          const len = Math.hypot(nx, ny);
          const unx = nx / len;
          const uny = ny / len;
          const dot = ball.vx * unx + ball.vy * uny;
          ball.vx -= 2 * dot * unx;
          ball.vy -= 2 * dot * uny;
          ball.vx += unx * 4;
          ball.vy += uny * 4;
          ball.x += unx * (ball.r - dist);
          ball.y += uny * (ball.r - dist);
        }
      });

      // drawing
      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // flippers as line segments
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 4;
      flippers.forEach((f) => {
        ctx.beginPath();
        ctx.moveTo(f.pivot.x, f.pivot.y);
        ctx.lineTo(f.end.x, f.end.y);
        ctx.stroke();
      });

      // ball as circle
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fill();

      animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animRef.current);
  }, [canvasRef]);

  useEffect(() => {
    const down = (e) => {
      if (e.key === 'ArrowLeft') controlsRef.current.left = true;
      if (e.key === 'ArrowRight') controlsRef.current.right = true;
    };
    const up = (e) => {
      if (e.key === 'ArrowLeft') controlsRef.current.left = false;
      if (e.key === 'ArrowRight') controlsRef.current.right = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  return (
    <div className="relative h-full w-full flex items-center justify-center bg-ub-cool-grey">
      <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className="bg-black" />
    </div>
  );
};

export default Pinball;

