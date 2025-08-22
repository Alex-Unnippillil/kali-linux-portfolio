import React, { useRef, useEffect, useState } from 'react';

const CarRacer = () => {
  const canvasRef = useRef(null);
  const [laps, setLaps] = useState(0);
  const [lapTimes, setLapTimes] = useState([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const track = {
      outer: { x: 50, y: 50, w: 500, h: 300 },
      inner: { x: 150, y: 100, w: 300, h: 200 },
      start: { x: 300, y1: 100, y2: 300 },
    };

    const car = { x: track.start.x - 40, y: (track.start.y1 + track.start.y2) / 2, angle: 0, speed: 0 };
    const keys = {};
    let lastTime = performance.now();
    let lastX = car.x;
    let lapStart = performance.now();
    let animationFrame;

    const keyDown = (e) => {
      keys[e.key] = true;
    };
    const keyUp = (e) => {
      keys[e.key] = false;
    };

    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);

    const update = (time) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      if (keys['ArrowUp']) car.speed += 60 * dt;
      if (keys['ArrowDown']) car.speed -= 60 * dt;
      car.speed *= 0.98;
      if (keys['ArrowLeft']) car.angle -= 2 * dt;
      if (keys['ArrowRight']) car.angle += 2 * dt;

      car.x += Math.cos(car.angle) * car.speed * dt;
      car.y += Math.sin(car.angle) * car.speed * dt;

      const maxX = track.outer.x + track.outer.w - 10;
      const minX = track.outer.x + 10;
      const maxY = track.outer.y + track.outer.h - 10;
      const minY = track.outer.y + 10;
      if (car.x > maxX) car.x = maxX;
      if (car.x < minX) car.x = minX;
      if (car.y > maxY) car.y = maxY;
      if (car.y < minY) car.y = minY;

      if (
        lastX < track.start.x &&
        car.x >= track.start.x &&
        car.y > track.start.y1 &&
        car.y < track.start.y2
      ) {
        const now = performance.now();
        setLapTimes((lt) => [...lt, (now - lapStart) / 1000]);
        lapStart = now;
        setLaps((l) => l + 1);
      }
      lastX = car.x;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#137c13';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#555';
      ctx.fillRect(track.outer.x, track.outer.y, track.outer.w, track.outer.h);
      ctx.fillStyle = '#137c13';
      ctx.fillRect(track.inner.x, track.inner.y, track.inner.w, track.inner.h);

      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(track.start.x, track.start.y1);
      ctx.lineTo(track.start.x, track.start.y2);
      ctx.stroke();

      ctx.save();
      ctx.translate(car.x, car.y);
      ctx.rotate(car.angle);
      ctx.fillStyle = 'red';
      ctx.fillRect(-10, -5, 20, 10);
      ctx.restore();

      animationFrame = requestAnimationFrame(update);
    };

    animationFrame = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
    };
  }, []);

  const lastLap = lapTimes.length > 0 ? lapTimes[lapTimes.length - 1].toFixed(2) : null;

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white">
      <canvas ref={canvasRef} width={600} height={400} className="bg-black" />
      <div className="mt-2">Laps: {laps}</div>
      {lastLap && <div>Last Lap: {lastLap}s</div>}
    </div>
  );
};

export default CarRacer;

