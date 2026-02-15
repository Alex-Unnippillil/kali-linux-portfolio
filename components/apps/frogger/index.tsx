import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import GameLayout, { useInputRecorder } from '../GameLayout';
import useCanvasResize from '../../../hooks/useCanvasResize';
import usePersistentState from '../../../hooks/usePersistentState';
import usePrefersReducedMotion from '../../../hooks/usePrefersReducedMotion';
import {
  generateLaneConfig,
  getRandomSkin,
  RULESETS,
  SKINS,
  SKIN_GROUPS,
} from '../../../apps/games/frogger/config';
import type { SkinGroup, SkinName } from '../../../apps/games/frogger/config';
import { getLevelConfig } from '../../../apps/games/frogger/levels';
import {
  applyForwardProgressScore,
  clampDelta,
  createHomes,
  handlePads,
  initLane,
  makeRng,
  resolveHomeEntry,
  tickHomeHazards,
  tickTimer,
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
  START_ROW,
} from './types';
import type { DeathCause, Difficulty, FrogPosition, HomeBayState, LaneState } from './types';
import { consumeGameKey, shouldHandleGameKey } from '../../../utils/gameInput';

const TIME_PER_DIFF: Record<Difficulty, number> = { easy: 78, normal: 60, hard: 50 };
const MIN_LEVEL_TIME = 25;
const initialFrog = { x: Math.floor(GRID_WIDTH / 2), y: START_ROW };
const EXTRA_LIFE_SCORE = 20000;
const DEFAULT_RULESET = 'classic';

interface FroggerProps {
  windowMeta?: { isFocused?: boolean };
}

const isDifficulty = (v: unknown): v is Difficulty => v === 'easy' || v === 'normal' || v === 'hard';
const isSkinGroup = (v: unknown): v is SkinGroup => v === 'vibrant' || v === 'accessible';
const isSkinName = (v: unknown): v is SkinName => typeof v === 'string' && v in SKINS;
const isBoolean = (v: unknown): v is boolean => typeof v === 'boolean';
const isRuleset = (v: unknown): v is 'classic' | 'compact' => v === 'classic' || v === 'compact';

const getLevelTime = (diff: Difficulty, lvl: number) => Math.max(MIN_LEVEL_TIME, TIME_PER_DIFF[diff] - (lvl - 1) * 2);

const buildLanes = (level: number, difficulty: Difficulty): { cars: LaneState[]; logs: LaneState[] } => {
  const diffMult = difficulty === 'easy' ? 0.88 : difficulty === 'hard' ? 1.16 : 1;
  const config = generateLaneConfig(level, diffMult, getLevelConfig(level));
  return {
    cars: config.cars.map((lane, i) => initLane(lane, level * 100 + i + 1)),
    logs: config.logs.map((lane, i) => initLane(lane, level * 100 + i + 101)),
  };
};

const deathMessage: Record<DeathCause, string> = {
  vehicle: 'SPLAT! Vehicle impact.',
  drown: 'You drowned! Ride a floater.',
  timeout: 'Out of time!',
  offscreen: 'Swept off-screen by current.',
  occupied_home: 'That home is already occupied.',
  invalid_home: 'You landed in shrubbery.',
  gator_home: 'Gator head in the home bay!',
  gator_mouth: 'Snapped by a gator mouth.',
  turtle_dive: 'Turtles submerged beneath you.',
};

