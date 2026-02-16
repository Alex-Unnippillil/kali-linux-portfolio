import React, { useEffect, useMemo, useRef, useState } from 'react';
import GameLoop from './Games/common/loop/GameLoop';
import useCanvasResize from '../../hooks/useCanvasResize';
import { CAR_SKINS, loadSkinAssets } from '../../apps/games/car-racer/customization';
import { createGame, getLevelConfig, stepGame } from '../../games/car-racer/engine';
import {
  INPUT_BITS,
  createReplay,
  inputToMask,
  loadReplay,
  maskToInput,
  persistReplay,
  playbackTick,
  recordEvent,
} from '../../games/car-racer/replay';
import { safeLocalStorage } from '../../utils/safeStorage';

const level = getLevelConfig('default');
const WIDTH = level.trackWidth;
const HEIGHT = level.trackHeight;
const LAP_KEY = 'car_racer_best_replay_v1';
const HIGH_KEY = 'car_racer_high';
const MEDAL_THRESHOLDS = [
  { name: 'bronze', score: 500 },
  { name: 'silver', score: 1000 },
  { name: 'gold', score: 1500 },
];

const defaultInput = inputToMask({ throttle: true });

export const getMedal = (score) => {
  let medal = null;
  for (const { name, score: s } of MEDAL_THRESHOLDS) {
    if (score >= s) medal = name;
  }
  return medal;
};

