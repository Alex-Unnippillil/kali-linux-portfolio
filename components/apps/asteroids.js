import React, { useRef, useEffect } from 'react';

// Simple Asteroids clone using canvas
const Asteroids = () => {
  const canvasRef = useRef(null);
  const requestRef = useRef(null);
  const keys = useRef({});
  const ship = useRef({ x: 0, y: 0, angle: 0, speed: 0 });
  const asteroids = useRef([]);
  const spawnTimer = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const reset = () => {
      ship.current = {
        x: canvas.width / 2,
        y: canvas.height / 2,
        angle: 0,
        speed: 0,
      };
      asteroids.current = [];
    };

    const spawnAsteroid = () => {
      const angle = Math.random() * Math.PI * 2;
      const r = 15 + Math.random() * 15;
      asteroids.current.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        dx: Math.cos(angle) * (0.5 + Math.random()),
        dy: Math.sin(angle) * (0.5 + Math.random()),
        r,
      });
    };

    reset();

    const handleKeyDown = (e) => {
      keys.current[e.code] = true;
    };
    const handleKeyUp = (e) => {
      keys.current[e.code] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const update = () => {
      const { width, height } = canvas;
      const s = ship.current;

      if (keys.current['ArrowLeft']) s.angle -= 0.05;
      if (keys.current['ArrowRight']) s.angle += 0.05;
      if (keys.current['ArrowUp']) s.speed += 0.1;
      s.speed *= 0.99;
      s.x += s.speed * Math.cos(s.angle);
      s.y += s.speed * Math.sin(s.angle);
      if (s.x < 0) s.x = width;
      if (s.x > width) s.x = 0;
      if (s.y < 0) s.y = height;
      if (s.y > height) s.y = 0;

      spawnTimer.current += 1;
      if (spawnTimer.current > 120) {
        spawnAsteroid();
        spawnTimer.current = 0;
      }

      asteroids.current.forEach((a) => {
        a.x += a.dx;
        a.y += a.dy;
        if (a.x < -a.r) a.x = width + a.r;
        if (a.x > width + a.r) a.x = -a.r;
        if (a.y < -a.r) a.y = height + a.r;
        if (a.y > height + a.r) a.y = -a.r;
      });

      for (const a of asteroids.current) {
        const dist = Math.hypot(a.x - s.x, a.y - s.y);
        if (dist < a.r + 10) {
          reset();
          break;
        }
      }

      ctx.clearRect(0, 0, width, height);

      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.angle);
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(-10, 7);
      ctx.lineTo(-10, -7);
      ctx.closePath();
      ctx.strokeStyle = 'white';
      ctx.stroke();
      ctx.restore();

      ctx.strokeStyle = 'white';
      asteroids.current.forEach((a) => {
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
        ctx.stroke();
      });

      requestRef.current = requestAnimationFrame(update);
    };

    requestRef.current = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(requestRef.current);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return <canvas ref={canvasRef} className="bg-black w-full h-full" />;
};

export default Asteroids;

