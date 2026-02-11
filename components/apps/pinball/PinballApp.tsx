'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { FIXED_TIMESTEP, MAX_FRAME_DELTA } from './constants';
import { GameEngine } from './engine/GameEngine';
import { InputController } from './input/InputController';
import { loadHighScores, loadSettings, saveHighScores, saveSettings, insertHighScore } from './persistence/storage';
import { CanvasRenderer } from './render/CanvasRenderer';
import type { EngineSnapshot } from './types';
import { HUD } from './ui/HUD';
import { Menus } from './ui/Menus';
import { SettingsPanel } from './ui/SettingsPanel';

const initialSnapshot: EngineSnapshot = {
  score: 0, multiplier: 1, comboCount: 0, currentBall: 1, ballsRemaining: 3, ballSaveRemaining: 0,
  plungerCharge: 0, paused: false, gameOver: false, tiltWarnings: 0, tiltActive: false,
  statusMessage: 'Loading table...', debug: { fps: 0, physicsMs: 0, contacts: 0, bodies: 0 },
};

export function PinballApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const inputRef = useRef<InputController | null>(null);
  const [snapshot, setSnapshot] = useState<EngineSnapshot>(initialSnapshot);
  const [settings, setSettings] = useState(() => (typeof window === 'undefined' ? { reducedMotion: false, muted: false, masterVolume: 0.8 } : loadSettings()));
  const [highScores, setHighScores] = useState(() => (typeof window === 'undefined' ? [] : loadHighScores()));
  const [showDebug, setShowDebug] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new GameEngine();
    engineRef.current = engine;
    const renderer = new CanvasRenderer(canvasRef.current);
    rendererRef.current = renderer;
    const input = new InputController((action) => engine.handleInput(action));
    input.attach();
    inputRef.current = input;

    let raf = 0;
    let accumulator = 0;
    let last = performance.now();
    let uiTimer = 0;

    const tick = (now: number) => {
      const dt = Math.min(MAX_FRAME_DELTA, (now - last) / 1000);
      last = now;
      accumulator += dt;
      while (accumulator >= FIXED_TIMESTEP) {
        engine.step(FIXED_TIMESTEP);
        accumulator -= FIXED_TIMESTEP;
      }
      renderer.render(engine, settings.reducedMotion);
      uiTimer += dt;
      if (uiTimer >= 1 / 20) {
        uiTimer = 0;
        const next = engine.getSnapshot();
        setSnapshot(next);
        if (next.gameOver) {
          setHighScores((current) => {
            const nextScores = insertHighScore(current, { name: 'YOU', score: next.score, createdAt: Date.now() });
            saveHighScores(nextScores);
            return nextScores;
          });
        }
      }
      raf = requestAnimationFrame(tick);
    };

    const onResize = () => {
      if (!canvasRef.current || !rendererRef.current) return;
      rendererRef.current.resize(canvasRef.current.clientWidth || 420, canvasRef.current.clientHeight || 680);
      engine.resize();
    };
    window.addEventListener('resize', onResize);
    onResize();
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      input.detach();
      inputRef.current = null;
      rendererRef.current = null;
      engineRef.current = null;
    };
  }, [settings.reducedMotion]);

  const topScore = useMemo(() => highScores[0]?.score ?? 0, [highScores]);

  return (
    <div className="flex h-full w-full flex-col gap-2 bg-ub-cool-grey p-2">
      <Menus
        paused={snapshot.paused}
        gameOver={snapshot.gameOver}
        onNewGame={() => engineRef.current?.resetGame()}
        onResume={() => engineRef.current?.start()}
        onToggleHelp={() => setShowHelp((v) => !v)}
      />
      <SettingsPanel settings={settings} onChange={setSettings} />
      <button className="w-fit rounded bg-slate-700 px-2 py-1 text-xs text-white" onClick={() => setShowDebug((v) => !v)}>Debug</button>
      <div className="text-xs text-white">High Score: {topScore}</div>
      <div className="relative flex-1 overflow-hidden rounded border border-slate-700 bg-black">
        <canvas ref={canvasRef} className="h-full w-full" aria-label="Pinball table" />
        <HUD snapshot={snapshot} showDebug={showDebug} />
      </div>
      {showHelp && (
        <div className="rounded border border-slate-600 bg-slate-900/90 p-2 text-xs text-white">
          Controls: Z/Left Shift = left flipper, / or Right Shift = right flipper, Space hold/release = plunger, Esc = pause, Arrow keys or N = nudge.
        </div>
      )}
    </div>
  );
}
