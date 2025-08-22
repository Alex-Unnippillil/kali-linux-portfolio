import React, { useRef, useEffect, useState } from 'react';
import ReactGA from 'react-ga4';

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

const STEP = 1 / 60;

// Checkpoints used to validate laps
export const CHECKPOINTS = [
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

export const advanceCheckpoints = (
  prev,
  curr,
  nextCheckpoint,
  lapLineCrossed,
  checkpoints = CHECKPOINTS
) => {
  const cp = checkpoints[nextCheckpoint];
  let lapCompleted = false;
  let lapStarted = false;
  if (cp) {
    if (cp.axis === 'x') {
      if (prev.x < cp.x && curr.x >= cp.x && curr.y > cp.y1 && curr.y < cp.y2) {
        if (nextCheckpoint === 0) {
          if (lapLineCrossed) lapCompleted = true;
          lapStarted = true;
          lapLineCrossed = true;
          nextCheckpoint = 1;
        } else {
          nextCheckpoint = (nextCheckpoint + 1) % checkpoints.length;
          if (nextCheckpoint === 1) lapLineCrossed = false;
        }
      }
    } else {
      if (prev.y < cp.y && curr.y >= cp.y && curr.x > cp.x1 && curr.x < cp.x2) {
        nextCheckpoint = (nextCheckpoint + 1) % checkpoints.length;
        if (nextCheckpoint === 1) lapLineCrossed = false;
      }
    }
  }
  return { nextCheckpoint, lapCompleted, lapStarted, lapLineCrossed };
};

const CarRacer = () => {
  const canvasRef = useRef(null);
  const wheelRef = useRef(null);
  const steerButtonRef = useRef(0);
  const sensitivityRef = useRef(1);
  const [laps, setLaps] = useState(0);
  const [control, setControl] = useState('keys');
  const [speed, setSpeed] = useState(0);
  const [lapTime, setLapTime] = useState(0);
  const [lastLap, setLastLap] = useState(null);
  const [bestLap, setBestLap] = useState(null);
  const [mobileSensitivity, setMobileSensitivity] = useState(1);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let lastTime = performance.now();
    let accumulator = 0;

    // Create player and AI cars
    const cars = [];
    const startX = TILE_SIZE * 3;
    const startY = TILE_SIZE * 5;
    cars.push(createCar(startX, startY, 'red'));
    for (let i = 0; i < NUM_AI; i++) {
      cars.push(
        createCar(
          startX - (i + 1) * 20,
          startY + (i % 2) * 20,
          `hsl(${i * 60},70%,50%)`,
          true
        )
      );
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

    // Lap handling and ghost
    let nextCheckpoint = 0;
    let lapLineCrossed = false;
    let lapStart = performance.now();
    let prevPos = { x: cars[0].x, y: cars[0].y };
    let currentLapTrace = [];
    let bestLapTrace = null;
    let bestLapTime = null;
    let ghostIndex = 0;

    const updateCar = (car, dt) => {
      if (!car.isAI) {
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
        } else if (control === 'buttons') {
          steerInput = steerButtonRef.current * sensitivityRef.current;
          if (keys[' ']) accelInput = 1;
        }
        car.steer += (steerInput - car.steer) * dt * 5;
        car.accel = accelInput * 100;
        car.brake = brakeInput * 200;
      } else {
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

      const surface = getTile(car.x, car.y) === 1 ? 1 : 0.4;
      const drag = 2 - surface;
      car.speed += (car.accel - car.brake - car.speed * drag) * dt;
      if (car.speed < 0) car.speed = 0;
      const turnRate = 2 / (1 + car.speed / 200);
      car.angle += car.steer * dt * turnRate;
      car.slip += (car.steer * car.speed * 0.002 - car.slip * surface) * dt;
      if (car.slip > 0.3) car.slip = 0.3;
      if (car.slip < -0.3) car.slip = -0.3;
      const drift = car.angle + car.slip;
      const vx = Math.cos(drift) * car.speed * dt;
      const vy = Math.sin(drift) * car.speed * dt;
      const newX = car.x + vx;
      const newY = car.y + vy;
      if (getTile(newX, newY) === 1) {
        car.x = newX;
        car.y = newY;
      } else {
        car.speed = 0;
      }
    };

    const renderTrack = () => {
      for (let y = 0; y < TRACK_MAP.length; y++) {
        for (let x = 0; x < TRACK_MAP[0].length; x++) {
          ctx.fillStyle = TRACK_MAP[y][x] === 1 ? '#555' : '#137c13';
          ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
      }
      const cp0 = CHECKPOINTS[0];
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cp0.x, cp0.y1);
      ctx.lineTo(cp0.x, cp0.y2);
      ctx.stroke();
    };

    const renderCars = () => {
      if (bestLapTrace && bestLapTrace.length > 0) {
        const g = bestLapTrace[ghostIndex];
        if (g) {
          ctx.save();
          ctx.globalAlpha = 0.5;
          ctx.translate(g.x, g.y);
          ctx.rotate(g.angle);
          ctx.fillStyle = '#fff';
          ctx.fillRect(-10, -5, 20, 10);
          ctx.restore();
          ctx.globalAlpha = 1;
        }
      }
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
      accumulator += dt;
      while (accumulator >= STEP) {
        cars.forEach((car) => updateCar(car, STEP));
        currentLapTrace.push({ x: cars[0].x, y: cars[0].y, angle: cars[0].angle });
        const res = advanceCheckpoints(prevPos, { x: cars[0].x, y: cars[0].y }, nextCheckpoint, lapLineCrossed);
        nextCheckpoint = res.nextCheckpoint;
        lapLineCrossed = res.lapLineCrossed;
        if (res.lapCompleted) {
          const now = performance.now();
          const t = (now - lapStart) / 1000;
          setLaps((l) => l + 1);
          setLastLap(t);
          ReactGA.event('lap_complete', { time: t });
          if (bestLapTime === null || t < bestLapTime) {
            bestLapTime = t;
            setBestLap(t);
            bestLapTrace = currentLapTrace.slice();
            ReactGA.event('best_lap', { time: t });
          }
        }
        if (res.lapStarted) {
          lapStart = performance.now();
          setLapTime(0);
          currentLapTrace = [];
          ghostIndex = 0;
          ReactGA.event('lap_start');
        }
        prevPos = { x: cars[0].x, y: cars[0].y };
        if (bestLapTrace) ghostIndex = (ghostIndex + 1) % bestLapTrace.length;
        accumulator -= STEP;
      }

      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      renderTrack();
      renderCars();
      setSpeed(cars[0].speed);
      setLapTime((performance.now() - lapStart) / 1000);
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

  const handleSensitivity = (e) => {
    const val = parseFloat(e.target.value);
    setMobileSensitivity(val);
    sensitivityRef.current = val;
  };

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
          <option value="buttons">Buttons</option>
        </select>
      </div>
      <div className="mt-1">Laps: {laps}</div>
      <div>Speed: {Math.round(speed)}</div>
      <div>Lap Time: {lapTime.toFixed(2)}s</div>
      {lastLap !== null && <div>Last Lap: {lastLap.toFixed(2)}s</div>}
      {bestLap !== null && <div>Best Lap: {bestLap.toFixed(2)}s</div>}
      {control === 'wheel' && (
        <div
          ref={wheelRef}
          className="mt-2 w-24 h-24 rounded-full border-2 border-white"
        />
      )}
      {control === 'buttons' && (
        <div className="mt-2 flex items-center gap-2">
          <button
            onPointerDown={() => (steerButtonRef.current = -1)}
            onPointerUp={() => (steerButtonRef.current = 0)}
            onPointerLeave={() => (steerButtonRef.current = 0)}
            className="px-2 py-1 bg-gray-700"
          >
            Left
          </button>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={mobileSensitivity}
            onChange={handleSensitivity}
          />
          <button
            onPointerDown={() => (steerButtonRef.current = 1)}
            onPointerUp={() => (steerButtonRef.current = 0)}
            onPointerLeave={() => (steerButtonRef.current = 0)}
            className="px-2 py-1 bg-gray-700"
          >
            Right
          </button>
        </div>
      )}
    </div>
  );
};

export default CarRacer;

