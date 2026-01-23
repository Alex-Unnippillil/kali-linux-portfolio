import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useCanvasResize from '../../hooks/useCanvasResize';
import usePersistentState from '../../hooks/usePersistentState';
import useGameHaptics from '../../hooks/useGameHaptics';
import { exportGameSettings, importGameSettings } from '../../utils/gameSettings';
import GameLayout from './GameLayout';
import useGameLoop from './Games/common/useGameLoop';
import useInputMapping from './Games/common/input-remap/useInputMapping';

const WIDTH = 300;
const HEIGHT = 500;
const LANES = 3;
const LANE_WIDTH = WIDTH / LANES;

// World sizes (base canvas coordinates)
const PLAYER_HEIGHT = 22;
const PLAYER_Y_BOTTOM = HEIGHT - 40;
const PLAYER_Y_TOP = PLAYER_Y_BOTTOM - PLAYER_HEIGHT;
const OBSTACLE_HEIGHT = 22;
const PICKUP_SIZE = 16;
const MAX_LIVES = 5;

const BASE_SPEEDS = [100, 120, 140];
const ACCEL_BASE = 10;
const MAX_DT = 0.05;
const HIT_INVULN_SECONDS = 1.1;
const PICKUP_INTERVAL = 12;
const POST_HIT_SPAWN_DELAY = 0.6;

const DIFFICULTY_PRESETS = {
  easy: { speedMul: 0.9, accelMul: 0.85, spawnMul: 0.9 },
  normal: { speedMul: 1, accelMul: 1, spawnMul: 1 },
  hard: { speedMul: 1.15, accelMul: 1.15, spawnMul: 1.15 },
};

export const CURVE_PRESETS = {
  linear: (t) => t,
  'ease-in': (t) => t * t,
  'ease-out': (t) => Math.sqrt(t),
  'ease-in-out': (t) =>
    t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
};

// Collision helper for tests and gameplay.
// Assumes:
// - player is in a lane, with its bottom at playerY and height threshold
// - obstacles are in lanes with a fixed height threshold, positioned by their top y
export const detectCollision = (
  playerLane,
  obstacles,
  playerY = PLAYER_Y_BOTTOM,
  threshold = OBSTACLE_HEIGHT
) => {
  const playerTop = playerY - threshold;
  const playerBottom = playerY;
  return obstacles.some((o) => {
    if (o.lane !== playerLane) return false;
    const oTop = o.y;
    const oBottom = o.y + threshold;
    return oTop <= playerBottom && oBottom >= playerTop;
  });
};

export const updateScore = (score, speed, dt) => score + speed * dt;

