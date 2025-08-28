import React, { useEffect, useState, useRef } from 'react';
import useCanvasResize from '../../hooks/useCanvasResize';

const WIDTH = 300;
const HEIGHT = 500;
const LANES = 3;
const LANE_WIDTH = WIDTH / LANES;
const PLAYER_Y = HEIGHT - 40;
const OBSTACLE_HEIGHT = 20;
const BASE_SPEEDS = [100, 120, 140];

export const detectCollision = (
  playerLane,
  obstacles,
  playerY = PLAYER_Y,
  threshold = OBSTACLE_HEIGHT
) =>
  obstacles.some(
    (o) => o.lane === playerLane && Math.abs(o.y - playerY) < threshold * 0.8
  );

export const updateScore = (score, speed, dt) => score + speed * dt;

export const canUseTilt = async () => {
  if (typeof window === 'undefined') return false;
  const D = window.DeviceOrientationEvent;
  if (!D) return false;
  if (typeof D.requestPermission === 'function') {
    try {
      const res = await D.requestPermission();
      return res === 'granted';
    } catch {
      return false;
    }
  }
  return true;
};

const LaneRunner = () => {
  const canvasRef = useCanvasResize(WIDTH, HEIGHT);
  const [control, setControl] = useState('keys');
  const [tiltAllowed, setTiltAllowed] = useState(false);
  const [tiltOffset, setTiltOffset] = useState(0);
  const [sensitivity, setSensitivity] = useState(1);
  const [score, setScore] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [running, setRunning] = useState(true);
  const [reset, setReset] = useState(0);
  const [lives, setLives] = useState(3);
  const gammaRef = useRef(0);

  const handleCalibrate = () => setTiltOffset(gammaRef.current);
  const handleRestart = () => {
    setLives(3);
    setReset((r) => r + 1);
  };

  useEffect(() => {
    if (control !== 'tilt') return;
    let active = true;
    canUseTilt().then((allowed) => {
      if (!active) return;
      setTiltAllowed(allowed);
      if (!allowed) setControl('keys');
    });
    return () => {
      active = false;
    };
  }, [control]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setScore(0);
    setSpeed(BASE_SPEEDS[1]);
    setRunning(true);
    setLives(3);

    let playerLane = 1;
    let obstacles = [];
    let speeds = [...BASE_SPEEDS];
    let sc = 0;
    let l = 3;
    let last = performance.now();
    let spawn = 0;
    let alive = true;
    let tilt = 0;
    let prevTilt = 0;
    let animId;

    const onKey = (e) => {
      if (e.key === 'ArrowLeft') playerLane = Math.max(0, playerLane - 1);
      if (e.key === 'ArrowRight') playerLane = Math.min(LANES - 1, playerLane + 1);
    };

    const onOrientation = (e) => {
      gammaRef.current = e.gamma || 0;
      tilt = (gammaRef.current - tiltOffset) * sensitivity;
    };

    if (control === 'keys') window.addEventListener('keydown', onKey);
    if (control === 'tilt' && tiltAllowed)
      window.addEventListener('deviceorientation', onOrientation);

    const loop = (time) => {
      const dt = (time - last) / 1000;
      last = time;
      spawn += dt;
      speeds = speeds.map((sp) => sp + dt * 10);
      obstacles.forEach((o) => {
        o.y += speeds[o.lane] * dt;
      });
      obstacles = obstacles.filter((o) => o.y < HEIGHT + OBSTACLE_HEIGHT);
      if (spawn > 1) {
        obstacles.push({ lane: Math.floor(Math.random() * LANES), y: -OBSTACLE_HEIGHT });
        spawn = 0;
      }
      if (control === 'tilt' && tiltAllowed) {
        if (tilt > 15 && prevTilt <= 15 && playerLane < LANES - 1) playerLane += 1;
        if (tilt < -15 && prevTilt >= -15 && playerLane > 0) playerLane -= 1;
        prevTilt = tilt;
      }
      if (detectCollision(playerLane, obstacles)) {
        l -= 1;
        setLives(l);
        if (l > 0) {
          obstacles = [];
          playerLane = 1;
        } else {
          alive = false;
          setRunning(false);
        }
      }
      sc = updateScore(sc, speeds[playerLane], dt);
      setScore(sc);
      setSpeed(speeds[playerLane]);
      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = 'cyan';
      const x = playerLane * LANE_WIDTH + 10;
      ctx.fillRect(x, PLAYER_Y - OBSTACLE_HEIGHT, LANE_WIDTH - 20, OBSTACLE_HEIGHT);
      ctx.fillStyle = 'red';
      obstacles.forEach((o) => {
        const ox = o.lane * LANE_WIDTH + 10;
        ctx.fillRect(ox, o.y, LANE_WIDTH - 20, OBSTACLE_HEIGHT);
      });

      // lane speed indicators
      ctx.fillStyle = 'white';
      ctx.font = '12px sans-serif';
      for (let i = 0; i < LANES; i += 1) {
        const tx = i * LANE_WIDTH + LANE_WIDTH / 2 - 10;
        ctx.fillText(Math.round(speeds[i]).toString(), tx, 12);
      }
      if (alive) animId = requestAnimationFrame(loop);
      else {
        ctx.fillStyle = 'white';
        ctx.font = '20px sans-serif';
        ctx.fillText('Game Over', WIDTH / 2 - 50, HEIGHT / 2);
      }
    };

    animId = requestAnimationFrame(loop);

    return () => {
      if (animId) cancelAnimationFrame(animId);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('deviceorientation', onOrientation);
    };
  }, [canvasRef, control, tiltAllowed, tiltOffset, sensitivity, reset]);

  return (
    <div className="relative h-full w-full flex items-center justify-center bg-ub-cool-grey text-white">
      <canvas ref={canvasRef} className="bg-black w-full h-full" />
      <div className="absolute top-2 left-2 bg-black/60 p-2 rounded text-xs space-y-1">
        <div>Score: {Math.floor(score)}</div>
        <div>Speed: {Math.round(speed)}</div>
        <div className="flex items-center gap-1">
          <span>Lives:</span>
          {Array.from({ length: lives }).map((_, i) => (
            <span key={i} role="img" aria-label="life">
              ❤️
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <label htmlFor="ctrl">Control:</label>
          <select
            id="ctrl"
            value={control}
            onChange={(e) => setControl(e.target.value)}
            className="text-black"
          >
            <option value="keys">Keyboard</option>
            <option value="tilt">Tilt</option>
          </select>
        </div>
        {control === 'tilt' && tiltAllowed && (
          <>
            <button onClick={handleCalibrate} className="px-2 py-1 bg-gray-700">
              Calibrate
            </button>
            <div className="flex items-center gap-1">
              <label>Sens:</label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={sensitivity}
                onChange={(e) => setSensitivity(parseFloat(e.target.value))}
              />
            </div>
          </>
        )}
        {control === 'tilt' && !tiltAllowed && <div>Tilt not permitted</div>}
      </div>
      {!running && (
        <button
          onClick={handleRestart}
          className="absolute bottom-4 left-2 bg-gray-700 px-2 py-1"
        >
          Restart
        </button>
      )}
    </div>
  );
};

export default LaneRunner;

