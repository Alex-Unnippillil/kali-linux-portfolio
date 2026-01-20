import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import HelpOverlay from './HelpOverlay';
import usePersistedState from '../../hooks/usePersistedState';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';
import { TILE_SIZE, cameraDefaults, parseLevel, step, getPlayerSpawn } from '../../games/platformer/logic';

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

const BEST_TIME_PREFIX = 'platformer:best:';

function readBestTime(levelIndex) {
  try {
    const raw = window.localStorage.getItem(`${BEST_TIME_PREFIX}${levelIndex}`);
    const v = raw ? Number(raw) : NaN;
    return Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

function writeBestTime(levelIndex, seconds) {
  try {
    window.localStorage.setItem(`${BEST_TIME_PREFIX}${levelIndex}`, String(seconds));
  } catch {
    // ignore
  }
}

function createInitialState(levelIndex) {
  const levelDef = LEVELS[levelIndex % LEVELS.length];
  const parsed = parseLevel(levelDef.grid);
  const spawn = getPlayerSpawn(parsed, PLAYER_SIZE.w, PLAYER_SIZE.h);

  return {
    levelIndex: levelIndex % LEVELS.length,
    levelName: levelDef.name,
    state: {
      level: parsed,
      player: {
        x: spawn.x,
        y: spawn.y,
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

function isEditableTarget(target) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (target.isContentEditable) return true;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON';
}

function TouchButton({ label, onPress, onRelease, className = '', children }) {
  const handleDown = (e) => {
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    onPress();
  };

  const handleUp = (e) => {
    e.preventDefault();
    onRelease();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={
        'select-none touch-none px-4 py-3 rounded-lg bg-slate-800/70 border border-slate-700 active:bg-slate-700/80 focus:outline-none focus:ring-2 focus:ring-emerald-400 ' +
        className
      }
      onPointerDown={handleDown}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
      onPointerLeave={handleUp}
    >
      {children || label}
    </button>
  );
}

export default function PlatformerApp() {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);

  const requestRef = useRef(null);
  const lastTimeRef = useRef(0);
  const accumulatorRef = useRef(0);

  const pausedRef = useRef(false);
  const reduceMotionRef = useRef(false);

  const keyboardRef = useRef({ left: false, right: false, jumpHeld: false, jumpPressed: false, jumpReleased: false });
  const touchRef = useRef({ left: false, right: false, jumpHeld: false, jumpPressed: false, jumpReleased: false });
  const gamepadRef = useRef({ left: false, right: false, jumpHeld: false, jumpPressed: false, jumpReleased: false });
  const gamepadPrevJumpRef = useRef(false);

  const prevSnapshotRef = useRef(null);
  const uiUpdateRef = useRef(0);
  const lastEventRef = useRef({ coinsCollected: 0, deaths: 0, status: 'running', levelIndex: 0 });
  const lastDprRef = useRef(0);

  const [announcement, setAnnouncement] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);

  const [screenShakeEnabled, setScreenShakeEnabled] = usePersistedState('platformer:screenShake', true);
  const [showGrid, setShowGrid] = usePersistedState('platformer:showGrid', true);
  const [touchControls, setTouchControls] = usePersistedState('platformer:touchControls', 'auto');
  const [cameraFollowLerp, setCameraFollowLerp] = usePersistedState('platformer:cameraFollow', 0.12);

  const prefersReducedMotion = usePrefersReducedMotion();
  const [bestTime, setBestTime] = useState(null);

  const [ui, setUi] = useState({
    levelIndex: 0,
    level: LEVELS[0].name,
    time: 0,
    coins: { collected: 0, total: 0 },
    deaths: 0,
    status: 'running',
    paused: false,
  });

  const sessionRef = useRef(createInitialState(0));

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  useEffect(() => {
    reduceMotionRef.current = prefersReducedMotion;
  }, [prefersReducedMotion]);

  useEffect(() => {
    const parsed = Number(cameraFollowLerp);
    const base = Number.isFinite(parsed) ? parsed : 0.12;
    const effective = prefersReducedMotion ? Math.min(base, 0.08) : base;
    cameraDefaults.followLerp = clamp(effective, 0.04, 0.25);
  }, [cameraFollowLerp, prefersReducedMotion]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mq = window.matchMedia('(pointer: coarse)');
    const update = () => setIsCoarsePointer(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const showTouchUI = touchControls === 'on' || (touchControls === 'auto' && isCoarsePointer);

  const resizeCanvas = useMemo(
    () => () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const { level } = sessionRef.current.state;
      const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
      lastDprRef.current = dpr;

      canvas.width = level.width * TILE_SIZE * dpr;
      canvas.height = level.height * TILE_SIZE * dpr;
      canvas.style.width = '100%';
      canvas.style.height = '100%';

      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    },
    [],
  );

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

  const readGamepad = useCallback(() => {
    const input = gamepadRef.current;
    input.left = false;
    input.right = false;
    input.jumpPressed = false;
    input.jumpReleased = false;

    if (typeof navigator === 'undefined' || !navigator.getGamepads) {
      input.jumpHeld = false;
      gamepadPrevJumpRef.current = false;
      return;
    }

    const pad = navigator.getGamepads()[0];
    if (!pad) {
      input.jumpHeld = false;
      gamepadPrevJumpRef.current = false;
      return;
    }

    const axisX = pad.axes?.[0] ?? 0;
    const dpadLeft = Boolean(pad.buttons?.[14]?.pressed);
    const dpadRight = Boolean(pad.buttons?.[15]?.pressed);
    input.left = dpadLeft || axisX < -0.35;
    input.right = dpadRight || axisX > 0.35;

    const face = [0, 1, 2, 3, 12].some((i) => Boolean(pad.buttons?.[i]?.pressed));
    const prevJump = gamepadPrevJumpRef.current;
    if (face && !prevJump) input.jumpPressed = true;
    if (!face && prevJump) input.jumpReleased = true;
    input.jumpHeld = face;
    gamepadPrevJumpRef.current = face;
  }, []);

  const buildInput = useCallback(() => {
    const kb = keyboardRef.current;
    const touch = touchRef.current;
    const pad = gamepadRef.current;
    return {
      left: kb.left || touch.left || pad.left,
      right: kb.right || touch.right || pad.right,
      jumpHeld: kb.jumpHeld || touch.jumpHeld || pad.jumpHeld,
      jumpPressed: kb.jumpPressed || touch.jumpPressed || pad.jumpPressed,
      jumpReleased: kb.jumpReleased || touch.jumpReleased || pad.jumpReleased,
    };
  }, []);

  const clearEdgeInputs = useCallback(() => {
    keyboardRef.current.jumpPressed = false;
    keyboardRef.current.jumpReleased = false;
    touchRef.current.jumpPressed = false;
    touchRef.current.jumpReleased = false;
    gamepadRef.current.jumpPressed = false;
    gamepadRef.current.jumpReleased = false;
  }, []);

  const loadLevel = useCallback(
    (index, options = {}) => {
      const { keepDeaths = true } = options;
      const fresh = createInitialState(index);
      if (keepDeaths) fresh.state.deaths = sessionRef.current.state.deaths;

      sessionRef.current = fresh;
      prevSnapshotRef.current = snapshot(fresh.state);
      accumulatorRef.current = 0;
      lastTimeRef.current = 0;
      pausedRef.current = false;

      if (typeof window !== 'undefined') setBestTime(readBestTime(fresh.levelIndex));
      else setBestTime(null);

      setUi((prev) => ({
        ...prev,
        levelIndex: fresh.levelIndex,
        level: fresh.levelName,
        time: 0,
        coins: { collected: 0, total: fresh.state.level.coins },
        status: 'running',
        paused: false,
      }));

      setAnnouncement('');
      resizeCanvas();

      lastEventRef.current = {
        coinsCollected: 0,
        deaths: fresh.state.deaths,
        status: 'running',
        levelIndex: fresh.levelIndex,
      };
    },
    [resizeCanvas],
  );

  const restartLevel = useCallback(() => {
    loadLevel(sessionRef.current.levelIndex, { keepDeaths: true });
    setAnnouncement('Restarted level');
  }, [loadLevel]);

  const nextLevel = useCallback(() => {
    loadLevel((sessionRef.current.levelIndex + 1) % LEVELS.length, { keepDeaths: true });
    setAnnouncement('Next level');
  }, [loadLevel]);

  const setPaused = useCallback((value, reason) => {
    pausedRef.current = value;
    setUi((prev) => ({ ...prev, paused: value }));
    if (reason) setAnnouncement(reason);
  }, []);

  const togglePause = useCallback(() => {
    setPaused(!pausedRef.current, pausedRef.current ? 'Resumed' : 'Paused');
  }, [setPaused]);

  const draw = useCallback(
    (ctx, alpha) => {
      const current = sessionRef.current.state;
      const previous = prevSnapshotRef.current || current;
      const interp = (a, b) => a + (b - a) * alpha;

      const playerX = interp(previous.player.x, current.player.x);
      const playerY = interp(previous.player.y, current.player.y);
      const camX = interp(previous.camera.x, current.camera.x);
      const camY = interp(previous.camera.y, current.camera.y);

      const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
      const viewW = ctx.canvas.width / dpr;
      const viewH = ctx.canvas.height / dpr;

      const shakeFactor = current.shake.time > 0 ? current.shake.time / 0.2 : 0;
      const rawShake = current.shake.magnitude * shakeFactor;
      const shakeMag = reduceMotionRef.current || !screenShakeEnabled ? 0 : Math.max(0, rawShake);

      const shakeX = shakeMag ? (Math.random() - 0.5) * shakeMag : 0;
      const shakeY = shakeMag ? (Math.random() - 0.5) * shakeMag : 0;

      ctx.save();
      ctx.clearRect(0, 0, viewW, viewH);
      ctx.fillStyle = '#0c0f17';
      ctx.fillRect(0, 0, viewW, viewH);

      ctx.translate(-camX + viewW / 2, -camY + viewH / 2);
      ctx.translate(shakeX, shakeY);

      drawBackdrop(ctx, current.level, showGrid);
      drawTiles(ctx, current.level);
      drawPlatforms(ctx, current.level.platforms);
      drawPlayer(ctx, playerX, playerY, current.player.facing);

      ctx.restore();
    },
    [screenShakeEnabled, showGrid],
  );

  const syncUi = useCallback((timeMs) => {
    if (timeMs - uiUpdateRef.current < 120) return;
    const { state } = sessionRef.current;
    setUi((prev) => ({
      ...prev,
      levelIndex: sessionRef.current.levelIndex,
      level: sessionRef.current.levelName,
      time: state.time,
      coins: { collected: state.coinsCollected, total: state.level.coins },
      deaths: state.deaths,
      status: state.status,
      paused: pausedRef.current,
    }));
    uiUpdateRef.current = timeMs;
  }, []);

  const handleEvents = useCallback(() => {
    const s = sessionRef.current.state;
    const prev = lastEventRef.current;

    if (s.coinsCollected > prev.coinsCollected) setAnnouncement('Coin collected');
    if (s.deaths > prev.deaths) setAnnouncement(`Death ${s.deaths}`);

    if (s.status === 'complete' && prev.status !== 'complete') {
      const levelIndex = sessionRef.current.levelIndex;
      const currentTime = s.time;
      const best = typeof window !== 'undefined' ? readBestTime(levelIndex) : null;

      if (best === null || currentTime < best) {
        writeBestTime(levelIndex, currentTime);
        setBestTime(currentTime);
        setAnnouncement('Level complete. New best time!');
      } else {
        setBestTime(best);
        setAnnouncement('Level complete');
      }
    }

    lastEventRef.current = {
      coinsCollected: s.coinsCollected,
      deaths: s.deaths,
      status: s.status,
      levelIndex: sessionRef.current.levelIndex,
    };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') setBestTime(readBestTime(sessionRef.current.levelIndex));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    resizeCanvas();

    const handleResize = () => resizeCanvas();
    window.addEventListener('resize', handleResize);

    const handleVisibility = () => {
      if (document.hidden) setPaused(true, 'Paused (tab hidden)');
    };
    const handleBlur = () => setPaused(true, 'Paused');

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return undefined;

    const frame = (time) => {
      const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
      if (dpr && dpr !== lastDprRef.current) resizeCanvas();

      readGamepad();

      if (pausedRef.current) {
        lastTimeRef.current = time;
        draw(ctx, 1);
        syncUi(time);
        requestRef.current = requestAnimationFrame(frame);
        return;
      }

      if (!lastTimeRef.current) lastTimeRef.current = time;
      let delta = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;
      delta = Math.min(delta, 0.25);
      accumulatorRef.current += delta;

      while (accumulatorRef.current >= FIXED_DT) {
        const input = buildInput();
        prevSnapshotRef.current = snapshot(sessionRef.current.state);
        sessionRef.current.state = step(sessionRef.current.state, input, FIXED_DT);
        accumulatorRef.current -= FIXED_DT;
        clearEdgeInputs();
      }

      draw(ctx, accumulatorRef.current / FIXED_DT);
      handleEvents();
      syncUi(time);
      requestRef.current = requestAnimationFrame(frame);
    };

    requestRef.current = requestAnimationFrame(frame);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [buildInput, clearEdgeInputs, draw, handleEvents, readGamepad, resizeCanvas, setPaused, syncUi]);

  const handleKeyDown = useCallback(
    (e) => {
      if (isEditableTarget(e.target)) return;

      const code = e.code;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'Space'].includes(code)) e.preventDefault();
      if (e.repeat) return;

      if (code === 'KeyA' || code === 'ArrowLeft') keyboardRef.current.left = true;
      if (code === 'KeyD' || code === 'ArrowRight') keyboardRef.current.right = true;

      if (code === 'Space' || code === 'KeyW' || code === 'ArrowUp') {
        if (!keyboardRef.current.jumpHeld) keyboardRef.current.jumpPressed = true;
        keyboardRef.current.jumpHeld = true;
      }

      if (code === 'KeyR') restartLevel();
      if (code === 'KeyP' || code === 'Escape') togglePause();

      if (code === 'KeyH') {
        setPaused(true, 'Paused');
        setShowHelp((v) => !v);
      }

      if (code === 'Enter' && sessionRef.current.state.status === 'complete') nextLevel();
    },
    [nextLevel, restartLevel, togglePause, setPaused],
  );

  const handleKeyUp = useCallback((e) => {
    if (isEditableTarget(e.target)) return;
    const code = e.code;

    if (code === 'KeyA' || code === 'ArrowLeft') keyboardRef.current.left = false;
    if (code === 'KeyD' || code === 'ArrowRight') keyboardRef.current.right = false;

    if (code === 'Space' || code === 'KeyW' || code === 'ArrowUp') {
      if (keyboardRef.current.jumpHeld) keyboardRef.current.jumpReleased = true;
      keyboardRef.current.jumpHeld = false;
    }
  }, []);

  const selectLevel = useCallback(
    (e) => {
      const index = Number(e.target.value);
      if (!Number.isFinite(index)) return;
      loadLevel(index, { keepDeaths: true });
      setAnnouncement('Level selected');
    },
    [loadLevel],
  );

  const handleCaptureControls = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    try {
      el.focus();
    } catch {
      // ignore
    }
  }, []);

  const statusLabel = ui.status === 'complete' ? 'Complete' : ui.paused ? 'Paused' : 'Running';

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      className="relative w-full h-full flex flex-col bg-slate-950 text-slate-100 outline-none"
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
    >
      <div className="flex items-center gap-3 px-3 py-2 text-xs bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2 min-w-0">
          <div className="font-semibold truncate">{ui.level}</div>
          <select
            aria-label="Select level"
            value={ui.levelIndex}
            onChange={selectLevel}
            className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            {LEVELS.map((lvl, i) => (
              <option key={lvl.name} value={i}>
                {i + 1}. {lvl.name}
              </option>
            ))}
          </select>
        </div>

        <div className="hidden sm:flex items-center gap-3 text-slate-200">
          <div>Time: {formatTime(ui.time)}</div>
          <div>Best: {bestTime == null ? '--:--.---' : formatTime(bestTime)}</div>
          <div>
            Coins: {ui.coins.collected}/{ui.coins.total}
          </div>
          <div>Deaths: {ui.deaths}</div>
          <div>Status: {statusLabel}</div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={restartLevel}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            aria-label="Restart level"
          >
            Restart
          </button>
          <button
            type="button"
            onClick={togglePause}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            aria-label={ui.paused ? 'Resume' : 'Pause'}
          >
            {ui.paused ? 'Resume' : 'Pause'}
          </button>
          {ui.status === 'complete' && (
            <button
              type="button"
              onClick={nextLevel}
              className="px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-300"
              aria-label="Next level"
            >
              Next
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setPaused(true, 'Paused');
              setShowHelp(true);
            }}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            aria-label="Help"
          >
            ?
          </button>
          <button
            type="button"
            onClick={() => {
              setPaused(true, 'Paused');
              setShowSettings(true);
            }}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            aria-label="Settings"
          >
            ⚙
          </button>
        </div>
      </div>

      <div className="flex-1 grid place-items-center p-2" onPointerDown={handleCaptureControls}>
        <div
          className="relative w-full h-full max-w-5xl max-h-[70vh] bg-slate-900 border border-slate-800 rounded overflow-hidden"
          style={{
            aspectRatio: `${sessionRef.current.state.level.width * TILE_SIZE} / ${sessionRef.current.state.level.height * TILE_SIZE}`,
          }}
        >
          <canvas
            ref={canvasRef}
            className="w-full h-full select-none"
            style={{ imageRendering: 'pixelated' }}
            aria-label="Platformer game canvas"
            role="img"
          />

          {ui.paused && (
            <div className="absolute inset-0 bg-black/40 pointer-events-none flex items-center justify-center">
              <div className="px-4 py-2 rounded bg-slate-950/80 border border-slate-700 text-sm">Paused</div>
            </div>
          )}

          {ui.status === 'complete' && !ui.paused && (
            <div className="absolute inset-0 bg-black/30 pointer-events-none flex items-center justify-center">
              <div className="px-4 py-2 rounded bg-slate-950/80 border border-emerald-700 text-sm">
                Level complete. Press Enter or click Next.
              </div>
            </div>
          )}

          <div className="absolute bottom-2 left-2 text-[10px] text-slate-200 bg-slate-950/70 px-2 py-1 rounded border border-slate-700">
            Controls: A/← + D/→ to move · W/↑/Space to jump · R restart · P/Esc pause · H help
          </div>

          {showTouchUI && (
            <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3">
              <div className="flex gap-2 pointer-events-auto">
                <TouchButton
                  label="Move left"
                  onPress={() => {
                    touchRef.current.left = true;
                  }}
                  onRelease={() => {
                    touchRef.current.left = false;
                  }}
                >
                  ←
                </TouchButton>
                <TouchButton
                  label="Move right"
                  onPress={() => {
                    touchRef.current.right = true;
                  }}
                  onRelease={() => {
                    touchRef.current.right = false;
                  }}
                >
                  →
                </TouchButton>
              </div>

              <div className="flex gap-2 pointer-events-auto">
                <TouchButton
                  label="Jump"
                  className="px-6"
                  onPress={() => {
                    if (!touchRef.current.jumpHeld) touchRef.current.jumpPressed = true;
                    touchRef.current.jumpHeld = true;
                  }}
                  onRelease={() => {
                    if (touchRef.current.jumpHeld) touchRef.current.jumpReleased = true;
                    touchRef.current.jumpHeld = false;
                  }}
                >
                  Jump
                </TouchButton>
              </div>
            </div>
          )}

          {showHelp && <HelpOverlay gameId="platformer" onClose={() => setShowHelp(false)} />}

          {showSettings && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-40" role="dialog" aria-modal="true">
              <div className="w-[min(520px,92vw)] rounded-lg bg-slate-900 border border-slate-700 p-4 text-sm">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="font-semibold text-slate-100">Platformer Settings</div>
                  <button
                    type="button"
                    onClick={() => setShowSettings(false)}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    aria-label="Close settings"
                  >
                    Close
                  </button>
                </div>

                <div className="grid gap-3">
                  <label className="flex items-center justify-between gap-3">
                    <span>Screen shake</span>
                    <input
                      type="checkbox"
                      checked={Boolean(screenShakeEnabled)}
                      onChange={(e) => setScreenShakeEnabled(e.target.checked)}
                    />
                  </label>

                  <label className="flex items-center justify-between gap-3">
                    <span>Backdrop grid</span>
                    <input type="checkbox" checked={Boolean(showGrid)} onChange={(e) => setShowGrid(e.target.checked)} />
                  </label>

                  <label className="flex items-center justify-between gap-3">
                    <span>Touch controls</span>
                    <select
                      value={touchControls}
                      onChange={(e) => setTouchControls(e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded px-2 py-1"
                    >
                      <option value="auto">Auto</option>
                      <option value="on">On</option>
                      <option value="off">Off</option>
                    </select>
                  </label>

                  <label className="grid gap-1">
                    <span>Camera smoothing</span>
                    <input
                      type="range"
                      min="0.04"
                      max="0.25"
                      step="0.01"
                      value={Number(cameraFollowLerp) || 0.12}
                      onChange={(e) => setCameraFollowLerp(Number(e.target.value))}
                    />
                    <div className="text-xs text-slate-300">{Number(cameraFollowLerp).toFixed(2)}</div>
                  </label>

                  <div className="text-xs text-slate-300">Tip: On desktop, click the game area to capture controls.</div>
                </div>
              </div>
            </div>
          )}

          <div className="sr-only" aria-live="polite">
            {announcement}
          </div>
        </div>
      </div>
    </div>
  );
}

function drawBackdrop(ctx, level, showGrid) {
  ctx.save();
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, level.width * TILE_SIZE, level.height * TILE_SIZE);

  if (showGrid) {
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
  }

  ctx.restore();
}

function drawTiles(ctx, level) {
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
}

function drawPlatforms(ctx, platforms) {
  ctx.fillStyle = '#6b7280';
  platforms.forEach((p) => {
    ctx.fillRect(p.x, p.y, p.width, p.height);
    ctx.strokeStyle = '#111827';
    ctx.strokeRect(p.x, p.y, p.width, p.height);
  });
}

function drawPlayer(ctx, x, y, facing) {
  ctx.fillStyle = '#e5e7eb';
  ctx.fillRect(x, y, PLAYER_SIZE.w, PLAYER_SIZE.h);
  ctx.fillStyle = '#111827';
  const eyeX = facing === 1 ? x + PLAYER_SIZE.w - 6 : x + 2;
  ctx.fillRect(eyeX, y + 8, 4, 4);
}
