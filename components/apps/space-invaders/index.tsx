import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GameLayout from '../GameLayout';
import useCanvasResize from '../../../hooks/useCanvasResize';
import usePersistentState from '../../../hooks/usePersistentState';
import usePrefersReducedMotion from '../../../hooks/usePrefersReducedMotion';
import { createEngine, FIXED_TIMESTEP_MS, SpaceInvadersEngine } from './engine/engine';
import { renderGame } from './engine/renderer';
import { InputSnapshot } from './engine/types';
import { GameOverOverlay, PauseOverlay, StartOverlay } from './ui/Overlays';

const WIDTH = 480;
const HEIGHT = 360;
const HIGH_SCORE_KEY = 'space-invaders-high-score-v2';

const emptyInput = (): InputSnapshot => ({ left: false, right: false, fire: false });

const readTestSeed = () => {
  if (typeof window === 'undefined') return undefined;
  const params = new URLSearchParams(window.location.search);
  const querySeed = params.get('siSeed');
  return querySeed ? Number(querySeed) : undefined;
};

const SpaceInvaders: React.FC = () => {
  const canvasRef = useCanvasResize(WIDTH, HEIGHT);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<SpaceInvadersEngine | null>(null);
  const rafRef = useRef<number | null>(null);
  const accumulatorRef = useRef(0);
  const prevTimeRef = useRef(0);
  const inputRef = useRef<InputSnapshot>(emptyInput());
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [hud, setHud] = useState({ score: 0, lives: 3, level: 1, phase: 'start' as const });
  const [highScore, setHighScore] = usePersistentState(HIGH_SCORE_KEY, 0, (v): v is number => typeof v === 'number');
  const [multiShot, setMultiShot] = usePersistentState('space-invaders-multi-shot', false, (v): v is boolean => typeof v === 'boolean');
  const [soundEnabled, setSoundEnabled] = usePersistentState('space-invaders-sound-v2', false, (v): v is boolean => typeof v === 'boolean');
  const [debugEnabled, setDebugEnabled] = usePersistentState('space-invaders-debug', false, (v): v is boolean => typeof v === 'boolean');
  const prefersReducedMotion = usePrefersReducedMotion();

  const syncHud = useCallback(() => {
    const state = engineRef.current?.getState();
    if (!state) return;
    setHud({ score: state.score, lives: state.lives, level: state.level, phase: state.phase });
    if (state.highScore !== highScore) {
      setHighScore(state.highScore);
    }
  }, [highScore, setHighScore]);

  const ensureContext = useCallback(() => {
    if (ctxRef.current) return ctxRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const context = canvas.getContext('2d');
    if (!context) return null;
    ctxRef.current = context;
    return context;
  }, [canvasRef]);

  const render = useCallback(() => {
    const ctx = ensureContext();
    const state = engineRef.current?.getState();
    if (!ctx || !state) return;
    renderGame(ctx, state);

    if (debugEnabled) {
      ctx.fillStyle = 'rgba(2,6,23,0.75)';
      ctx.fillRect(8, 8, 172, 50);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '11px monospace';
      ctx.fillText(`player bullets: ${state.playerBullets.length}`, 12, 24);
      ctx.fillText(`enemy bullets: ${state.invaderBullets.length}`, 12, 38);
      ctx.fillText(`invaders: ${state.invaders.filter((i) => i.alive).length}`, 12, 52);
    }
  }, [debugEnabled, ensureContext]);

  const stepFrame = useCallback((time: number) => {
    const engine = engineRef.current;
    if (!engine) return;

    if (prevTimeRef.current === 0) prevTimeRef.current = time;
    const frameDelta = Math.min(100, time - prevTimeRef.current);
    prevTimeRef.current = time;

    accumulatorRef.current += frameDelta;
    while (accumulatorRef.current >= FIXED_TIMESTEP_MS) {
      engine.step(FIXED_TIMESTEP_MS, inputRef.current);
      accumulatorRef.current -= FIXED_TIMESTEP_MS;
    }

    syncHud();
    render();
    rafRef.current = requestAnimationFrame(stepFrame);
  }, [render, syncHud]);

  const boot = useCallback(() => {
    try {
      const seed = readTestSeed();
      const testMode = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';
      engineRef.current = createEngine({
        width: WIDTH,
        height: HEIGHT,
        seed,
        allowMultiShot: multiShot || testMode,
        reducedMotion: prefersReducedMotion,
        soundEnabled,
        testMode,
      });
      engineRef.current.setHighScore(highScore);
      syncHud();
      render();
    } catch (err) {
      setError((err as Error).message || 'Failed to initialize game engine');
    }
  }, [highScore, multiShot, prefersReducedMotion, render, soundEnabled, syncHud]);

  const startGame = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.reset();
    engineRef.current.setHighScore(highScore);
    engineRef.current.setMultiShot(multiShot);
    engineRef.current.start();
    setPaused(false);
    syncHud();
  }, [highScore, multiShot, syncHud]);

  const togglePause = useCallback(() => {
    if (!engineRef.current) return;
    const next = !paused;
    setPaused(next);
    engineRef.current.setPaused(next);
    inputRef.current = emptyInput();
    syncHud();
  }, [paused, syncHud]);

  useEffect(() => {
    boot();
    rafRef.current = requestAnimationFrame(stepFrame);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [boot, stepFrame]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && !paused) {
        togglePause();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [paused, togglePause]);

  const onKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.repeat) return;
    if (event.code === 'KeyP') {
      event.preventDefault();
      togglePause();
      return;
    }

    if (event.code === 'ArrowLeft' || event.code === 'KeyA') inputRef.current.left = true;
    if (event.code === 'ArrowRight' || event.code === 'KeyD') inputRef.current.right = true;
    if (event.code === 'Space') {
      event.preventDefault();
      inputRef.current.fire = true;
    }
  }, [togglePause]);

  const onKeyUp = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.code === 'ArrowLeft' || event.code === 'KeyA') inputRef.current.left = false;
    if (event.code === 'ArrowRight' || event.code === 'KeyD') inputRef.current.right = false;
    if (event.code === 'Space') inputRef.current.fire = false;
  }, []);

  const settingsPanel = useMemo(
    () => (
      <div className="space-y-2 text-sm text-slate-200">
        <label className="flex items-center gap-2">
          <input aria-label="Toggle sound" type="checkbox" checked={soundEnabled} onChange={() => setSoundEnabled((value) => !value)} />
          <span>Sound</span>
        </label>
        <label className="flex items-center gap-2">
          <input aria-label="Toggle multi-shot" type="checkbox" checked={multiShot} onChange={() => setMultiShot((value) => !value)} />
          <span>Allow multi-shot</span>
        </label>
        <label className="flex items-center gap-2">
          <input aria-label="Toggle debug overlay" type="checkbox" checked={debugEnabled} onChange={() => setDebugEnabled((value) => !value)} />
          <span>Debug overlay</span>
        </label>
        <p className="text-xs text-slate-400">Reduced motion: {prefersReducedMotion ? 'on' : 'off'}</p>
      </div>
    ),
    [debugEnabled, multiShot, prefersReducedMotion, setDebugEnabled, setMultiShot, setSoundEnabled, soundEnabled],
  );

  return (
    <GameLayout
      gameId="space-invaders"
      stage={hud.level}
      lives={hud.lives}
      score={hud.score}
      highScore={highScore}
      onPauseChange={setPaused}
      onRestart={startGame}
      pauseHotkeys={['p']}
      restartHotkeys={['r']}
      settingsPanel={settingsPanel}
    >
      <div
        ref={containerRef}
        className="relative h-full w-full bg-black focus:outline-none focus:ring-2 focus:ring-emerald-400"
        tabIndex={0}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onBlur={() => {
          if (!paused) togglePause();
        }}
        onPointerDown={() => containerRef.current?.focus()}
      >
        <canvas ref={canvasRef} className="h-full w-full" aria-label="Space Invaders canvas" />

        {error && (
          <div className="absolute right-2 top-2 rounded bg-rose-500/90 px-2 py-1 text-xs text-white">
            {error}
            <button type="button" className="ml-2 underline" onClick={boot}>Reset Game</button>
          </div>
        )}

        {hud.phase === 'start' && <StartOverlay onStart={startGame} />}
        {hud.phase === 'paused' && <PauseOverlay onResume={togglePause} />}
        {hud.phase === 'gameover' && (
          <GameOverOverlay score={hud.score} highScore={highScore} onRestart={startGame} />
        )}
      </div>
    </GameLayout>
  );
};

export default SpaceInvaders;
