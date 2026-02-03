import React, { useEffect, useMemo, useRef, useState } from 'react';
import { TILE_SIZE, cameraDefaults, parseLevel, step } from '../../games/platformer/logic';
import useIsTouchDevice from '../../hooks/useIsTouchDevice';
import { consumeGameKey, shouldHandleGameKey } from '../../utils/gameInput';

// Level definitions are data driven: edit the string arrays to tweak layouts or add more.
// Each row must share the same width. Tokens: # solid, . empty, S spawn, G goal, ^ spikes, C coin, M moving platform.
const LEVELS = [
  {
    name: 'Training Grounds',
    grid: [
      '######################',
      '#....................#',
      '#............C.......#',
      '#....................#',
      '#.....C......###.....#',
      '#..................G.#',
      '#.........###........#',
      '#....................#',
      '#..S..###......C.....#',
      '#....................#',
      '######################',
    ],
  },
  {
    name: 'Factory Lift',
    grid: [
      '########################',
      '#......................#',
      '#....C.................#',
      '#...........M..........#',
      '#..................^...#',
      '#......###......#####..#',
      '#..................C..G#',
      '#..S.......^...........#',
      '#............###.......#',
      '#......................#',
      '########################',
    ],
  },
];

const PLAYER_SIZE = { w: 20, h: 28 };
const FIXED_DT = 1 / 60;
const RENDER_SCALE = 1; // canvas is scaled via CSS; internal resolution stays stable.

function createInitialState(levelIndex) {
  const levelDef = LEVELS[levelIndex % LEVELS.length];
  const parsed = parseLevel(levelDef.grid);
  return {
    levelIndex,
    levelName: levelDef.name,
    state: {
      level: parsed,
      player: {
        x: parsed.spawn.x + (TILE_SIZE - PLAYER_SIZE.w) / 2,
        y: parsed.spawn.y + (TILE_SIZE - PLAYER_SIZE.h),
        w: PLAYER_SIZE.w,
        h: PLAYER_SIZE.h,
        vx: 0,
        vy: 0,
        onGround: false,
        onPlatformId: null,
        facing: 1,
      },
      time: 0,
      coinsCollected: 0,
      deaths: 0,
      status: 'running',
      respawnTimer: 0,
      coyoteTimer: 0,
      jumpBufferTimer: 0,
      camera: { x: parsed.spawn.x, y: parsed.spawn.y },
      shake: { time: 0, magnitude: 0 },
    },
  };
}

function formatTime(seconds) {
  const whole = Math.floor(seconds);
  const ms = Math.floor((seconds - whole) * 1000)
    .toString()
    .padStart(3, '0');
  const mins = Math.floor(whole / 60)
    .toString()
    .padStart(2, '0');
  const secs = (whole % 60).toString().padStart(2, '0');
  return `${mins}:${secs}.${ms}`;
}