const drawState = (ctx, state, skinColor, ghostState) => {
  if (!ctx || !state) return;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = '#222';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.strokeStyle = '#fff';
  ctx.setLineDash([20, 20]);
  ctx.lineDashOffset = -(state.distance % 40);
  const laneWidth = WIDTH / level.lanes;
  for (let i = 1; i < level.lanes; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * laneWidth, 0);
    ctx.lineTo(i * laneWidth, HEIGHT);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  if (ghostState) {
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#fff';
    ctx.fillRect(
      ghostState.car.position.x,
      ghostState.car.position.y,
      level.carSize.width,
      level.carSize.height,
    );
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = skinColor;
  ctx.fillRect(state.car.position.x, state.car.position.y, level.carSize.width, level.carSize.height);

  ctx.fillStyle = '#3b82f6';
  state.obstacles.forEach((o) => {
    ctx.fillRect(o.position.x, o.position.y, o.size.width, o.size.height);
  });
};

const CarRacer = () => {
  const canvasRef = useCanvasResize(WIDTH, HEIGHT);
  const [skin, setSkin] = useState(() => safeLocalStorage?.getItem('car_racer_skin') || CAR_SKINS[0].key);
  const [skinAssets, setSkinAssets] = useState({});
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => parseInt(safeLocalStorage?.getItem(HIGH_KEY) || '0', 10));
  const [paused, setPaused] = useState(true);
  const pausedRef = useRef(true);
  const [showCustomization, setShowCustomization] = useState(true);
  const [speed, setSpeed] = useState(0);
  const [lapTimes, setLapTimes] = useState([]);
  const gameRef = useRef(createGame(Date.now(), 'default'));
  const ghostRef = useRef(null);
  const ghostCursorRef = useRef(-1);
  const bestReplayRef = useRef(null);
  const replayRef = useRef(createReplay(gameRef.current.seed, 'default', level.tickRate));
  const lastMaskRef = useRef(defaultInput);
  const inputMaskRef = useRef(defaultInput);

  const currentSkin = useMemo(
    () => CAR_SKINS.find((s) => s.key === skin) || CAR_SKINS[0],
    [skin],
  );

  useEffect(() => {
    loadSkinAssets().then(setSkinAssets);
  }, []);

  useEffect(() => {
    const stored = loadReplay(LAP_KEY);
    if (stored) {
      bestReplayRef.current = stored;
      ghostRef.current = createGame(stored.seed, stored.levelId);
      ghostCursorRef.current = -1;
    }
  }, []);

  useEffect(() => {
    if (safeLocalStorage) safeLocalStorage.setItem('car_racer_skin', skin);
  }, [skin]);

  const resetGame = (seed = Date.now()) => {
    gameRef.current = createGame(seed, 'default');
    replayRef.current = createReplay(seed, 'default', level.tickRate);
    lastMaskRef.current = defaultInput;
    inputMaskRef.current = defaultInput;
    ghostRef.current = bestReplayRef.current
      ? createGame(bestReplayRef.current.seed, bestReplayRef.current.levelId)
      : null;
    ghostCursorRef.current = -1;
    pausedRef.current = false;
    setPaused(false);
    setShowCustomization(false);
    setScore(0);
    setLapTimes([]);
  };

  const updateHighScore = (value) => {
    if (value > highScore) {
      setHighScore(value);
      safeLocalStorage?.setItem(HIGH_KEY, `${value}`);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const tick = (ms) => {
      if (pausedRef.current) return;
      const dt = ms / 1000;
      const input = maskToInput(inputMaskRef.current);
      if (input.throttle === undefined) input.throttle = true;
      const next = stepGame(gameRef.current, input, dt);
      gameRef.current = next;
      recordEvent(replayRef.current.events, next.tick, inputMaskRef.current, lastMaskRef.current);
      lastMaskRef.current = inputMaskRef.current;
      replayRef.current.durationTicks = next.tick;
      setScore(Math.floor(next.distance));
      setSpeed(Math.round(next.forwardSpeed));
      if (next.lapTimes.length !== lapTimes.length) setLapTimes([...next.lapTimes]);

      if (next.crashed) {
        pausedRef.current = true;
        setPaused(true);
        updateHighScore(Math.floor(next.distance));
        const best = bestReplayRef.current?.result?.score || 0;
        if (Math.floor(next.distance) >= best) {
          replayRef.current.result = {
            score: Math.floor(next.distance),
            laps: next.laps,
            bestLapSec: next.lapTimes[0],
          };
          persistReplay(LAP_KEY, replayRef.current);
          bestReplayRef.current = replayRef.current;
        }
      }

      if (ghostRef.current && bestReplayRef.current) {
        const { mask, cursor } = playbackTick(bestReplayRef.current, next.tick, ghostCursorRef.current);
        ghostCursorRef.current = cursor;
        const ghostInput = maskToInput(mask);
        const ghostNext = stepGame(ghostRef.current, ghostInput, dt);
        ghostRef.current = ghostNext;
      }
    };

    const render = () => {
      drawState(ctx, gameRef.current, currentSkin.color, ghostRef.current);
    };

    const loop = new GameLoop(tick, undefined, { fps: level.tickRate, maxDt: 1000 / 20, render });
    loop.start();

    return () => {
      loop.stop();
    };
  }, [canvasRef, currentSkin.color, lapTimes.length]);

  const setInputBit = (bitSetter) => (down) => {
    inputMaskRef.current = bitSetter(inputMaskRef.current, down);
  };

  const handleKey = (e, down) => {
    if (e.key === 'ArrowLeft' || e.key === 'a')
      setInputBit((mask, on) => (on ? mask | INPUT_BITS.left : mask & ~INPUT_BITS.left))(down);
    if (e.key === 'ArrowRight' || e.key === 'd')
      setInputBit((mask, on) => (on ? mask | INPUT_BITS.right : mask & ~INPUT_BITS.right))(down);
    if (e.key === 'ArrowUp' || e.key === 'w')
      setInputBit((mask, on) => (on ? mask | INPUT_BITS.throttle : mask & ~INPUT_BITS.throttle))(down);
    if (e.key === 'ArrowDown' || e.key === 's')
      setInputBit((mask, on) => (on ? mask | INPUT_BITS.brake : mask & ~INPUT_BITS.brake))(down);
    if (e.key === 'Shift')
      setInputBit((mask, on) => (on ? mask | INPUT_BITS.boost : mask & ~INPUT_BITS.boost))(down);
    if (e.key === ' ' && down) {
      pausedRef.current = !pausedRef.current;
      setPaused(pausedRef.current);
    }
  };

  useEffect(() => {
    const down = (e) => handleKey(e, true);
    const up = (e) => handleKey(e, false);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  const startRace = () => resetGame(Date.now());

  return (
    <div className="h-full w-full relative text-white select-none">
      <canvas ref={canvasRef} className="h-full w-full bg-black" />
      {showCustomization && (
        <div className="absolute inset-0 bg-black bg-opacity-60 z-20 flex flex-col items-center justify-center space-y-4">
          <div className="flex space-x-4">
            {CAR_SKINS.map((s) => (
              <button
                key={s.key}
                onClick={() => setSkin(s.key)}
                className={`border-2 ${skin === s.key ? 'border-white' : 'border-transparent'}`}
              >
                <img
                  src={skinAssets[s.key]?.src || s.src}
                  alt={s.label}
                  className="h-12 w-8"
                />
              </button>
            ))}
          </div>
          <button className="bg-gray-700 px-3 py-1" onClick={startRace}>
            Start
          </button>
        </div>
      )}
      <div className="absolute top-2 left-2 text-sm space-y-1 z-10" aria-live="polite" role="status">
        <div>Score: {score}</div>
        <div>High: {highScore}</div>
        {lapTimes.length > 0 && <div>Best lap: {lapTimes[0].toFixed(2)}s</div>}
        {gameRef.current.crashed && <div>Crash! Press Reset.</div>}
      </div>
      <div className="absolute bottom-2 left-2 space-x-2 z-10 text-sm">
        <button
          className="bg-gray-700 px-2 focus:outline-none focus:ring-2 focus:ring-white"
          onClick={() => {
            pausedRef.current = true;
            setPaused(true);
            setShowCustomization(true);
          }}
        >
          Reset
        </button>
        <button
          className="bg-gray-700 px-2 focus:outline-none focus:ring-2 focus:ring-white"
          onClick={() => {
            pausedRef.current = !pausedRef.current;
            setPaused(pausedRef.current);
          }}
        >
          {paused ? 'Resume' : 'Pause'}
        </button>
      </div>
      <div className="absolute bottom-2 right-2 z-10 text-sm w-24">
        <div className="w-full h-2 bg-gray-700">
          <div className="h-full bg-green-500" style={{ width: `${(speed / (level.maxSpeed * 1.2)) * 100}%` }} />
        </div>
        <div className="text-right mt-1">{Math.round(speed)} px/s</div>
      </div>
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-4 z-10">
        <button
          aria-label="Steer left"
          className="w-12 h-12 bg-gray-700 bg-opacity-70 flex items-center justify-center text-xl rounded"
          onPointerDown={() => {
            inputMaskRef.current |= INPUT_BITS.left;
          }}
          onPointerUp={() => {
            inputMaskRef.current &= ~INPUT_BITS.left;
          }}
        >
          ←
        </button>
        <button
          aria-label="Steer right"
          className="w-12 h-12 bg-gray-700 bg-opacity-70 flex items-center justify-center text-xl rounded"
          onPointerDown={() => {
            inputMaskRef.current |= INPUT_BITS.right;
          }}
          onPointerUp={() => {
            inputMaskRef.current &= ~INPUT_BITS.right;
          }}
        >
          →
        </button>
      </div>
    </div>
  );
};

export default CarRacer;