// Requests tilt permission when required (iOS). Call from a user gesture.
export const canUseTilt = async () => {
  if (typeof window === 'undefined') return false;
  const D = window.DeviceOrientationEvent || globalThis.DeviceOrientationEvent;
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

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const LaneRunner = () => {
  const canvasRef = useCanvasResize(WIDTH, HEIGHT);
  const { danger, gameOver: hGameOver } = useGameHaptics();
  const fileRef = useRef(null);
  const gammaRef = useRef(0);

  // Settings (exported)
  const [control, setControl] = usePersistentState('lane-runner:control', 'keys');
  const [curve, setCurve] = usePersistentState('lane-runner:curve', 'linear');
  const [difficulty, setDifficulty] = usePersistentState(
    'lane-runner:difficulty',
    'normal'
  );
  const [sensitivity, setSensitivity] = usePersistentState(
    'lane-runner:sensitivity',
    1
  );

  // Score is intentionally not exported with settings.
  const [highScore, setHighScore] = usePersistentState('lane_runner_high', 0);

  const difficultyCfg =
    DIFFICULTY_PRESETS[difficulty] || DIFFICULTY_PRESETS.normal;

  // Runtime state
  const [paused, setPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [tiltAllowed, setTiltAllowed] = useState(false);
  const [tiltOffset, setTiltOffset] = useState(0);

  // HUD state (throttled updates)
  const [hud, setHud] = useState({ score: 0, speed: BASE_SPEEDS[1], lives: 3 });
  const lastHudUpdateRef = useRef(0);

  // Input mapping
  const [mapping] = useInputMapping('lane-runner', {
    left: 'ArrowLeft',
    right: 'ArrowRight',
    pause: ' ',
    restart: 'r',
  });

  // Game refs (avoid rerender per frame)
  const ctxRef = useRef(null);
  const laneRef = useRef(1);
  const obstaclesRef = useRef([]);
  const pickupsRef = useRef([]);
  const speedsRef = useRef([...BASE_SPEEDS]);
  const elapsedRef = useRef(0);
  const spawnRef = useRef(0);
  const spawnCooldownRef = useRef(0);
  const lastSpawnLaneRef = useRef(null);
  const lastSpawnAtRef = useRef(0);
  const pickupTimerRef = useRef(0);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const invulnRef = useRef(0);
  const hitFlashRef = useRef(0);
  const roadOffsetRef = useRef(0);
  const tiltValueRef = useRef(0);
  const prevTiltRef = useRef(0);
  const swipeStartRef = useRef(null);

  const resetGame = useCallback(() => {
    laneRef.current = 1;
    obstaclesRef.current = [];
    pickupsRef.current = [];
    speedsRef.current = BASE_SPEEDS.map((s) => s * difficultyCfg.speedMul);
    elapsedRef.current = 0;
    spawnRef.current = 0;
    spawnCooldownRef.current = 0;
    lastSpawnLaneRef.current = null;
    lastSpawnAtRef.current = 0;
    pickupTimerRef.current = 0;
    scoreRef.current = 0;
    livesRef.current = 3;
    invulnRef.current = 0;
    hitFlashRef.current = 0;
    roadOffsetRef.current = 0;
    setHud({ score: 0, speed: speedsRef.current[1], lives: 3 });
    setGameOver(false);
    setPaused(false);
  }, [difficultyCfg.speedMul]);

  // Initialize or re-init when difficulty changes.
  useEffect(() => {
    resetGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty]);

  // Acquire canvas context once.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    canvas.style.imageRendering = 'pixelated';
    ctxRef.current = ctx;
  }, [canvasRef]);

  // Tilt support is NOT requested automatically (iOS requires a gesture).
  const tiltSupport = useMemo(() => {
    if (typeof window === 'undefined') {
      return { supported: false, needsPermission: false };
    }
    const D = window.DeviceOrientationEvent || globalThis.DeviceOrientationEvent;
    if (!D) return { supported: false, needsPermission: false };
    return { supported: true, needsPermission: typeof D.requestPermission === 'function' };
  }, []);

  // On browsers that do not require permission, enable tilt immediately when selected.
  useEffect(() => {
    if (control !== 'tilt') {
      setTiltAllowed(false);
      return;
    }
    if (tiltSupport.supported && !tiltSupport.needsPermission) {
      setTiltAllowed(true);
    }
  }, [control, tiltSupport.supported, tiltSupport.needsPermission]);

  const requestTilt = useCallback(async () => {
    const allowed = await canUseTilt();
    setTiltAllowed(allowed);
    if (!allowed) setControl('keys');
  }, [setControl]);

  const calibrateTilt = useCallback(() => {
    setTiltOffset(gammaRef.current);
    prevTiltRef.current = 0;
  }, []);

  // Keyboard controls
  useEffect(() => {
    if (control !== 'keys') return;
    const onKeyDown = (e) => {
      if (paused || gameOver) return;
      const key = e.key;
      if (key === mapping.left) laneRef.current = Math.max(0, laneRef.current - 1);
      if (key === mapping.right)
        laneRef.current = Math.min(LANES - 1, laneRef.current + 1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [control, mapping.left, mapping.right, paused, gameOver]);

  // Touch/swipe controls (works for mouse too).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (control !== 'touch' && control !== 'keys') return;

    const onPointerDown = (e) => {
      if (paused || gameOver) return;
      e.preventDefault();
      if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
      swipeStartRef.current = { x: e.clientX, y: e.clientY, t: performance.now() };
    };

    const onPointerUp = (e) => {
      if (paused || gameOver) return;
      e.preventDefault();
      const start = swipeStartRef.current;
      swipeStartRef.current = null;
      if (!start) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      const adx = Math.abs(dx);
      const ady = Math.abs(dy);
      if (adx < 24 || adx < ady) return;
      if (dx < 0) laneRef.current = Math.max(0, laneRef.current - 1);
      if (dx > 0) laneRef.current = Math.min(LANES - 1, laneRef.current + 1);
    };

    canvas.style.touchAction = 'none';
    canvas.style.userSelect = 'none';
    canvas.addEventListener('pointerdown', onPointerDown, { passive: false });
    canvas.addEventListener('pointerup', onPointerUp, { passive: false });
    canvas.addEventListener('pointercancel', onPointerUp, { passive: false });
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
    };
  }, [canvasRef, control, paused, gameOver]);

  // Device orientation controls
  useEffect(() => {
    if (control !== 'tilt' || !tiltAllowed) return;
    const onOrientation = (e) => {
      const g = typeof e.gamma === 'number' ? e.gamma : 0;
      gammaRef.current = g;
      tiltValueRef.current = (g - tiltOffset) * sensitivity;
    };
    window.addEventListener('deviceorientation', onOrientation);
    return () => window.removeEventListener('deviceorientation', onOrientation);
  }, [control, tiltAllowed, tiltOffset, sensitivity]);

  const draw = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    const lane = laneRef.current;
    const obstacles = obstaclesRef.current;
    const speeds = speedsRef.current;
    const invuln = invulnRef.current;
    const hitFlash = hitFlashRef.current;
    const roadOffset = roadOffsetRef.current;

    // Background
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = '#070a10';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Road
    ctx.fillStyle = '#0b0f18';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, WIDTH - 1, HEIGHT - 1);

    // Lane dividers (dashed)
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.setLineDash([10, 10]);
    ctx.lineDashOffset = -(roadOffset % 20);
    for (let i = 1; i < LANES; i += 1) {
      ctx.beginPath();
      ctx.moveTo(i * LANE_WIDTH, 0);
      ctx.lineTo(i * LANE_WIDTH, HEIGHT);
      ctx.stroke();
    }
    ctx.restore();

    // Obstacles
    for (const o of obstacles) {
      const x = o.lane * LANE_WIDTH + 10;
      const w = LANE_WIDTH - 20;
      ctx.save();
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = 'rgba(239,68,68,0.6)';
      ctx.shadowBlur = 8;
      ctx.fillRect(x, o.y, w, OBSTACLE_HEIGHT);
      ctx.restore();
    }

    // Pickups
    for (const p of pickupsRef.current) {
      const x = p.lane * LANE_WIDTH + 14;
      const w = LANE_WIDTH - 28;
      ctx.save();
      ctx.fillStyle = '#22c55e';
      ctx.shadowColor = 'rgba(34,197,94,0.6)';
      ctx.shadowBlur = 8;
      ctx.fillRect(x, p.y, w, PICKUP_SIZE);
      ctx.restore();
    }

    // Player
    const px = lane * LANE_WIDTH + 10;
    const pw = LANE_WIDTH - 20;
    const shouldBlink = invuln > 0 && Math.floor(invuln * 12) % 2 === 0;
    if (!shouldBlink) {
      ctx.save();
      ctx.fillStyle = '#22d3ee';
      ctx.shadowColor = 'rgba(34,211,238,0.65)';
      ctx.shadowBlur = 10;
      ctx.fillRect(px, PLAYER_Y_TOP, pw, PLAYER_HEIGHT);
      ctx.restore();
    }

    // Hit flash
    if (hitFlash > 0) {
      ctx.save();
      ctx.globalAlpha = clamp(hitFlash, 0, 1);
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.restore();
    }

    // Tiny lane speed readout
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font =
      '11px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
    for (let i = 0; i < LANES; i += 1) {
      const tx = i * LANE_WIDTH + 6;
      ctx.fillText(`${Math.round(speeds[i])}`, tx, 14);
    }

    // Game over text
    if (gameOver) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = '#fff';
      ctx.font = '20px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial';
      ctx.fillText('Game Over', WIDTH / 2 - 55, HEIGHT / 2 - 10);
      ctx.font = '12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial';
      ctx.fillText('Press R to restart', WIDTH / 2 - 55, HEIGHT / 2 + 14);
      ctx.restore();
    }
  }, [gameOver]);

  const getAvailableLanes = useCallback((obstacles, minDistance) => {
    const lanes = [];
    for (let i = 0; i < LANES; i += 1) {
      const blocked = obstacles.some(
        (o) => o.lane === i && o.y < minDistance
      );
      if (!blocked) lanes.push(i);
    }
    return lanes;
  }, []);

  const pickSpawnLane = useCallback(
    (obstacles, minDistance) => {
      const candidates = getAvailableLanes(obstacles, minDistance);
      const pool = candidates.length ? candidates : [0, 1, 2];
      const lastLane = lastSpawnLaneRef.current;
      const timeSinceLast = elapsedRef.current - lastSpawnAtRef.current;
      const filtered =
        pool.length > 1 && lastLane !== null && timeSinceLast < 1.4
          ? pool.filter((lane) => lane !== lastLane)
          : pool;
      return filtered[Math.floor(Math.random() * filtered.length)];
    },
    [getAvailableLanes]
  );

  // Core game loop
  useGameLoop(
    (dtRaw) => {
      if (gameOver) return;
      const dt = clamp(dtRaw, 0, MAX_DT);

      elapsedRef.current += dt;
      spawnRef.current += dt;

      // Curve influences how quickly the game ramps.
      const t = Math.min(elapsedRef.current / 60, 1);
      const curveFn = CURVE_PRESETS[curve] || CURVE_PRESETS.linear;
      const c = curveFn(t);

      // Speed ramps up over time.
      const accel = ACCEL_BASE * difficultyCfg.accelMul * (1 + c);
      const speeds = speedsRef.current;
      for (let i = 0; i < speeds.length; i += 1) speeds[i] += dt * accel;

      // Road offset for dashes
      roadOffsetRef.current += dt * speeds[laneRef.current] * 0.45;

      // Obstacles advance
      const obstacles = obstaclesRef.current;
      for (const o of obstacles) {
        o.y += speeds[o.lane] * dt;
      }
      obstaclesRef.current = obstacles.filter((o) => o.y < HEIGHT + OBSTACLE_HEIGHT);

      // Pickups advance
      const pickups = pickupsRef.current;
      for (const p of pickups) {
        p.y += speeds[p.lane] * dt;
      }
      pickupsRef.current = pickups.filter((p) => p.y < HEIGHT + PICKUP_SIZE);

      // Spawn new obstacles
      const baseGap = 1.05 / difficultyCfg.spawnMul;
      const gap = Math.max(0.35, baseGap - c * 0.55);
      spawnCooldownRef.current = Math.max(0, spawnCooldownRef.current - dt);
      if (spawnRef.current >= gap && spawnCooldownRef.current <= 0) {
        const lane = pickSpawnLane(
          obstaclesRef.current,
          OBSTACLE_HEIGHT * 2.6
        );
        obstaclesRef.current.push({ lane, y: -OBSTACLE_HEIGHT });
        lastSpawnLaneRef.current = lane;
        lastSpawnAtRef.current = elapsedRef.current;
        spawnRef.current = 0;
      }

      // Spawn extra life pickup
      pickupTimerRef.current += dt;
      if (
        pickupTimerRef.current >= PICKUP_INTERVAL &&
        livesRef.current < MAX_LIVES
      ) {
        const lane = pickSpawnLane(
          obstaclesRef.current,
          OBSTACLE_HEIGHT * 2.2
        );
        pickupsRef.current.push({ lane, y: -PICKUP_SIZE });
        pickupTimerRef.current = 0;
      }

      // Tilt based lane changes
      if (control === 'tilt' && tiltAllowed) {
        const tilt = tiltValueRef.current;
        const prev = prevTiltRef.current;
        const threshold = 12;
        if (tilt > threshold && prev <= threshold) {
          laneRef.current = Math.min(LANES - 1, laneRef.current + 1);
        }
        if (tilt < -threshold && prev >= -threshold) {
          laneRef.current = Math.max(0, laneRef.current - 1);
        }
        prevTiltRef.current = tilt;
      }

      // Hit state
      invulnRef.current = Math.max(0, invulnRef.current - dt);
      hitFlashRef.current = Math.max(0, hitFlashRef.current - dt * 3);

      // Collision detection
      if (invulnRef.current <= 0) {
        const collided = detectCollision(
          laneRef.current,
          obstaclesRef.current,
          PLAYER_Y_BOTTOM,
          OBSTACLE_HEIGHT
        );
        if (collided) {
          livesRef.current -= 1;
          invulnRef.current = HIT_INVULN_SECONDS;
          hitFlashRef.current = 1;
          danger();

          if (livesRef.current > 0) {
            obstaclesRef.current = [];
            pickupsRef.current = [];
            spawnRef.current = 0;
            spawnCooldownRef.current = POST_HIT_SPAWN_DELAY;
            laneRef.current = 1;
          } else {
            setGameOver(true);
            setPaused(false);
            hGameOver();
            const finalScore = Math.floor(scoreRef.current);
            if (finalScore > highScore) setHighScore(finalScore);
          }
        }
      }

      // Pickup collision
      if (pickupsRef.current.length) {
        const collected = [];
        for (const p of pickupsRef.current) {
          if (p.lane !== laneRef.current) continue;
          const pTop = p.y;
          const pBottom = p.y + PICKUP_SIZE;
          if (pTop <= PLAYER_Y_BOTTOM && pBottom >= PLAYER_Y_TOP) {
            collected.push(p);
          }
        }
        if (collected.length) {
          pickupsRef.current = pickupsRef.current.filter(
            (p) => !collected.includes(p)
          );
          livesRef.current = Math.min(MAX_LIVES, livesRef.current + collected.length);
        }
      }

      // Score update
      scoreRef.current = updateScore(scoreRef.current, speeds[laneRef.current], dt);

      // Throttle HUD updates
      const now = performance.now();
      if (now - lastHudUpdateRef.current > 120) {
        lastHudUpdateRef.current = now;
        setHud({
          score: Math.floor(scoreRef.current),
          speed: speeds[laneRef.current],
          lives: Math.max(0, livesRef.current),
        });
      }

      draw();
    },
    !paused && !gameOver
  );

  // Ensure we draw a paused/game over frame when loop stops.
  useEffect(() => {
    draw();
  }, [draw]);

  const handleExport = useCallback(() => {
    const data = exportGameSettings('lane-runner');
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lane-runner-settings.json';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleImport = useCallback(
    async (file) => {
      const text = await file.text();
      importGameSettings('lane-runner', text);
      try {
        const parsed = JSON.parse(text);
        if (typeof parsed.sensitivity === 'number')
          setSensitivity(clamp(parsed.sensitivity, 0.5, 2));
        if (typeof parsed.curve === 'string' && CURVE_PRESETS[parsed.curve])
          setCurve(parsed.curve);
        if (typeof parsed.control === 'string') setControl(parsed.control);
        if (typeof parsed.difficulty === 'string') setDifficulty(parsed.difficulty);
      } catch {
        // ignore invalid json
      }
    },
    [setSensitivity, setCurve, setControl, setDifficulty]
  );

  const settings = (
    <div className="space-y-4 text-sm">
      <div className="space-y-1">
        <div className="font-semibold">Controls</div>
        <div className="flex items-center gap-2">
          <label htmlFor="lr-control" className="min-w-24 opacity-80">
            Mode
          </label>
          <select
            id="lr-control"
            value={control}
            onChange={(e) => {
              const next = e.target.value;
              setControl(next);
              if (next !== 'tilt') setTiltAllowed(false);
            }}
            className="rounded bg-black/40 border border-white/10 px-2 py-1"
          >
            <option value="keys">Keyboard + Swipe</option>
            <option value="touch">Touch Buttons</option>
            <option value="tilt" disabled={!tiltSupport.supported}>
              Tilt
            </option>
          </select>
        </div>

        {control === 'tilt' && !tiltSupport.supported && (
          <div className="text-xs opacity-75">Tilt is not supported on this device.</div>
        )}

        {control === 'tilt' && tiltSupport.supported && (
          <div className="space-y-2 mt-2">
            {tiltSupport.needsPermission && !tiltAllowed && (
              <button
                onClick={requestTilt}
                className="px-2 py-1 rounded bg-gray-700 hover:bg-gray-600"
              >
                Enable tilt
              </button>
            )}
            {(!tiltSupport.needsPermission || tiltAllowed) && (
              <div className="flex items-center gap-2">
                <button
                  onClick={calibrateTilt}
                  className="px-2 py-1 rounded bg-gray-700 hover:bg-gray-600"
                >
                  Calibrate
                </button>
                <div className="flex items-center gap-2">
                  <label htmlFor="lane-runner-tilt-sensitivity" className="opacity-80">
                    Sensitivity
                  </label>
                  <input
                    id="lane-runner-tilt-sensitivity"
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={sensitivity}
                    onChange={(e) => setSensitivity(parseFloat(e.target.value))}
                    aria-label="Tilt sensitivity"
                  />
                  <span className="tabular-nums w-10 text-right">
                    {sensitivity.toFixed(1)}
                  </span>
                </div>
              </div>
            )}
            {tiltSupport.needsPermission && tiltAllowed === false && (
              <div className="text-xs opacity-75">
                Some browsers require permission. Tap &quot;Enable tilt&quot; first.
              </div>
            )}
          </div>
        )}
      </div>

      {control === 'touch' && (
        <div className="space-y-1">
          <div className="font-semibold">Touch buttons</div>
          <div className="text-xs opacity-75">
            Use the on-screen buttons, or swipe left and right on the canvas.
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="font-semibold">Difficulty</div>
        <div className="flex items-center gap-2">
          <label htmlFor="lr-difficulty" className="min-w-24 opacity-80">
            Preset
          </label>
          <select
            id="lr-difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="rounded bg-black/40 border border-white/10 px-2 py-1"
          >
            <option value="easy">Easy</option>
            <option value="normal">Normal</option>
            <option value="hard">Hard</option>
          </select>
        </div>
        <div className="text-xs opacity-75">
          Extra life pickups appear periodically and cap at {MAX_LIVES} lives.
        </div>
      </div>

      <div className="space-y-2">
        <div className="font-semibold">Ramp curve</div>
        <div className="flex items-center gap-2">
          <label htmlFor="lr-curve" className="min-w-24 opacity-80">
            Curve
          </label>
          <select
            id="lr-curve"
            value={curve}
            onChange={(e) => setCurve(e.target.value)}
            className="rounded bg-black/40 border border-white/10 px-2 py-1"
          >
            {Object.keys(CURVE_PRESETS).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="text-xs opacity-75">
          This controls how quickly speed and spawn rate ramp during the first minute.
        </div>
      </div>

      <div className="space-y-2">
        <div className="font-semibold">Export / import settings</div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="px-2 py-1 rounded bg-gray-700 hover:bg-gray-600"
          >
            Export
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="px-2 py-1 rounded bg-gray-700 hover:bg-gray-600"
          >
            Import
          </button>
          <input
            type="file"
            accept="application/json"
            ref={fileRef}
            className="hidden"
            aria-label="Import settings file"
            onChange={(e) => {
              const file = e.target.files && e.target.files[0];
              if (file) handleImport(file);
              e.target.value = '';
            }}
          />
        </div>
      </div>
    </div>
  );

  const stageText = useMemo(() => {
    const s = Math.round(hud.speed);
    return `Speed ${s}`;
  }, [hud.speed]);

  const pauseHotkeys = useMemo(
    () => Array.from(new Set([mapping.pause, 'space'])).filter(Boolean),
    [mapping.pause]
  );
  const restartHotkeys = useMemo(
    () => Array.from(new Set([mapping.restart, 'r'])).filter(Boolean),
    [mapping.restart]
  );

  return (
    <GameLayout
      gameId="lane-runner"
      title="Lane Runner"
      onPauseChange={(nextPaused) => {
        setPaused(nextPaused);
        draw();
      }}
      pauseHotkeys={pauseHotkeys}
      restartHotkeys={restartHotkeys}
      score={hud.score}
      highScore={highScore}
      lives={hud.lives}
      stage={stageText}
      hint="Arrow keys or swipe to change lanes"
      badge={difficulty}
      gameOver={gameOver}
      onRestart={resetGame}
      settingsPanel={settings}
    >
      <div className="relative h-full w-full flex items-center justify-center bg-black">
        <canvas
          ref={canvasRef}
          className="w-full h-full touch-none"
          aria-label="Lane Runner game canvas"
        />

        {control === 'touch' && (
          <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-3 pointer-events-none">
            <div className="flex gap-3 pointer-events-auto">
              <button
                type="button"
                aria-label="Move left"
                className="px-4 py-3 rounded bg-white/10 hover:bg-white/15 border border-white/15"
                onPointerDown={(e) => {
                  e.preventDefault();
                  laneRef.current = Math.max(0, laneRef.current - 1);
                }}
              >
                ◀
              </button>
              <button
                type="button"
                aria-label="Move right"
                className="px-4 py-3 rounded bg-white/10 hover:bg-white/15 border border-white/15"
                onPointerDown={(e) => {
                  e.preventDefault();
                  laneRef.current = Math.min(LANES - 1, laneRef.current + 1);
                }}
              >
                ▶
              </button>
            </div>
          </div>
        )}
      </div>
    </GameLayout>
  );
};

export default LaneRunner;
