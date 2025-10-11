import React, { useCallback, useEffect, useRef, useState } from 'react';
import useCanvasResize from '../../hooks/useCanvasResize';
import usePersistentState from '../../hooks/usePersistentState';
import { exportGameSettings, importGameSettings } from '../../utils/gameSettings';
import Overlay from './Games/common/Overlay';
import useGameLoop from './Games/common/useGameLoop';
import { useGamePersistence, useGameSettings } from './useGameControls';

const WIDTH = 300;
const HEIGHT = 500;
const LANES = 3;
const LANE_WIDTH = WIDTH / LANES;
const PLAYER_Y = HEIGHT - 40;
const OBSTACLE_HEIGHT = 20;
const BASE_SPEEDS = [100, 120, 140];
const DEFAULT_DIFFICULTY = 'normal';

const DIFFICULTY_SETTINGS = {
  easy: {
    label: 'Easy',
    lives: 5,
    speedMultiplier: 0.85,
    spawnRate: 0.75,
  },
  normal: {
    label: 'Normal',
    lives: 3,
    speedMultiplier: 1,
    spawnRate: 1,
  },
  hard: {
    label: 'Hard',
    lives: 2,
    speedMultiplier: 1.2,
    spawnRate: 1.25,
  },
};

export const CURVE_PRESETS = {
  linear: (t) => t,
  'ease-in': (t) => t * t,
  'ease-out': (t) => Math.sqrt(t),
  'ease-in-out': (t) =>
    t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
};

export const detectCollision = (
  playerLane,
  obstacles,
  playerY = PLAYER_Y,
  threshold = OBSTACLE_HEIGHT,
) =>
  obstacles.some(
    (o) => o.lane === playerLane && Math.abs(o.y - playerY) < threshold * 0.8,
  );

export const updateScore = (score, speed, dt) => score + speed * dt;

export const advanceObstacles = (
  obstacles,
  speeds,
  dt,
  height = HEIGHT,
  obstacleHeight = OBSTACLE_HEIGHT,
) =>
  obstacles
    .map((o) => ({ lane: o.lane, y: o.y + speeds[o.lane] * dt }))
    .filter((o) => o.y < height + obstacleHeight);

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

const createInitialState = (difficultyKey) => {
  const config =
    DIFFICULTY_SETTINGS[difficultyKey] || DIFFICULTY_SETTINGS[DEFAULT_DIFFICULTY];
  return {
    playerLane: 1,
    obstacles: [],
    speeds: BASE_SPEEDS.map((sp) => sp * config.speedMultiplier),
    spawnTimer: 0,
    elapsed: 0,
    lives: config.lives,
    alive: true,
    tilt: 0,
    prevTilt: 0,
    score: 0,
  };
};

