import React, { useRef, useEffect, useState } from 'react';
import useCanvasResize from '../../hooks/useCanvasResize';
import ReactGA from 'react-ga4';

// Track constants - circular course
const WIDTH = 800;
const HEIGHT = 800;
const TRACK_RADIUS = 250;
const TRACK_WIDTH = 120;
const CENTER_X = WIDTH / 2;
const CENTER_Y = HEIGHT / 2;
const INNER_RADIUS = TRACK_RADIUS - TRACK_WIDTH / 2;
const OUTER_RADIUS = TRACK_RADIUS + TRACK_WIDTH / 2;

const STEP = 1 / 60;

const DIFFICULTY_SETTINGS = {
  easy: { aiAccel: 70, obstacles: 5 },
  normal: { aiAccel: 80, obstacles: 10 },
  hard: { aiAccel: 100, obstacles: 15 },
};

// Checkpoints used to validate laps
export const CHECKPOINTS = [
  {
    axis: 'x',
    x: CENTER_X - TRACK_RADIUS,
    y1: CENTER_Y - TRACK_WIDTH / 2,
    y2: CENTER_Y + TRACK_WIDTH / 2,
  }, // start/finish
  {
    axis: 'y',
    y: CENTER_Y - TRACK_RADIUS,
    x1: CENTER_X - TRACK_WIDTH / 2,
    x2: CENTER_X + TRACK_WIDTH / 2,
  },
  {
    axis: 'x',
    x: CENTER_X + TRACK_RADIUS,
    y1: CENTER_Y - TRACK_WIDTH / 2,
    y2: CENTER_Y + TRACK_WIDTH / 2,
  },
  {
    axis: 'y',
    y: CENTER_Y + TRACK_RADIUS,
    x1: CENTER_X - TRACK_WIDTH / 2,
    x2: CENTER_X + TRACK_WIDTH / 2,
  },
];

// Racing line waypoints used by AI
const WAYPOINTS = [
  { x: CENTER_X, y: CENTER_Y - TRACK_RADIUS },
  { x: CENTER_X + TRACK_RADIUS, y: CENTER_Y },
  { x: CENTER_X, y: CENTER_Y + TRACK_RADIUS },
  { x: CENTER_X - TRACK_RADIUS, y: CENTER_Y },
];

const NUM_AI = 6;

const createCar = (x, y, color, isAI = false, angle = -Math.PI / 2) => ({
  x,
  y,
  angle,
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
  const dx = x - CENTER_X;
  const dy = y - CENTER_Y;
  const d = Math.hypot(dx, dy);
  return d >= INNER_RADIUS && d <= OUTER_RADIUS ? 1 : 0;
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
    } else if (cp.axis === 'y') {
      if (prev.y < cp.y && curr.y >= cp.y && curr.x > cp.x1 && curr.x < cp.x2) {
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
    }
  }
  return { nextCheckpoint, lapCompleted, lapStarted, lapLineCrossed };
};

