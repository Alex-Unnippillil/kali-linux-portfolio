import React, { useRef, useEffect, useState } from 'react';

// Tile based track: 1 = road, 0 = off road
const TILE_SIZE = 40;
const TRACK_MAP = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [0,1,0,0,0,0,0,0,0,0,0,0,0,1,0],
  [0,1,0,1,1,1,1,1,1,1,1,1,0,1,0],
  [0,1,0,1,0,0,0,0,0,0,0,1,0,1,0],
  [0,1,0,1,0,0,0,0,0,0,0,1,0,1,0],
  [0,1,0,1,1,1,1,1,1,1,1,1,0,1,0],
  [0,1,0,0,0,0,0,0,0,0,0,0,0,1,0],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];
const WIDTH = TRACK_MAP[0].length * TILE_SIZE;
const HEIGHT = TRACK_MAP.length * TILE_SIZE;

// Checkpoints used to validate laps
const CHECKPOINTS = [
  { axis: 'x', x: TILE_SIZE * 2, y1: TILE_SIZE * 1, y2: TILE_SIZE * 8 }, // start/finish
  { axis: 'y', y: TILE_SIZE * 2, x1: TILE_SIZE * 2, x2: TILE_SIZE * 13 },
  { axis: 'x', x: TILE_SIZE * 13, y1: TILE_SIZE * 1, y2: TILE_SIZE * 8 },
  { axis: 'y', y: TILE_SIZE * 7, x1: TILE_SIZE * 2, x2: TILE_SIZE * 13 },
];

// Racing line waypoints used by AI
const WAYPOINTS = [
  { x: TILE_SIZE * 8, y: TILE_SIZE * 2 },
  { x: TILE_SIZE * 13, y: TILE_SIZE * 5 },
  { x: TILE_SIZE * 8, y: TILE_SIZE * 7 },
  { x: TILE_SIZE * 2, y: TILE_SIZE * 5 },
];

const NUM_AI = 6;

const createCar = (x, y, color, isAI = false) => ({
  x,
  y,
  angle: 0,
  speed: 0,
  steer: 0,
  slip: 0,
  accel: 0,
  brake: 0,
  color,
  isAI,
  wp: 0, // waypoint index for AI
});

const getTile = (x, y) => {
  const tx = Math.floor(x / TILE_SIZE);
  const ty = Math.floor(y / TILE_SIZE);
  if (ty < 0 || ty >= TRACK_MAP.length || tx < 0 || tx >= TRACK_MAP[0].length) return 0;
  return TRACK_MAP[ty][tx];
};