const Frogger = ({ windowMeta }: FroggerProps = {}) => {
  const isFocused = windowMeta?.isFocused ?? true;
  const canvasRef = useCanvasResize(GRID_WIDTH * CELL_SIZE, GRID_HEIGHT * CELL_SIZE);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { record, registerReplay } = useInputRecorder();

  const [difficulty, setDifficulty] = usePersistentState<Difficulty>('frogger:difficulty', 'normal', isDifficulty);
  const [ruleset, setRuleset] = usePersistentState<'classic' | 'compact'>('frogger:ruleset', DEFAULT_RULESET, isRuleset);
  const [soundEnabled, setSoundEnabled] = usePersistentState<boolean>('frogger:sound', true, isBoolean);
  const [showHitboxes, setShowHitboxes] = usePersistentState<boolean>('frogger:hitboxes', false, isBoolean);
  const [colorMode, setColorMode] = usePersistentState<SkinGroup>('frogger:colorMode', 'vibrant', isSkinGroup);
  const [skin, setSkin] = usePersistentState<SkinName>('frogger:skin', () => getRandomSkin('vibrant'), isSkinName);

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [timeLeft, setTimeLeft] = useState(getLevelTime('normal', 1));
  const [status, setStatus] = useState('Press any Arrow key or WASD to start.');
  const [paused, setPaused] = useState(false);
  const [started, setStarted] = useState(false);
  const [homes, setHomes] = useState<HomeBayState[]>(createHomes());

  const frogRef = useRef<FrogPosition>({ ...initialFrog });
  const carsRef = useRef<LaneState[]>(buildLanes(1, 'normal').cars);
  const logsRef = useRef<LaneState[]>(buildLanes(1, 'normal').logs);
  const homesRef = useRef<HomeBayState[]>(createHomes());
  const frogAnimationRef = useRef({ start: { ...initialFrog }, end: { ...initialFrog }, progress: 1 });
  const queuedMoveRef = useRef<{ dx: number; dy: number } | null>(null);
  const bestYRef = useRef(START_ROW);
  const rngRef = useRef(makeRng(1234));
  const lastTimerBroadcastRef = useRef(timeLeft);
  const hitFlashRef = useRef(0);
  const splashesRef = useRef<{ x: number; y: number; t: number }[]>([]);
  const nextLifeRef = useRef(EXTRA_LIFE_SCORE);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioFailedRef = useRef(false);
  const reduceMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (!SKIN_GROUPS[colorMode].includes(skin)) setSkin(SKIN_GROUPS[colorMode][0]);
  }, [colorMode, setSkin, skin]);

  const resetRun = useCallback((resetAll = false, nextLevel = level, nextDiff = difficulty) => {
    frogRef.current = { ...initialFrog };
    frogAnimationRef.current = { start: { ...initialFrog }, end: { ...initialFrog }, progress: 1 };
    queuedMoveRef.current = null;
    bestYRef.current = START_ROW;
    const nextTime = getLevelTime(nextDiff, nextLevel);
    setTimeLeft(nextTime);
    lastTimerBroadcastRef.current = nextTime;
    if (resetAll) {
      setLevel(1);
      setScore(0);
      setLives(3);
      setStarted(false);
      setStatus('Press any Arrow key or WASD to start.');
      const resetHomes = createHomes();
      homesRef.current = resetHomes;
      setHomes(resetHomes);
      nextLifeRef.current = EXTRA_LIFE_SCORE;
      carsRef.current = buildLanes(1, nextDiff).cars;
      logsRef.current = buildLanes(1, nextDiff).logs;
      rngRef.current = makeRng(1337);
      return;
    }
    carsRef.current = buildLanes(nextLevel, nextDiff).cars;
    logsRef.current = buildLanes(nextLevel, nextDiff).logs;
  }, [difficulty, level]);

  const handleDeath = useCallback((cause: DeathCause) => {
    setStatus(deathMessage[cause]);
    hitFlashRef.current = 0.2;
    setLives((prev) => {
      if (prev <= 1) {
        setStatus('Game Over. Restarting…');
        setTimeout(() => resetRun(true), 900);
        return 0;
      }
      return prev - 1;
    });
    resetRun(false);
  }, [resetRun]);

  const playTone = useCallback((frequency: number) => {
    if (!soundEnabled || audioFailedRef.current) return;
    try {
      if (!audioCtxRef.current) {
        const Ctx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctx) throw new Error('AudioContext unavailable');
        audioCtxRef.current = new Ctx();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0.06;
      osc.frequency.value = frequency;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch {
      audioFailedRef.current = true;
      setStatus('Sound unavailable on this device/browser.');
    }
  }, [soundEnabled]);

  const commitMove = useCallback((dx: number, dy: number) => {
    if (!started) {
      setStarted(true);
      setStatus('Hop to each home bay. Avoid traffic and water hazards.');
    }
    const prev = frogRef.current;
    const next = { x: Math.max(0, Math.min(GRID_WIDTH - 1, prev.x + dx)), y: Math.max(0, Math.min(GRID_HEIGHT - 1, prev.y + dy)) };
    frogRef.current = next;
    const scoreResult = applyForwardProgressScore(bestYRef.current, next.y);
    bestYRef.current = scoreResult.bestY;
    if (scoreResult.scoreDelta > 0) setScore((s) => s + scoreResult.scoreDelta);
    frogAnimationRef.current = reduceMotion
      ? { start: next, end: next, progress: 1 }
      : { start: { ...prev }, end: { ...next }, progress: 0 };
    playTone(520);
    record({ dx, dy });
  }, [playTone, record, reduceMotion, started]);

  const requestMove = useCallback((dx: number, dy: number) => {
    if (paused || !isFocused) return;
    if (frogAnimationRef.current.progress < 1) {
      queuedMoveRef.current = { dx, dy };
      return;
    }
    commitMove(dx, dy);
  }, [commitMove, isFocused, paused]);

  useEffect(() => {
    registerReplay((input, index) => {
      if (index === 0) {
        rngRef.current = makeRng(1337);
        resetRun(true);
      }
      if (input && typeof input.dx === 'number' && typeof input.dy === 'number') {
        requestMove(input.dx, input.dy);
      }
    });
  }, [registerReplay, requestMove, resetRun]);

  useEffect(() => {
    if (!isFocused) setPaused(true);
  }, [isFocused]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!shouldHandleGameKey(e, { isFocused })) return;
      const key = e.key.toLowerCase();
      if (key === 'p' || key === ' ') {
        consumeGameKey(e);
        setPaused((p) => !p);
        return;
      }
      if (key === 'r') {
        consumeGameKey(e);
        resetRun(true);
        return;
      }
      const move =
        key === 'arrowleft' || key === 'a' ? { dx: -1, dy: 0 } :
        key === 'arrowright' || key === 'd' ? { dx: 1, dy: 0 } :
        key === 'arrowup' || key === 'w' ? { dx: 0, dy: -1 } :
        key === 'arrowdown' || key === 's' ? { dx: 0, dy: 1 } :
        null;
      if (!move) return;
      consumeGameKey(e);
      requestMove(move.dx, move.dy);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isFocused, requestMove, resetRun]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setStatus('Canvas rendering unavailable in this environment.');
      return undefined;
    }
    let last = performance.now();
    let raf = 0;
    const loop = (time: number) => {
      const dt = clampDelta((time - last) / 1000);
      last = time;

      if (frogAnimationRef.current.progress < 1) {
        frogAnimationRef.current.progress = Math.min(1, frogAnimationRef.current.progress + dt / FROG_HOP_DURATION);
      } else if (queuedMoveRef.current) {
        const next = queuedMoveRef.current;
        queuedMoveRef.current = null;
        commitMove(next.dx, next.dy);
      }

      if (started && !paused) {
        const timerResult = tickTimer(lastTimerBroadcastRef.current, dt);
        lastTimerBroadcastRef.current = timerResult.timeLeft;
        if (Math.ceil(timerResult.timeLeft) !== Math.ceil(timeLeft)) setTimeLeft(timerResult.timeLeft);
        if (timerResult.timedOut) {
          handleDeath('timeout');
        } else {
          homesRef.current = tickHomeHazards(homesRef.current, dt, rngRef.current);
          setHomes([...homesRef.current]);

          const carResult = updateCars(carsRef.current, frogRef.current, dt);
          carsRef.current = carResult.lanes;
          if (carResult.dead && carResult.deathCause) handleDeath(carResult.deathCause);

          const logResult = updateLogs(logsRef.current, frogRef.current, dt);
          logsRef.current = logResult.lanes;
          frogRef.current = logResult.frog;
          if (logResult.dead && logResult.deathCause) handleDeath(logResult.deathCause);

          const homeResult = resolveHomeEntry(frogRef.current, homesRef.current, false);
          if (homeResult.dead && homeResult.cause) {
            handleDeath(homeResult.cause);
          } else if (homeResult.score > 0) {
            homesRef.current = homeResult.homes;
            setHomes([...homeResult.homes]);
            const bonus = Math.floor(lastTimerBroadcastRef.current) * 10;
            setScore((s) => s + homeResult.score + bonus);
            playTone(780);
            if (homeResult.levelComplete) {
              setScore((s) => s + 1000);
              const nextLevel = level + 1;
              setLevel(nextLevel);
              homesRef.current = createHomes();
              setHomes(homesRef.current);
              resetRun(false, nextLevel, difficulty);
              setStatus('All homes filled! Level up.');
            } else {
              resetRun(false, level, difficulty);
            }
          }
        }
      }

      if (score >= nextLifeRef.current) {
        setLives((l) => l + 1);
        nextLifeRef.current += EXTRA_LIFE_SCORE;
      }

      splashesRef.current = splashesRef.current.map((s) => ({ ...s, t: s.t + dt })).filter((s) => s.t < 0.5);
      if (hitFlashRef.current > 0) hitFlashRef.current -= dt;

      renderFroggerFrame(
        ctx,
        {
          frog: frogRef.current,
          cars: carsRef.current,
          logs: logsRef.current,
          pads: homesRef.current.map((h) => h.filled),
          homes: homesRef.current,
        },
        {
          ripple: time * 0.001,
          lighting: time * 0.0005,
          splashes: splashesRef.current,
          safeFlash: 0,
          hitFlash: hitFlashRef.current,
          frogAnimation: frogAnimationRef.current,
        },
        {
          colors: SKINS[skin],
          reduceMotion,
          showHitboxes,
          paused,
          status: started ? '' : 'Press any Arrow/WASD key to begin',
          timeLeft,
          gradientCache: {},
          showPauseOverlay: true,
        },
      );

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [canvasRef, commitMove, difficulty, handleDeath, level, paused, playTone, reduceMotion, resetRun, score, showHitboxes, skin, started, timeLeft]);

  const hudBg = SKINS[skin].hudBg;
  const hudText = SKINS[skin].hudText;
  const goals = homes.filter((h) => h.filled).length;
  const activeRulesetLabel = RULESETS.find((item) => item.id === ruleset)?.label ?? 'Classic Arcade';

  const mobileControls = [
    { dx: 0, dy: -1, label: 'Up' },
    { dx: -1, dy: 0, label: 'Left' },
    { dx: 1, dy: 0, label: 'Right' },
    { dx: 0, dy: 1, label: 'Down' },
  ];

  const settingsPanel = (
    <div className="space-y-3 text-sm text-slate-100">
      <label className="block space-y-1">
        <span>Ruleset</span>
        <select className="w-full rounded bg-slate-900 px-2 py-1" value={ruleset} onChange={(e) => setRuleset(e.target.value as 'classic' | 'compact')}>
          <option value="classic">Classic Arcade</option>
          <option value="compact">Portfolio Compact</option>
        </select>
      </label>
      <label className="block space-y-1">
        <span>Difficulty</span>
        <select className="w-full rounded bg-slate-900 px-2 py-1" value={difficulty} onChange={(e) => { const next = e.target.value as Difficulty; setDifficulty(next); resetRun(true, 1, next); }}>
          <option value="easy">Easy</option>
          <option value="normal">Normal</option>
          <option value="hard">Hard</option>
        </select>
      </label>
      <label className="block space-y-1">
        <span>Palette</span>
        <select className="w-full rounded bg-slate-900 px-2 py-1" value={skin} onChange={(e) => setSkin(e.target.value as SkinName)}>
          {SKIN_GROUPS[colorMode].map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
      </label>
      <div className="flex gap-2">
        <button type="button" className="rounded bg-slate-800 px-2 py-1" onClick={() => setColorMode(colorMode === 'vibrant' ? 'accessible' : 'vibrant')}>Toggle accessible colors</button>
        <button type="button" className="rounded bg-slate-800 px-2 py-1" onClick={() => setShowHitboxes((v) => !v)}>Hitboxes</button>
      </div>
      <label htmlFor="frogger-sound" className="flex items-center gap-2"><input id="frogger-sound" type="checkbox" aria-label="Enable sound" checked={soundEnabled} onChange={(e) => setSoundEnabled(e.target.checked)} /> Sound</label>
    </div>
  );

  const statusMessage = useMemo(() => {
    if (!started) return 'Classic Arcade mode: fill all 5 homes. Press ? for help.';
    if (paused) return 'Paused — P/Space to resume, R to restart.';
    return status || 'Move only when focused. Timer awards bonus when you reach home.';
  }, [paused, started, status]);

  return (
    <GameLayout
      gameId="frogger"
      score={score}
      highScore={score}
      lives={lives}
      stage={level}
      onPauseChange={setPaused}
      onRestart={() => resetRun(true)}
      pauseHotkeys={['p', 'space']}
      restartHotkeys={['r']}
      settingsPanel={settingsPanel}
      isFocused={isFocused}
    >
      <div ref={containerRef} className="h-full w-full overflow-auto bg-ub-cool-grey text-white" style={{ touchAction: 'none' }}>
        <div className="mx-auto flex h-full w-full max-w-4xl flex-col items-center gap-4 px-4 py-6">
          <div className="w-full rounded-xl border border-slate-700/70 p-3 text-sm" style={{ background: hudBg, color: hudText }}>
            <div className="font-semibold">Frogger — {activeRulesetLabel}</div>
            <div className="text-xs">Controls: Arrow keys/WASD · P pause · R restart · ? help. Fill all 5 home bays to clear the level.</div>
          </div>
          <canvas ref={canvasRef} width={GRID_WIDTH * CELL_SIZE} height={GRID_HEIGHT * CELL_SIZE} className="w-full max-w-2xl rounded-xl border border-slate-700/70 bg-black" role="img" aria-label="Frogger playfield" />
          <div className="grid w-full grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <div className="rounded border border-slate-700 p-2" style={{ background: hudBg }}>Lives: {lives}</div>
            <div className="rounded border border-slate-700 p-2" style={{ background: hudBg }}>Homes: {goals}/{PAD_POSITIONS.length}</div>
            <div className="rounded border border-slate-700 p-2" style={{ background: hudBg }}>Timer: {Math.ceil(timeLeft)}s</div>
            <div className="rounded border border-slate-700 p-2" style={{ background: hudBg }}>Score: {score}</div>
          </div>
          <div className="w-full rounded border border-slate-700 p-2 text-sm" role="status" aria-live="polite" style={{ background: hudBg }}>{statusMessage}</div>
          <div className="grid w-full grid-cols-2 gap-3 sm:hidden">
            {mobileControls.map((control) => (
              <button key={control.label} type="button" className="h-14 rounded-xl border border-slate-600 bg-slate-800 text-base" aria-label={`Move frog ${control.label.toLowerCase()}`} onClick={() => requestMove(control.dx, control.dy)}>
                {control.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </GameLayout>
  );
};

export default Frogger;

export { makeRng, initLane, updateCars, updateLogs, handlePads } from './engine';
export { PAD_POSITIONS } from './types';
export { carLaneDefs, logLaneDefs, rampLane } from '../../../apps/games/frogger/config';
export { clampDelta } from './engine';
