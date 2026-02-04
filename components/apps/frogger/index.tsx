import React, { useState, useEffect, useRef, useCallback } from 'react';
import { logEvent } from '../../../utils/analytics';
import { vibrate } from '../Games/common/haptics';
import {
  generateLaneConfig,
  SKINS,
  SKIN_GROUPS,
  getRandomSkin,
} from '../../../apps/games/frogger/config';
import type { SkinGroup, SkinName } from '../../../apps/games/frogger/config';
import { getLevelConfig } from '../../../apps/games/frogger/levels';
import useCanvasResize from '../../../hooks/useCanvasResize';
import {
  clampDelta,
  handlePads,
  initLane,
  updateCars,
  updateLogs,
} from './engine';
import { renderFroggerFrame } from './render';
import {
  CELL_SIZE,
  FROG_HOP_DURATION,
  GRID_HEIGHT,
  GRID_WIDTH,
  PAD_POSITIONS,
  RIPPLE_DURATION,
} from './types';
import type {
  Difficulty,
  FrogPosition,
  FroggerAnimationState,
  FroggerSplash,
  LaneState,
} from './types';

const TIME_PER_DIFF: Record<Difficulty, number> = {
  easy: 72,
  normal: 60,
  hard: 50,
};
const MIN_LEVEL_TIME = 25;
const DEFAULT_COLOR_MODE = 'vibrant';
const DIFFICULTY_MULTIPLIERS: Record<Difficulty, number> = {
  easy: 0.8,
  normal: 1,
  hard: 1.2,
};

const initialFrog: FrogPosition = { x: Math.floor(GRID_WIDTH / 2), y: GRID_HEIGHT - 1 };

const getLevelTime = (diff: Difficulty, lvl: number) =>
  Math.max(MIN_LEVEL_TIME, TIME_PER_DIFF[diff] - (lvl - 1) * 2);

const buildLaneState = (level: number, diff: Difficulty) => {
  const mult = DIFFICULTY_MULTIPLIERS[diff];
  const base = getLevelConfig(level);
  const lanes = generateLaneConfig(level, mult, base);
  return {
    cars: lanes.cars.map((lane, index) => initLane(lane, index + 1)),
    logs: lanes.logs.map((lane, index) => initLane(lane, index + 101)),
  };
};