const CarRacer = () => {
  const canvasRef = useRef(null);
  const wheelRef = useRef(null);
  const [laps, setLaps] = useState(0);
  const [lapTimes, setLapTimes] = useState([]);
  const [control, setControl] = useState('keys');

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let lastTime = performance.now();

    // Create player and AI cars
    const cars = [];
    const startX = TILE_SIZE * 3;
    const startY = TILE_SIZE * 5;
    cars.push(createCar(startX, startY, 'red'));
    for (let i = 0; i < NUM_AI; i++) {
      cars.push(createCar(startX - (i + 1) * 20, startY + (i % 2) * 20, `hsl(${i * 60},70%,50%)`, true));
    }

    const keys = {};
    const keyDown = (e) => (keys[e.key] = true);
    const keyUp = (e) => (keys[e.key] = false);
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);

    // Touch steering wheel
    let wheelAngle = 0;
    const handleWheel = (e) => {
      if (control !== 'wheel') return;
      const rect = wheelRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      wheelAngle = Math.atan2(y, x) / Math.PI; // -1..1
    };
    wheelRef.current && wheelRef.current.addEventListener('pointermove', handleWheel);

    // Tilt control
    let tilt = 0;
    const handleOrientation = (e) => {
      if (control !== 'tilt') return;
      tilt = (e.gamma || 0) / 45; // normalized left/right
    };
    window.addEventListener('deviceorientation', handleOrientation);

    // Lap handling
    let nextCheckpoint = 0;
    let lapStart = performance.now();
    let prevPos = { x: cars[0].x, y: cars[0].y };

    const updateCar = (car, dt) => {
      if (!car.isAI) {
        // Player input
        let steerInput = 0;
        let accelInput = 0;
        let brakeInput = 0;
        if (control === 'keys') {
          if (keys['ArrowLeft']) steerInput = -1;
          if (keys['ArrowRight']) steerInput = 1;
          if (keys['ArrowUp']) accelInput = 1;
          if (keys['ArrowDown']) brakeInput = 1;
        } else if (control === 'wheel') {
          steerInput = wheelAngle;
          if (keys[' ']) accelInput = 1; // space for throttle
        } else if (control === 'tilt') {
          steerInput = tilt;
          if (keys[' ']) accelInput = 1;
        }
        car.steer += (steerInput - car.steer) * dt * 5; // steering rate
        car.accel = accelInput * 100;
        car.brake = brakeInput * 200;
      } else {
        // AI logic
        const target = WAYPOINTS[car.wp];
        const dx = target.x - car.x;
        const dy = target.y - car.y;
        const targetAngle = Math.atan2(dy, dx);
        let diff = ((targetAngle - car.angle + Math.PI) % (Math.PI * 2)) - Math.PI;
        car.steer += (diff - car.steer) * dt * 2;
        if (Math.hypot(dx, dy) < TILE_SIZE) {
          car.wp = (car.wp + 1) % WAYPOINTS.length;
        }
        car.accel = 80;
        car.brake = 0;
      }

      // Car physics with slip angle
      const grip = getTile(car.x, car.y) === 1 ? 1 : 0.5; // off-road friction
      car.speed += (car.accel - car.brake - car.speed * 2) * dt * grip;
      const max = 200 * grip;
      if (car.speed > max) car.speed = max;
      if (car.speed < 0) car.speed = 0;
      car.slip += car.steer * dt * car.speed / 100;
      car.slip *= 0.9;
      const vx = Math.cos(car.angle + car.slip) * car.speed * dt;
      const vy = Math.sin(car.angle + car.slip) * car.speed * dt;
      const newX = car.x + vx;
      const newY = car.y + vy;
      if (getTile(newX, newY) === 1) {
        car.x = newX;
        car.y = newY;
      } else {
        car.speed = 0; // hit wall
      }
      car.angle += car.steer * dt * 2;
    };

    const checkCheckpoints = (car, prev) => {
      const cp = CHECKPOINTS[nextCheckpoint];
      if (cp.axis === 'x') {
        if (prev.x < cp.x && car.x >= cp.x && car.y > cp.y1 && car.y < cp.y2) {
          nextCheckpoint = (nextCheckpoint + 1) % CHECKPOINTS.length;
          if (nextCheckpoint === 0) {
            const now = performance.now();
            setLapTimes((t) => [...t, (now - lapStart) / 1000]);
            lapStart = now;
            setLaps((l) => l + 1);
          }
        }
      } else {
        if (prev.y < cp.y && car.y >= cp.y && car.x > cp.x1 && car.x < cp.x2) {
          nextCheckpoint = (nextCheckpoint + 1) % CHECKPOINTS.length;
          if (nextCheckpoint === 0) {
            const now = performance.now();
            setLapTimes((t) => [...t, (now - lapStart) / 1000]);
            lapStart = now;
            setLaps((l) => l + 1);
          }
        }
      }
    };

    const renderTrack = () => {
      for (let y = 0; y < TRACK_MAP.length; y++) {
        for (let x = 0; x < TRACK_MAP[0].length; x++) {
          ctx.fillStyle = TRACK_MAP[y][x] === 1 ? '#555' : '#137c13';
          ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
      }
      // Start line
      const cp0 = CHECKPOINTS[0];
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cp0.x, cp0.y1);
      ctx.lineTo(cp0.x, cp0.y2);
      ctx.stroke();
    };

    const renderCars = () => {
      cars.forEach((c) => {
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.angle);
        ctx.fillStyle = c.color;
        ctx.fillRect(-10, -5, 20, 10);
        ctx.restore();
      });
    };

    let animationId;
    const frame = (time) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;
      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      renderTrack();
      cars.forEach((car) => updateCar(car, dt));
      checkCheckpoints(cars[0], prevPos);
      prevPos = { x: cars[0].x, y: cars[0].y };
      renderCars();
      animationId = requestAnimationFrame(frame);
    };
    animationId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      window.removeEventListener('deviceorientation', handleOrientation);
      wheelRef.current && wheelRef.current.removeEventListener('pointermove', handleWheel);
    };
  }, [control]);

  const lastLap = lapTimes.length > 0 ? lapTimes[lapTimes.length - 1].toFixed(2) : null;

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white">
      <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className="bg-black" />
      <div className="mt-2 flex items-center gap-2">
        <label htmlFor="ctrl">Control:</label>
        <select
          id="ctrl"
          value={control}
          onChange={(e) => setControl(e.target.value)}
          className="text-black"
        >
          <option value="keys">Keyboard</option>
          <option value="wheel">Touch Wheel</option>
          <option value="tilt">Tilt</option>
        </select>
      </div>
      <div className="mt-1">Laps: {laps}</div>
      {lastLap && <div>Last Lap: {lastLap}s</div>}
      {control === 'wheel' && (
        <div
          ref={wheelRef}
          className="mt-2 w-24 h-24 rounded-full border-2 border-white"
        />
      )}
    </div>
  );
};

export default CarRacer;