export default function PlatformerApp({ windowMeta } = {}) {
  const isFocused = windowMeta?.isFocused ?? true;
  const isTouch = useIsTouchDevice();
  const canvasRef = useRef(null);
  const requestRef = useRef(null);
  const lastTimeRef = useRef(0);
  const accumulatorRef = useRef(0);
  const pausedRef = useRef(false);
  const focusPausedRef = useRef(false);
  const reduceMotionRef = useRef(false);
  const inputRef = useRef({ left: false, right: false, jumpHeld: false, jumpPressed: false, jumpReleased: false });
  const prevSnapshotRef = useRef(null);
  const uiUpdateRef = useRef(0);
  const [ui, setUi] = useState({
    level: LEVELS[0].name,
    time: 0,
    coins: { collected: 0, total: 0 },
    deaths: 0,
    status: 'running',
    paused: false,
  });

  const sessionRef = useRef(createInitialState(0));

  const resizeCanvas = useMemo(
    () =>
      () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const { level } = sessionRef.current.state;
        const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
        canvas.width = level.width * TILE_SIZE * dpr * RENDER_SCALE;
        canvas.height = level.height * TILE_SIZE * dpr * RENDER_SCALE;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.setTransform(dpr * RENDER_SCALE, 0, 0, dpr * RENDER_SCALE, 0, 0);
      },
    []
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    reduceMotionRef.current = mq.matches;
    const handler = (event) => {
      reduceMotionRef.current = event.matches;
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    resizeCanvas();

    const handleResize = () => resizeCanvas();
    window.addEventListener('resize', handleResize);

    const handleKeyDown = (e) => {
      if (!shouldHandleGameKey(e, { isFocused })) return;
      if (e.repeat) return;
      if (['KeyA', 'ArrowLeft'].includes(e.code)) inputRef.current.left = true;
      if (['KeyD', 'ArrowRight'].includes(e.code)) inputRef.current.right = true;
      if (['Space', 'KeyW', 'ArrowUp'].includes(e.code)) {
        consumeGameKey(e);
        if (!inputRef.current.jumpHeld) inputRef.current.jumpPressed = true;
        inputRef.current.jumpHeld = true;
      }
      if (e.code === 'KeyR') {
        consumeGameKey(e);
        restartLevel();
      }
      if (e.code === 'KeyP' || e.code === 'Escape') {
        consumeGameKey(e);
        togglePause();
      }
    };

    const handleKeyUp = (e) => {
      if (!shouldHandleGameKey(e, { isFocused })) return;
      if (['KeyA', 'ArrowLeft'].includes(e.code)) inputRef.current.left = false;
      if (['KeyD', 'ArrowRight'].includes(e.code)) inputRef.current.right = false;
      if (['Space', 'KeyW', 'ArrowUp'].includes(e.code)) {
        if (inputRef.current.jumpHeld) inputRef.current.jumpReleased = true;
        inputRef.current.jumpHeld = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Fixed-step simulation with an accumulator keeps physics identical across refresh rates.
    // Rendering interpolates between the previous and current snapshot for smooth movement without extra React renders.
    const frame = (time) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      if (pausedRef.current) {
        lastTimeRef.current = time;
        draw(ctx, 1);
        requestRef.current = requestAnimationFrame(frame);
        return;
      }

      if (!lastTimeRef.current) lastTimeRef.current = time;
      let delta = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;
      delta = Math.min(delta, 0.25);
      accumulatorRef.current += delta;

      const fixedInput = inputRef.current;
      const followLerp = reduceMotionRef.current ? 0.06 : 0.12;
      cameraDefaults.followLerp = followLerp;

      while (accumulatorRef.current >= FIXED_DT) {
        prevSnapshotRef.current = snapshot(sessionRef.current.state);
        sessionRef.current.state = step(sessionRef.current.state, fixedInput, FIXED_DT);
        accumulatorRef.current -= FIXED_DT;
        fixedInput.jumpPressed = false;
        fixedInput.jumpReleased = false;
      }

      draw(ctx, accumulatorRef.current / FIXED_DT);
      syncUi(time);
      requestRef.current = requestAnimationFrame(frame);
    };

    requestRef.current = requestAnimationFrame(frame);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
    };
  }, [resizeCanvas, isFocused]);

  const snapshot = (state) => ({
    player: { ...state.player },
    camera: { ...state.camera },
    level: state.level,
    coinsCollected: state.coinsCollected,
    deaths: state.deaths,
    status: state.status,
    time: state.time,
    shake: { ...state.shake },
  });

  const draw = (ctx, alpha) => {
    const current = sessionRef.current.state;
    const previous = prevSnapshotRef.current || current;
    const interp = (a, b) => a + (b - a) * alpha;
    const playerX = interp(previous.player.x, current.player.x);
    const playerY = interp(previous.player.y, current.player.y);
    const camX = interp(previous.camera.x, current.camera.x);
    const camY = interp(previous.camera.y, current.camera.y);
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    const scale = dpr * RENDER_SCALE;
    const shakeMag = reduceMotionRef.current ? 0 : current.shake.magnitude * (current.shake.time > 0 ? current.shake.time / 0.2 : 0);
    const shakeX = shakeMag ? (Math.random() - 0.5) * shakeMag : 0;
    const shakeY = shakeMag ? (Math.random() - 0.5) * shakeMag : 0;

    ctx.save();
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = '#0c0f17';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.translate(-camX + ctx.canvas.width / (2 * scale), -camY + ctx.canvas.height / (2 * scale));
    ctx.translate(shakeX, shakeY);

    drawBackdrop(ctx, current.level);
    drawTiles(ctx, current.level);
    drawPlatforms(ctx, current.level.platforms);
    drawPlayer(ctx, playerX, playerY, current.player.facing);
    ctx.restore();
  };

  const drawBackdrop = (ctx, level) => {
    ctx.save();
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, level.width * TILE_SIZE, level.height * TILE_SIZE);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    for (let x = 0; x <= level.width; x += 1) {
      ctx.beginPath();
      ctx.moveTo(x * TILE_SIZE, 0);
      ctx.lineTo(x * TILE_SIZE, level.height * TILE_SIZE);
      ctx.stroke();
    }
    for (let y = 0; y <= level.height; y += 1) {
      ctx.beginPath();
      ctx.moveTo(0, y * TILE_SIZE);
      ctx.lineTo(level.width * TILE_SIZE, y * TILE_SIZE);
      ctx.stroke();
    }
    ctx.restore();
  };

  const drawTiles = (ctx, level) => {
    for (let y = 0; y < level.height; y += 1) {
      for (let x = 0; x < level.width; x += 1) {
        const tile = level.tiles[y][x];
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;
        if (tile === 1) {
          ctx.fillStyle = '#1f2937';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = '#111827';
          ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
        } else if (tile === 2) {
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.moveTo(px + TILE_SIZE / 2, py);
          ctx.lineTo(px + TILE_SIZE, py + TILE_SIZE);
          ctx.lineTo(px, py + TILE_SIZE);
          ctx.closePath();
          ctx.fill();
        } else if (tile === 3) {
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(px + 8, py + 8, TILE_SIZE - 16, TILE_SIZE - 16);
        } else if (tile === 4) {
          ctx.fillStyle = '#34d399';
          ctx.fillRect(px + 6, py + 6, TILE_SIZE - 12, TILE_SIZE - 12);
        }
      }
    }
  };

  const drawPlatforms = (ctx, platforms) => {
    ctx.fillStyle = '#6b7280';
    platforms.forEach((p) => {
      ctx.fillRect(p.x, p.y, p.width, p.height);
      ctx.strokeStyle = '#111827';
      ctx.strokeRect(p.x, p.y, p.width, p.height);
    });
  };

  const drawPlayer = (ctx, x, y, facing) => {
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(x, y, PLAYER_SIZE.w, PLAYER_SIZE.h);
    ctx.fillStyle = '#111827';
    const eyeX = facing === 1 ? x + PLAYER_SIZE.w - 6 : x + 2;
    ctx.fillRect(eyeX, y + 8, 4, 4);
  };

  const syncUi = (timeMs) => {
    if (timeMs - uiUpdateRef.current < 120) return;
    const { state } = sessionRef.current;
    setUi({
      level: sessionRef.current.levelName,
      time: state.time,
      coins: { collected: state.coinsCollected, total: state.level.coins },
      deaths: state.deaths,
      status: state.status,
      paused: pausedRef.current,
    });
    uiUpdateRef.current = timeMs;
  };

  const restartLevel = () => {
    const currentLevel = sessionRef.current.levelIndex;
    const fresh = createInitialState(currentLevel);
    fresh.state.deaths = sessionRef.current.state.deaths;
    sessionRef.current = fresh;
    accumulatorRef.current = 0;
    lastTimeRef.current = 0;
    resizeCanvas();
  };

  const nextLevel = () => {
    const nextIndex = Math.min(sessionRef.current.levelIndex + 1, LEVELS.length - 1);
    const fresh = createInitialState(nextIndex);
    fresh.state.deaths = sessionRef.current.state.deaths;
    sessionRef.current = fresh;
    accumulatorRef.current = 0;
    lastTimeRef.current = 0;
    pausedRef.current = false;
    resizeCanvas();
  };

  const togglePause = () => {
    pausedRef.current = !pausedRef.current;
    setUi((prev) => ({ ...prev, paused: pausedRef.current }));
  };

  useEffect(() => {
    if (!isFocused && !pausedRef.current) {
      focusPausedRef.current = true;
      pausedRef.current = true;
      setUi((prev) => ({ ...prev, paused: true }));
      return;
    }
    if (isFocused && focusPausedRef.current) {
      focusPausedRef.current = false;
      pausedRef.current = false;
      setUi((prev) => ({ ...prev, paused: false }));
    }
  }, [isFocused]);

  const handleJumpTap = () => {
    if (pausedRef.current) return;
    inputRef.current.jumpPressed = true;
    inputRef.current.jumpHeld = true;
  };

  const handleJumpRelease = () => {
    inputRef.current.jumpHeld = false;
    inputRef.current.jumpReleased = true;
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-950 text-slate-100">
      <div className="flex items-center gap-3 px-3 py-2 text-xs bg-slate-900 border-b border-slate-800">
        <div className="font-semibold">{ui.level}</div>
        <div>Time: {formatTime(ui.time)}</div>
        <div>
          Coins: {ui.coins.collected}/{ui.coins.total}
        </div>
        <div>Deaths: {ui.deaths}</div>
        <div>Status: {ui.status === 'complete' ? 'Complete' : ui.paused ? 'Paused' : 'Running'}</div>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={restartLevel}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700"
          >
            Restart
          </button>
          <button
            type="button"
            onClick={togglePause}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700"
          >
            {ui.paused ? 'Resume' : 'Pause'}
          </button>
          {ui.status === 'complete' && (
            <button
              type="button"
              onClick={nextLevel}
              className="px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-600"
            >
              Next Level
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 grid place-items-center p-2">
        <div
          className="relative w-full h-full max-w-5xl max-h-[70vh] bg-slate-900 border border-slate-800 rounded"
          style={{ aspectRatio: `${sessionRef.current.state.level.width * TILE_SIZE} / ${sessionRef.current.state.level.height * TILE_SIZE}` }}
        >
          <canvas
            ref={canvasRef}
            className="w-full h-full rounded select-none"
            style={{ imageRendering: 'pixelated' }}
            onPointerDown={isTouch ? handleJumpTap : undefined}
            onPointerUp={isTouch ? handleJumpRelease : undefined}
            onPointerCancel={isTouch ? handleJumpRelease : undefined}
          />
          <div className="absolute bottom-2 left-2 text-[10px] text-slate-300 bg-slate-900/70 px-2 py-1 rounded">
            Controls: ←/A + →/D to move • Space/W/↑ to jump • R restart • P/Esc pause
          </div>
        </div>
      </div>
      {isTouch && (
        <div className="mb-4 flex flex-col items-center gap-3">
          <div className="grid grid-cols-3 gap-2 text-lg">
            <div />
            <button
              type="button"
              onPointerDown={handleJumpTap}
              onPointerUp={handleJumpRelease}
              onPointerCancel={handleJumpRelease}
              className="h-12 w-12 rounded bg-slate-800 shadow-sm transition hover:bg-slate-700 focus:outline-none focus:ring"
              aria-label="Jump"
            >
              ⤒
            </button>
            <div />
            <button
              type="button"
              onPointerDown={() => { inputRef.current.left = true; }}
              onPointerUp={() => { inputRef.current.left = false; }}
              onPointerCancel={() => { inputRef.current.left = false; }}
              className="h-12 w-12 rounded bg-slate-800 shadow-sm transition hover:bg-slate-700 focus:outline-none focus:ring"
              aria-label="Move left"
            >
              ←
            </button>
            <button
              type="button"
              onPointerDown={() => { inputRef.current.right = true; }}
              onPointerUp={() => { inputRef.current.right = false; }}
              onPointerCancel={() => { inputRef.current.right = false; }}
              className="h-12 w-12 rounded bg-slate-800 shadow-sm transition hover:bg-slate-700 focus:outline-none focus:ring"
              aria-label="Move right"
            >
              →
            </button>
            <div />
          </div>
          <div className="text-xs text-slate-400">Tap the canvas or use the jump button to hop.</div>
        </div>
      )}
    </div>
  );
}