const LaneRunner = () => {
  const canvasRef = useCanvasResize(WIDTH, HEIGHT);
  const [control, setControl] = useState('keys');
  const [tiltAllowed, setTiltAllowed] = useState(false);
  const [tiltOffset, setTiltOffset] = useState(0);
  const [sensitivity, setSensitivity] = usePersistentState(
    'lane-runner:sensitivity',
    1,
  );
  const [curve, setCurve] = usePersistentState('lane-runner:curve', 'linear');
  const [difficulty, setDifficulty] = usePersistentState(
    'lane-runner:difficulty',
    DEFAULT_DIFFICULTY,
    (value) => typeof value === 'string' && value in DIFFICULTY_SETTINGS,
  );
  const [score, setScore] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [running, setRunning] = useState(true);
  const [session, setSession] = useState(0);
  const [lives, setLives] = useState(
    DIFFICULTY_SETTINGS[difficulty]?.lives ||
      DIFFICULTY_SETTINGS[DEFAULT_DIFFICULTY].lives,
  );
  const [highScore, setHighScoreState] = useState(0);
  const { paused, togglePause, muted, toggleMute } = useGameSettings('lane-runner');
  const { getHighScore, setHighScore } = useGamePersistence('lane-runner');
  const [isPaused, setIsPaused] = useState(paused);
  const gammaRef = useRef(0);
  const fileRef = useRef(null);
  const ctxRef = useRef(null);
  const audioCtxRef = useRef(null);
  const livesStateRef = useRef(lives);
  const stateRef = useRef(createInitialState(difficulty));

  useEffect(() => {
    livesStateRef.current = lives;
  }, [lives]);

  const drawScene = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const { playerLane, obstacles, speeds, alive } = stateRef.current;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = 'cyan';
    const playerX = playerLane * LANE_WIDTH + 10;
    ctx.fillRect(
      playerX,
      PLAYER_Y - OBSTACLE_HEIGHT,
      LANE_WIDTH - 20,
      OBSTACLE_HEIGHT,
    );
    ctx.fillStyle = 'red';
    obstacles.forEach((o) => {
      const ox = o.lane * LANE_WIDTH + 10;
      ctx.fillRect(ox, o.y, LANE_WIDTH - 20, OBSTACLE_HEIGHT);
    });
    ctx.fillStyle = 'white';
    ctx.font = '12px sans-serif';
    for (let i = 0; i < LANES; i += 1) {
      const tx = i * LANE_WIDTH + LANE_WIDTH / 2 - 10;
      ctx.fillText(Math.round(speeds[i]).toString(), tx, 12);
    }
    if (!alive) {
      ctx.fillStyle = 'white';
      ctx.font = '20px sans-serif';
      ctx.fillText('Game Over', WIDTH / 2 - 50, HEIGHT / 2);
    }
  }, []);

  const playHitSound = useCallback(() => {
    if (muted || typeof window === 'undefined') return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 220;
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {
      /* ignore audio errors */
    }
  }, [muted]);

  useEffect(() => {
    setHighScoreState(getHighScore());
  }, [getHighScore]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctxRef.current = ctx;
    drawScene();
  }, [canvasRef, drawScene]);

  useEffect(() => {
    const config =
      DIFFICULTY_SETTINGS[difficulty] || DIFFICULTY_SETTINGS[DEFAULT_DIFFICULTY];
    stateRef.current = createInitialState(difficulty);
    setLives(config.lives);
    setScore(0);
    setSpeed(stateRef.current.speeds[stateRef.current.playerLane]);
    setRunning(true);
    if (paused) togglePause();
    setIsPaused(false);
    drawScene();
  }, [session, difficulty, curve, paused, togglePause, drawScene]);

  const handleCalibrate = () => setTiltOffset(gammaRef.current);
  const handleRestart = () => {
    setSession((value) => value + 1);
  };

  const handleExport = () => {
    const data = exportGameSettings('lane-runner');
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lane-runner-settings.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (file) => {
    const text = await file.text();
    importGameSettings('lane-runner', text);
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed.sensitivity === 'number')
        setSensitivity(parsed.sensitivity);
      if (typeof parsed.curve === 'string' && parsed.curve in CURVE_PRESETS)
        setCurve(parsed.curve);
      if (
        typeof parsed.difficulty === 'string' &&
        parsed.difficulty in DIFFICULTY_SETTINGS
      )
        setDifficulty(parsed.difficulty);
      setSession((value) => value + 1);
      setHighScoreState(getHighScore());
    } catch {
      /* ignore */
    }
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
    const onKey = (e) => {
      if (e.key === 'ArrowLeft')
        stateRef.current.playerLane = Math.max(0, stateRef.current.playerLane - 1);
      if (e.key === 'ArrowRight')
        stateRef.current.playerLane = Math.min(
          LANES - 1,
          stateRef.current.playerLane + 1,
        );
      drawScene();
    };
    if (control === 'keys') window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [control, drawScene]);

  useEffect(() => {
    const onOrientation = (e) => {
      gammaRef.current = e.gamma || 0;
      stateRef.current.tilt = (gammaRef.current - tiltOffset) * sensitivity;
    };
    if (control === 'tilt' && tiltAllowed) {
      stateRef.current.prevTilt = 0;
      window.addEventListener('deviceorientation', onOrientation);
      return () => {
        window.removeEventListener('deviceorientation', onOrientation);
      };
    }
    return undefined;
  }, [control, tiltAllowed, tiltOffset, sensitivity]);

  useEffect(() => {
    setIsPaused(paused);
  }, [paused]);

  const handlePause = useCallback(() => {
    setIsPaused(true);
    if (!paused) togglePause();
  }, [paused, togglePause]);

  const handleResume = useCallback(() => {
    setIsPaused(false);
    if (paused) togglePause();
  }, [paused, togglePause]);

  const handleToggleSound = useCallback(
    (nextMuted) => {
      if (nextMuted !== muted) toggleMute();
    },
    [muted, toggleMute],
  );

  useGameLoop(
    (delta) => {
      const dt = delta;
      const state = stateRef.current;
      if (!state.alive) return;
      state.elapsed += dt;
      state.spawnTimer += dt;
      const curveFn = CURVE_PRESETS[curve] || CURVE_PRESETS.linear;
      const config =
        DIFFICULTY_SETTINGS[difficulty] || DIFFICULTY_SETTINGS[DEFAULT_DIFFICULTY];
      const t = Math.min(state.elapsed / 60, 1);
      const progress = curveFn(t);
      const gapTime = Math.max(0.3, (1 - progress * 0.5) / config.spawnRate);
      const speedScale = (1 + progress) * config.speedMultiplier;
      state.speeds = state.speeds.map((sp) => sp + dt * 10 * speedScale);
      state.obstacles = advanceObstacles(state.obstacles, state.speeds, dt);
      if (state.spawnTimer > gapTime) {
        state.obstacles.push({
          lane: Math.floor(Math.random() * LANES),
          y: -OBSTACLE_HEIGHT,
        });
        state.spawnTimer = 0;
      }
      if (control === 'tilt' && tiltAllowed) {
        const { tilt, prevTilt } = state;
        if (tilt > 15 && prevTilt <= 15 && state.playerLane < LANES - 1)
          state.playerLane += 1;
        if (tilt < -15 && prevTilt >= -15 && state.playerLane > 0)
          state.playerLane -= 1;
        state.prevTilt = tilt;
      }
      if (detectCollision(state.playerLane, state.obstacles)) {
        state.lives -= 1;
        if (state.lives !== livesStateRef.current) {
          livesStateRef.current = state.lives;
          setLives(state.lives);
        }
        playHitSound();
        if (state.lives > 0) {
          state.obstacles = [];
          state.playerLane = 1;
          state.prevTilt = 0;
        } else {
          state.alive = false;
          setRunning(false);
          setIsPaused(false);
          if (paused) togglePause();
          const finalScore = Math.floor(state.score);
          setHighScore(finalScore);
          setHighScoreState((prev) => (finalScore > prev ? finalScore : prev));
        }
      }
      state.score = updateScore(
        state.score,
        state.speeds[state.playerLane],
        dt,
      );
      setScore(state.score);
      setSpeed(state.speeds[state.playerLane]);
      drawScene();
    },
    running && !isPaused,
  );

  return (
    <div className="relative h-full w-full flex items-center justify-center bg-ub-cool-grey text-white">
      <canvas ref={canvasRef} className="bg-black w-full h-full" />
      <div className="absolute top-2 left-2 bg-black/70 p-2 rounded text-xs space-y-1 pointer-events-auto">
        <div className="font-semibold">Lane Runner</div>
        <div className="flex gap-4">
          <div>Score: {Math.floor(score)}</div>
          <div>High: {Math.floor(highScore)}</div>
        </div>
        <div>Speed: {Math.round(speed)}</div>
        <div>Status: {!running ? 'Game Over' : isPaused ? 'Paused' : 'Running'}</div>
        <div className="flex items-center gap-1">
          <span>Lives:</span>
          {Array.from({ length: lives }).map((_, i) => (
            <span key={i} role="img" aria-label="life">
              ❤️
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <label htmlFor="difficulty">Difficulty:</label>
          <select
            id="difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="text-black"
          >
            {Object.entries(DIFFICULTY_SETTINGS).map(([key, value]) => (
              <option key={key} value={key}>
                {value.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <label htmlFor="curve">Curve:</label>
          <select
            id="curve"
            value={curve}
            onChange={(e) => setCurve(e.target.value)}
            className="text-black"
          >
            {Object.keys(CURVE_PRESETS).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
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
            <button onClick={handleCalibrate} className="px-2 py-1 bg-gray-700 rounded">
              Calibrate
            </button>
            <div className="flex items-center gap-1">
              <label htmlFor="sensitivity">Sens:</label>
              <input
                id="sensitivity"
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
        <div className="flex items-center gap-2 pt-1">
          <button onClick={handleRestart} className="px-2 py-1 bg-gray-700 rounded">
            Reset
          </button>
          <button onClick={handleExport} className="px-2 py-1 bg-gray-700 rounded">
            Export
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="px-2 py-1 bg-gray-700 rounded"
          >
            Import
          </button>
        </div>
        <input
          type="file"
          accept="application/json"
          ref={fileRef}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files && e.target.files[0];
            if (file) handleImport(file);
            e.target.value = '';
          }}
        />
      </div>
      <Overlay
        onPause={handlePause}
        onResume={handleResume}
        muted={muted}
        onToggleSound={handleToggleSound}
      />
    </div>
  );
};

export default LaneRunner;
