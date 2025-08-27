import React, { useEffect, useState, useRef } from 'react';
import useCanvasResize from '../../hooks/useCanvasResize';

const WIDTH = 300;
const HEIGHT = 500;
const LANES = 3;
const LANE_WIDTH = WIDTH / LANES;
const PLAYER_Y = HEIGHT - 40;
const OBSTACLE_HEIGHT = 20;

export const detectCollision = (
  playerLane,
  obstacles,
  playerY = PLAYER_Y,
  threshold = OBSTACLE_HEIGHT
) =>
  obstacles.some(
    (o) => o.lane === playerLane && Math.abs(o.y - playerY) < threshold
  );

// score increases based on distance travelled. A multiplier can be supplied
// to reward players for maintaining higher speeds or other bonuses.
// Defaults to 1 so existing behaviour remains unchanged when no multiplier
// is provided.
export const updateScore = (score, speed, dt, multiplier = 1) =>
  score + speed * dt * multiplier;

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
  const [multiplier, setMultiplier] = useState(1);
  const [running, setRunning] = useState(true);
  const [reset, setReset] = useState(0);
  const gammaRef = useRef(0);

  const handleCalibrate = () => setTiltOffset(gammaRef.current);
  const handleRestart = () => setReset((r) => r + 1);

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
    setSpeed(100);
    setRunning(true);

    let playerLane = 1;
    let obstacles = [];
    let s = 100;
    let sc = 0;
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
      s += dt * 10;
      obstacles.forEach((o) => (o.y += s * dt));
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
        alive = false;
        setRunning(false);
      }
      const mult = Math.floor(s / 200) + 1;
      sc = updateScore(sc, s, dt, mult);
      setScore(sc);
      setSpeed(s);
      setMultiplier(mult);
      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = 'cyan';
      const x = playerLane * LANE_WIDTH + 10;
      ctx.fillRect(x, PLAYER_Y - OBSTACLE_HEIGHT, LANE_WIDTH - 20, OBSTACLE_HEIGHT);
      ctx.fillStyle = 'red';
      obstacles.forEach((o) => {
        const ox = o.lane * LANE_WIDTH + 10;
        ctx.fillRect(ox, o.y, LANE_WIDTH - 20, OBSTACLE_HEIGHT);
      });
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
        <div>Mult: {multiplier}x</div>
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