const CarRacer = () => {
  const canvasRef = useCanvasResize(WIDTH, HEIGHT, 'Car Racer game canvas');
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
  const [lapTimes, setLapTimes] = useState([]);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const [reset, setReset] = useState(0);
  const [difficulty, setDifficulty] = useState('normal');

  useEffect(() => {
    if (control === 'tilt') {
      const requestPermission = async () => {
        if (
          typeof DeviceOrientationEvent !== 'undefined' &&
          typeof DeviceOrientationEvent.requestPermission === 'function'
        ) {
          try {
            await DeviceOrientationEvent.requestPermission();
          } catch (e) {
            /* ignore */
          }
        }
      };
      requestPermission();
    }
  }, [control]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let lastTime = performance.now();
    let accumulator = 0;

    const { aiAccel, obstacles: obstacleCount } = DIFFICULTY_SETTINGS[difficulty];

    // Generate roadside obstacles
    const obstacles = [];
    for (let i = 0; i < obstacleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() < 0.5 ? INNER_RADIUS - 20 : OUTER_RADIUS + 20;
      const x = CENTER_X + Math.cos(angle) * r;
      const y = CENTER_Y + Math.sin(angle) * r;
      obstacles.push({ x, y, radius: 10 });
    }

    let collisionTimer = 0;

    // Create player and AI cars lined up on start line
    const cars = [];
    const totalCars = NUM_AI + 1;
    const startX = CHECKPOINTS[0].x + 5;
    const baseY = CENTER_Y - ((totalCars - 1) * 20) / 2;
    cars.push(createCar(startX, baseY + Math.floor(totalCars / 2) * 20, 'red'));
    let aiIdx = 0;
    for (let i = 0; i < totalCars; i++) {
      if (i === Math.floor(totalCars / 2)) continue;
      cars.push(
        createCar(
          startX,
          baseY + i * 20,
          `hsl(${aiIdx * 60},70%,50%)`,
          true
        )
      );
      aiIdx++;
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
        const rect = wheel?.getBoundingClientRect();
        if (!rect) return;
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        wheelAngle = Math.atan2(y, x) / Math.PI; // -1..1
      };
      const wheel = wheelRef.current;
      wheel && wheel.addEventListener('pointermove', handleWheel);

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
          steerInput = tilt * sensitivityRef.current;
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
        if (Math.hypot(dx, dy) < 40) {
          car.wp = (car.wp + 1) % WAYPOINTS.length;
        }
        car.accel = aiAccel;
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
      let collided = false;
      for (const ob of obstacles) {
        if (Math.hypot(newX - ob.x, newY - ob.y) < ob.radius + 10) {
          collided = true;
          break;
        }
      }
      if (getTile(newX, newY) === 1 && !collided) {
        car.x = newX;
        car.y = newY;
      } else {
        car.speed = 0;
        collisionTimer = 0.5;
      }
    };

    const renderTrack = () => {
      ctx.fillStyle = '#137c13';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = '#555';
      ctx.beginPath();
      ctx.arc(CENTER_X, CENTER_Y, OUTER_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#137c13';
      ctx.beginPath();
      ctx.arc(CENTER_X, CENTER_Y, INNER_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#964B00';
      obstacles.forEach((o) => {
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.radius, 0, Math.PI * 2);
        ctx.fill();
      });
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
      if (pausedRef.current) {
        animationId = requestAnimationFrame(frame);
        return;
      }
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
          setLapTimes((lts) => [...lts, t]);
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
      if (collisionTimer > 0) {
        ctx.fillStyle = `rgba(255,0,0,${collisionTimer})`;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        collisionTimer -= dt;
      }
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
        wheel && wheel.removeEventListener('pointermove', handleWheel);
      };
      }, [canvasRef, control, difficulty, reset]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const handleSensitivity = (e) => {
    const val = parseFloat(e.target.value);
    setMobileSensitivity(val);
    sensitivityRef.current = val;
  };

  const topTimes = [...lapTimes].sort((a, b) => a - b).slice(0, 5);

  const handlePause = () => {
    setPaused((p) => !p);
  };

  const handleRestart = () => {
    setLaps(0);
    setLapTime(0);
    setLastLap(null);
    setBestLap(null);
    setLapTimes([]);
    setReset((r) => r + 1);
  };

  const handleDifficulty = (e) => {
    setDifficulty(e.target.value);
    handleRestart();
  };

  return (
    <div className="relative h-full w-full flex items-center justify-center bg-ub-cool-grey text-white">
      <canvas ref={canvasRef} className="bg-black w-full h-full" />
      <div className="absolute top-2 left-2 bg-black/60 p-2 rounded text-xs space-y-1" aria-live="polite">
        <div className="flex items-center gap-2">
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
        <div className="flex items-center gap-2">
          <label htmlFor="difficulty">Difficulty:</label>
          <select
            id="difficulty"
            value={difficulty}
            onChange={handleDifficulty}
            className="text-black"
          >
            <option value="easy">Easy</option>
            <option value="normal">Normal</option>
            <option value="hard">Hard</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handlePause} className="px-2 py-1 bg-gray-700">
            {paused ? 'Resume' : 'Pause'}
          </button>
          <button onClick={handleRestart} className="px-2 py-1 bg-gray-700">
            Restart
          </button>
        </div>
        <div>Laps: {laps}</div>
        <div>Speed: {Math.round(speed)}</div>
        <div>Lap Time: {lapTime.toFixed(2)}s</div>
        {lastLap !== null && <div>Last Lap: {lastLap.toFixed(2)}s</div>}
        {bestLap !== null && <div>Best Lap: {bestLap.toFixed(2)}s</div>}
        {topTimes.length > 0 && (
          <div>
            <div>Leaderboard:</div>
            <ol>
              {topTimes.map((t, i) => (
                <li key={i}>{t.toFixed(2)}s</li>
              ))}
            </ol>
          </div>
        )}
      </div>
      {control === 'wheel' && (
        <div
          ref={wheelRef}
          className="absolute bottom-24 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full border-2 border-white"
        />
      )}
      {control === 'buttons' && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-2">
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
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 px-3 py-1 rounded text-xs">
        Controls: ←/→ steer, ↑ accelerate, ↓ brake, Space throttle
      </div>
    </div>
  );
};

export default CarRacer;