const Frogger = () => {
  const initialTime = getLevelTime('normal', 1);
  const initialLanes = buildLaneState(1, 'normal');
  const canvasRef = useCanvasResize(
    GRID_WIDTH * CELL_SIZE,
    GRID_HEIGHT * CELL_SIZE,
  );

  const frogRef = useRef<FrogPosition>({ ...initialFrog });
  const carsRef = useRef<LaneState[]>(initialLanes.cars);
  const logsRef = useRef<LaneState[]>(initialLanes.logs);
  const padsRef = useRef<boolean[]>(PAD_POSITIONS.map(() => false));
  const [pads, setPads] = useState<boolean[]>(PAD_POSITIONS.map(() => false));
  const [status, setStatus] = useState('');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(paused);
  const [sound, setSound] = useState(true);
  const soundRef = useRef(sound);
  const [highScore, setHighScore] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const reduceMotionRef = useRef(reduceMotion);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextLife = useRef(500);
  const holdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rippleRef = useRef(0);
  const splashesRef = useRef<FroggerSplash[]>([]);
  const [slowTime, setSlowTime] = useState(false);
  const slowTimeRef = useRef(slowTime);
  const [colorMode, setColorMode] = useState<SkinGroup>(
    DEFAULT_COLOR_MODE as SkinGroup,
  );
  const [skin, setSkin] = useState<SkinName>(() =>
    getRandomSkin(DEFAULT_COLOR_MODE as SkinGroup),
  );
  const [showHitboxes, setShowHitboxes] = useState(false);
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [goals, setGoals] = useState(0);
  const deathStreakRef = useRef(0);
  const safeFlashRef = useRef(0);
  const livesRef = useRef(lives);
  const levelRef = useRef(level);
  const statusRef = useRef(status);
  const hitFlashRef = useRef(0);
  const pendingDeathRef = useRef<FrogPosition | null>(null);
  const gradientCacheRef = useRef<Record<string, CanvasGradient>>({});
  const frogAnimationRef = useRef<FroggerAnimationState>({
    start: { ...initialFrog },
    end: { ...initialFrog },
    progress: 1,
  });
  const lightingRef = useRef(0);
  const timeRef = useRef(initialTime);
  const lastTimerBroadcastRef = useRef(initialTime);

  useEffect(() => {
    padsRef.current = pads;
    setGoals(pads.filter(Boolean).length);
  }, [pads]);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);
  useEffect(() => {
    soundRef.current = sound;
  }, [sound]);
  useEffect(() => {
    reduceMotionRef.current = reduceMotion;
  }, [reduceMotion]);
  useEffect(() => {
    slowTimeRef.current = slowTime;
  }, [slowTime]);
  useEffect(() => {
    livesRef.current = lives;
  }, [lives]);
  useEffect(() => {
    levelRef.current = level;
  }, [level]);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);
  useEffect(() => {
    timeRef.current = timeLeft;
    lastTimerBroadcastRef.current = timeLeft;
  }, [timeLeft]);
  useEffect(() => {
    gradientCacheRef.current = {};
  }, [skin]);
  useEffect(() => {
    const available = SKIN_GROUPS[colorMode];
    if (available && !available.includes(skin)) {
      setSkin(available[0]);
    }
  }, [colorMode, skin]);

  useEffect(() => {
    const saved = Number(localStorage.getItem('frogger-highscore') || 0);
    setHighScore(saved);
  }, []);
  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      try {
        localStorage.setItem('frogger-highscore', String(score));
      } catch {
        /* ignore */
      }
    }
  }, [score, highScore]);

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = () => setReduceMotion(mql.matches);
    handler();
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const playTone = useCallback((freq: number, duration = 0.1) => {
    if (!soundRef.current) return;
    if (!audioCtxRef.current) {
      const AudioConstructor =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioConstructor) return;
      audioCtxRef.current = new AudioConstructor();
    }
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }, []);

  const syncTimer = useCallback((diff: Difficulty, lvl: number) => {
    const nextTime = getLevelTime(diff, lvl);
    timeRef.current = nextTime;
    lastTimerBroadcastRef.current = nextTime;
    setTimeLeft(nextTime);
  }, []);

  const alignFrogToStart = useCallback(() => {
    frogRef.current = { ...initialFrog };
    frogAnimationRef.current = {
      start: { ...initialFrog },
      end: { ...initialFrog },
      progress: 1,
    };
  }, []);

  const moveFrog = useCallback(
    (dx: number, dy: number) => {
      if (pausedRef.current) return;
      const prev = frogRef.current;
      const x = prev.x + dx;
      const y = prev.y + dy;
      if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) return;
      const next = { x, y };
      frogRef.current = next;
      if (!reduceMotionRef.current) {
        frogAnimationRef.current = {
          start: { ...prev },
          end: next,
          progress: 0,
        };
      } else {
        frogAnimationRef.current = {
          start: next,
          end: next,
          progress: 1,
        };
      }
      vibrate(50);
      if (dy === -1) setScore((s) => s + 10);
      playTone(440, 0.05);
    },
    [playTone],
  );

  const startHold = useCallback(
    (dx: number, dy: number) => {
      moveFrog(dx, dy);
      holdRef.current = setInterval(() => moveFrog(dx, dy), 220);
    },
    [moveFrog],
  );

  const endHold = useCallback(() => {
    if (holdRef.current) clearInterval(holdRef.current);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') moveFrog(-1, 0);
      else if (e.key === 'ArrowRight') moveFrog(1, 0);
      else if (e.key === 'ArrowUp') moveFrog(0, -1);
      else if (e.key === 'ArrowDown') moveFrog(0, 1);
      else if (e.key === 'p' || e.key === 'P') setPaused((p) => !p);
      else if (e.key === 'm' || e.key === 'M') setSound((s) => !s);
      else if (e.key === 't' || e.key === 'T') setSlowTime((s) => !s);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [moveFrog]);

  useEffect(() => {
    const container = document.getElementById('frogger-container');
    let startX = 0;
    let startY = 0;
    const handleStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };
    const handleEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 30) moveFrog(1, 0);
        else if (dx < -30) moveFrog(-1, 0);
      } else {
        if (dy > 30) moveFrog(0, 1);
        else if (dy < -30) moveFrog(0, -1);
      }
    };
    container?.addEventListener('touchstart', handleStart);
    container?.addEventListener('touchend', handleEnd);
    return () => {
      container?.removeEventListener('touchstart', handleStart);
      container?.removeEventListener('touchend', handleEnd);
    };
  }, [moveFrog]);

  useEffect(() => {
    logEvent({ category: 'Frogger', action: 'level_start', value: 1 });
  }, []);

  const reset = useCallback(
    (full = false, diff: Difficulty = difficulty, lvl: number = level) => {
      alignFrogToStart();
      frogRef.current = { ...initialFrog };
      const lanes = buildLaneState(lvl, diff);
      carsRef.current = lanes.cars;
      logsRef.current = lanes.logs;
      setStatus('');
      const targetLevel = full ? 1 : lvl;
      syncTimer(diff, targetLevel);
      if (full) {
        setScore(0);
        setLives(3);
        setPads(PAD_POSITIONS.map(() => false));
        setLevel(1);
        setGoals(0);
        setSkin(getRandomSkin(colorMode));
        nextLife.current = 500;
        deathStreakRef.current = 0;
        logEvent({
          category: 'Frogger',
          action: 'level_start',
          value: 1,
        });
      }
    },
    [alignFrogToStart, colorMode, difficulty, level, syncTimer],
  );

  const loseLife = useCallback(
    (pos?: FrogPosition | null) => {
      if (pos && pos.y <= 2) {
        splashesRef.current.push({
          x: (Math.floor(pos.x) + 0.5) * CELL_SIZE,
          y: (pos.y + 0.5) * CELL_SIZE,
          t: 0,
        });
      }
      deathStreakRef.current += 1;
      if (deathStreakRef.current >= 2) safeFlashRef.current = 2;
      logEvent({ category: 'Frogger', action: 'death', value: levelRef.current });
      playTone(220, 0.2);
      setLives((l) => {
        const newLives = l - 1;
        if (newLives <= 0) {
          setStatus('Game Over');
          setTimeout(() => reset(true), 1000);
          return 0;
        }
        reset();
        return newLives;
      });
    },
    [playTone, reset],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    let last = performance.now();
    let raf = 0;
    const loop = (time: number) => {
      const rawDt = (time - last) / 1000;
      last = time;
      const dt = clampDelta(rawDt, 0.25) * (slowTimeRef.current ? 0.7 : 1);
      const rippleSpeed = reduceMotionRef.current ? 1.6 : 4;
      rippleRef.current += dt * rippleSpeed;
      lightingRef.current = (lightingRef.current + dt * 0.6) % (Math.PI * 2);
      if (frogAnimationRef.current.progress < 1) {
        const hopDuration = reduceMotionRef.current
          ? FROG_HOP_DURATION * 0.6
          : FROG_HOP_DURATION;
        frogAnimationRef.current.progress = Math.min(
          1,
          frogAnimationRef.current.progress + dt / hopDuration,
        );
      }
      if (!pausedRef.current) {
        const nextTime = Math.max(0, timeRef.current - dt);
        if (nextTime !== timeRef.current) {
          timeRef.current = nextTime;
          if (Math.floor(nextTime) !== Math.floor(lastTimerBroadcastRef.current)) {
            lastTimerBroadcastRef.current = nextTime;
            setTimeLeft(nextTime);
          }
        }
        if (nextTime <= 0 && !pendingDeathRef.current && livesRef.current > 0) {
          hitFlashRef.current = 0.2;
          pendingDeathRef.current = { ...frogRef.current };
        }
      }
      if (safeFlashRef.current > 0) safeFlashRef.current -= dt;
      if (hitFlashRef.current > 0) hitFlashRef.current -= dt;
      splashesRef.current = splashesRef.current
        .map((s) => ({ ...s, t: s.t + dt }))
        .filter((s) => s.t < RIPPLE_DURATION);

      if (pendingDeathRef.current) {
        if (hitFlashRef.current <= 0) {
          loseLife(pendingDeathRef.current);
          alignFrogToStart();
          pendingDeathRef.current = null;
        }
      } else {
        const carResult = updateCars(carsRef.current, frogRef.current, dt);
        carsRef.current = carResult.lanes;
        const logResult = updateLogs(logsRef.current, frogRef.current, dt);
        logsRef.current = logResult.lanes;
        frogRef.current = logResult.frog;
        if (carResult.dead) {
          hitFlashRef.current = 0.2;
          pendingDeathRef.current = { ...frogRef.current };
        } else if (
          logResult.dead ||
          frogRef.current.x < 0 ||
          frogRef.current.x >= GRID_WIDTH
        ) {
          loseLife(frogRef.current);
          alignFrogToStart();
        } else {
          const padResult = handlePads(frogRef.current, padsRef.current);
          padsRef.current = padResult.pads;
          if (padResult.dead) {
            loseLife(frogRef.current);
            alignFrogToStart();
          } else if (padResult.levelComplete) {
            setStatus('Level Complete!');
            setScore((s) => s + 100);
            playTone(880, 0.2);
            logEvent({
              category: 'Frogger',
              action: 'level_complete',
              value: levelRef.current,
            });
            const newLevel = levelRef.current + 1;
            setLevel(newLevel);
            logEvent({
              category: 'Frogger',
              action: 'level_start',
              value: newLevel,
            });
            setPads(PAD_POSITIONS.map(() => false));
            reset(false, difficulty, newLevel);
            deathStreakRef.current = 0;
            alignFrogToStart();
          } else if (padResult.padHit) {
            setScore((s) => s + 100);
            setPads([...padsRef.current]);
            playTone(660, 0.1);
            deathStreakRef.current = 0;
            alignFrogToStart();
          }
        }
      }

      renderFroggerFrame(
        ctx,
        {
          frog: frogRef.current,
          cars: carsRef.current,
          logs: logsRef.current,
          pads: padsRef.current,
        },
        {
          ripple: rippleRef.current,
          lighting: lightingRef.current,
          splashes: splashesRef.current,
          safeFlash: safeFlashRef.current,
          hitFlash: hitFlashRef.current,
          frogAnimation: frogAnimationRef.current,
        },
        {
          colors: SKINS[skin],
          reduceMotion: reduceMotionRef.current,
          showHitboxes,
          paused: pausedRef.current,
          status: statusRef.current,
          timeLeft: timeRef.current,
          gradientCache: gradientCacheRef.current,
        },
      );

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [
    alignFrogToStart,
    canvasRef,
    difficulty,
    loseLife,
    playTone,
    reset,
    showHitboxes,
    skin,
  ]);

  useEffect(() => {
    if (score >= nextLife.current) {
      setLives((l) => l + 1);
      nextLife.current += 500;
    }
  }, [score]);

  const mobileControls = [
    null,
    { dx: 0, dy: -1, label: '↑' },
    null,
    { dx: -1, dy: 0, label: '←' },
    null,
    { dx: 1, dy: 0, label: '→' },
    null,
    { dx: 0, dy: 1, label: '↓' },
    null,
  ];

  const activeColors = SKINS[skin];
  const hudBg = activeColors.hudBg || 'rgba(15,23,42,0.85)';
  const hudText = activeColors.hudText || '#e2e8f0';
  const accentColor = activeColors.hudAccent || '#38bdf8';
  const labelColor = 'rgba(226,232,240,0.75)';
  const timerMax = getLevelTime(difficulty, level);
  const liveTime = timeRef.current;
  const timerSeconds = Math.max(0, Math.ceil(timeLeft));
  const timerColor = timerSeconds <= 10 ? '#fca5a5' : hudText;
  const timerProgress = timerMax
    ? Math.max(0, Math.min(1, liveTime / timerMax))
    : 0;
  const availableSkinList =
    SKIN_GROUPS[colorMode] && SKIN_GROUPS[colorMode].length
      ? SKIN_GROUPS[colorMode]
      : Object.keys(SKINS);
  const displayDifficulty = `${difficulty.charAt(0).toUpperCase()}${difficulty.slice(1)}`;
  const displaySkin = `${skin.charAt(0).toUpperCase()}${skin.slice(1)}`;
  const buttonClasses =
    'px-3 py-1.5 rounded-lg border border-slate-600/60 bg-slate-800/70 text-sm font-medium shadow hover:bg-slate-700/70 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-300 focus:ring-offset-slate-900 transition-colors';
  const selectClasses =
    'px-3 py-1.5 rounded-lg border border-slate-600/60 bg-slate-900/70 text-sm shadow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-300 focus:ring-offset-slate-900';

  const primaryStats = [
    { label: 'Lives', value: lives, color: hudText },
    {
      label: 'Goals',
      value: `${goals}/${PAD_POSITIONS.length}`,
      color: goals === PAD_POSITIONS.length ? accentColor : hudText,
    },
    {
      label: 'Timer',
      value: `${timerSeconds}s`,
      color: timerColor,
      progress: timerProgress,
    },
    { label: 'Level', value: level, color: hudText },
  ];
  const secondaryStats = [
    { label: 'Score', value: score, color: hudText },
    { label: 'High Score', value: highScore, color: hudText },
    { label: 'Difficulty', value: displayDifficulty, color: accentColor },
    { label: 'Skin', value: displaySkin, color: accentColor },
  ];

  return (
    <div
      id="frogger-container"
      className="h-full w-full overflow-auto bg-ub-cool-grey text-white"
    >
      <div className="mx-auto flex h-full w-full max-w-4xl flex-col items-center gap-5 px-4 py-6">
        <div className="w-full">
          <div className="relative overflow-hidden rounded-2xl border border-slate-700/70 bg-black/50 shadow-2xl">
            <canvas
              ref={canvasRef}
              width={GRID_WIDTH * CELL_SIZE}
              height={GRID_HEIGHT * CELL_SIZE}
              className="block h-full w-full"
              role="img"
              aria-label="Frogger playfield"
            />
            <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-black/40" />
          </div>
        </div>

        <div className="w-full space-y-3 text-sm">
          <div
            className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-700/60 p-3 shadow-lg backdrop-blur sm:grid-cols-4"
            style={{ background: hudBg }}
          >
            {primaryStats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg border border-slate-600/40 bg-black/30 px-3 py-2 text-center shadow-sm"
              >
                <p
                  className="text-[0.65rem] uppercase tracking-wide"
                  style={{ color: labelColor }}
                >
                  {stat.label}
                </p>
                <p className="text-lg font-semibold" style={{ color: stat.color }}>
                  {stat.value}
                </p>
                {stat.label === 'Timer' && (
                  <div
                    className="mt-1 h-1.5 w-full rounded-full bg-slate-700/60"
                    aria-hidden="true"
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        background: accentColor,
                        width: `${Math.max(
                          5,
                          Math.min(100, (stat.progress ?? 0) * 100),
                        )}%`,
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div
            className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-700/60 p-3 shadow-lg backdrop-blur sm:grid-cols-4"
            style={{ background: hudBg }}
          >
            {secondaryStats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg border border-slate-600/40 bg-black/30 px-3 py-2 text-center shadow-sm"
              >
                <p
                  className="text-[0.65rem] uppercase tracking-wide"
                  style={{ color: labelColor }}
                >
                  {stat.label}
                </p>
                <p className="text-lg font-semibold" style={{ color: stat.color }}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div
          className="w-full rounded-2xl border border-slate-700/60 p-4 shadow-lg backdrop-blur"
          style={{ background: hudBg, color: hudText }}
        >
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              className={buttonClasses}
            >
              {paused ? 'Resume' : 'Pause'}
            </button>
            <button
              type="button"
              onClick={() => setSound((s) => !s)}
              className={buttonClasses}
            >
              Sound: {sound ? 'On' : 'Off'}
            </button>
            <button
              type="button"
              onClick={() => setSlowTime((s) => !s)}
              className={buttonClasses}
            >
              Time: {slowTime ? 'Slow' : 'Normal'}
            </button>
            <button
              type="button"
              onClick={() => setShowHitboxes((h) => !h)}
              className={buttonClasses}
            >
              Hitboxes: {showHitboxes ? 'On' : 'Off'}
            </button>
            <label
              htmlFor="frogger-difficulty"
              className="flex flex-col text-left text-xs uppercase tracking-wide"
              style={{ color: labelColor }}
            >
              <span>Difficulty</span>
              <select
                id="frogger-difficulty"
                className={`${selectClasses} mt-1`}
                style={{ color: hudText }}
                value={difficulty}
                onChange={(e) => {
                  const diff = e.target.value as Difficulty;
                  setDifficulty(diff);
                  reset(true, diff);
                }}
              >
                <option value="easy">Easy</option>
                <option value="normal">Normal</option>
                <option value="hard">Hard</option>
              </select>
            </label>
            <label
              htmlFor="frogger-color-mode"
              className="flex flex-col text-left text-xs uppercase tracking-wide"
              style={{ color: labelColor }}
            >
              <span>Palette Mode</span>
              <select
                id="frogger-color-mode"
                className={`${selectClasses} mt-1`}
                style={{ color: hudText }}
                value={colorMode}
                onChange={(e) => {
                  const mode = e.target.value as SkinGroup;
                  setColorMode(mode);
                }}
              >
                <option value="vibrant">Vibrant</option>
                <option value="accessible">Accessible</option>
              </select>
            </label>
            <label
              htmlFor="frogger-skin"
              className="flex flex-col text-left text-xs uppercase tracking-wide"
              style={{ color: labelColor }}
            >
              <span>Palette</span>
              <select
                id="frogger-skin"
                className={`${selectClasses} mt-1`}
                style={{ color: hudText }}
                value={skin}
                onChange={(e) => setSkin(e.target.value as SkinName)}
              >
                {availableSkinList.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div
          className="w-full rounded-2xl border border-slate-700/60 px-4 py-3 text-center text-sm shadow-lg backdrop-blur"
          role="status"
          aria-live="polite"
          style={{ background: hudBg, color: hudText }}
        >
          {status || 'Hop across the river and claim each glowing pad!'}
        </div>

        <div className="grid w-full grid-cols-3 gap-2 sm:hidden">
          {mobileControls.map((control, index) =>
            control ? (
              <button
                key={`${control.label}-${index}`}
                className="flex h-14 w-14 items-center justify-center rounded-xl border border-slate-700/60 bg-slate-800/70 text-lg font-semibold shadow focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2 focus:ring-offset-slate-900"
                style={{ color: hudText }}
                onTouchStart={() => startHold(control.dx, control.dy)}
                onTouchEnd={endHold}
                onMouseDown={() => startHold(control.dx, control.dy)}
                onMouseUp={endHold}
                onMouseLeave={endHold}
              >
                {control.label}
              </button>
            ) : (
              <div key={`spacer-${index}`} className="h-14 w-14" />
            ),
          )}
        </div>
      </div>
    </div>
  );
};

export default Frogger;

export { makeRng, initLane, updateCars, updateLogs, handlePads } from './engine';
export { PAD_POSITIONS } from './types';
export { carLaneDefs, logLaneDefs, rampLane } from '../../../apps/games/frogger/config';
export { clampDelta } from './engine';
