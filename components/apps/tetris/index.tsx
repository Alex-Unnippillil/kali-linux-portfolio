import React, { useEffect, useMemo, useRef, useState } from 'react';
import { applyAction, createInitialGameState, DEFAULT_ENGINE_CONFIG, EngineAction, EngineConfig, GameState, stepGame } from './engine';
import useTetrisInput, { DEFAULT_KEYS, KeyBindings } from './input/useTetrisInput';
import TetrisCanvas from './ui/TetrisCanvas';
import Hud from './ui/Hud';
import Overlays from './ui/Overlays';
import SettingsPanel from './ui/SettingsPanel';
import TetrisErrorBoundary from './ui/TetrisErrorBoundary';
import { readStorage, writeStorage } from './utils/storage';
import { clamp } from './utils/timing';
import { devAssert } from './utils/assert';

interface Props {
  windowMeta?: {
    isFocused?: boolean;
  };
}

interface TetrisPreferences {
  keyBindings: KeyBindings;
  ghostPiece: boolean;
  gridlines: boolean;
  sound: boolean;
  allowRotate180: boolean;
  dasMs: number;
  arrMs: number;
}

const PREF_KEY = 'tetris:v2:settings';

const defaultPreferences: TetrisPreferences = {
  keyBindings: DEFAULT_KEYS,
  ghostPiece: true,
  gridlines: true,
  sound: false,
  allowRotate180: false,
  dasMs: 140,
  arrMs: 32,
};

const TetrisApp: React.FC<Props> = ({ windowMeta }) => {
  const isFocused = windowMeta?.isFocused ?? true;
  const [preferences, setPreferences] = useState<TetrisPreferences>(() =>
    readStorage(PREF_KEY, defaultPreferences),
  );
  const [showHelp, setShowHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [captureTarget, setCaptureTarget] = useState<keyof KeyBindings | null>(null);

  const config = useMemo<EngineConfig>(
    () => ({
      ...DEFAULT_ENGINE_CONFIG,
      allowRotate180: preferences.allowRotate180,
      ghostPiece: preferences.ghostPiece,
      gridlines: preferences.gridlines,
      sound: preferences.sound,
    }),
    [preferences.allowRotate180, preferences.ghostPiece, preferences.gridlines, preferences.sound],
  );

  const [gameState, setGameState] = useState<GameState>(() => createInitialGameState(config, 1));
  const stateRef = useRef(gameState);
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef(0);
  const accumulatorRef = useRef(0);
  const fixedStepMs = 1000 / 120;

  useEffect(() => {
    writeStorage(PREF_KEY, preferences);
  }, [preferences]);

  useEffect(() => {
    stateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    if (!isFocused && stateRef.current.status === 'playing') {
      setGameState((prev) => ({ ...prev, status: 'paused' }));
    }
  }, [isFocused]);

  const { consume } = useTetrisInput(isFocused && !showSettings, preferences.keyBindings, {
    dasMs: preferences.dasMs,
    arrMs: preferences.arrMs,
  });

  useEffect(() => {
    const loop = (now: number) => {
      if (!lastFrameRef.current) lastFrameRef.current = now;
      const delta = Math.min(50, now - lastFrameRef.current);
      lastFrameRef.current = now;
      accumulatorRef.current += delta;

      let state = stateRef.current;
      const snapshot = consume(now);

      for (const rawAction of snapshot.actions) {
        if (rawAction === 'toggleHelp') {
          setShowHelp((prev) => !prev);
          continue;
        }
        if (rawAction === 'toggleSettings') {
          setShowSettings((prev) => !prev);
          continue;
        }
        const action: EngineAction = { type: rawAction as EngineAction['type'] };
        state = applyAction(state, action, config);
      }

      while (accumulatorRef.current >= fixedStepMs) {
        state = stepGame(state, fixedStepMs, snapshot.softDropActive, config);
        accumulatorRef.current -= fixedStepMs;
      }

      devAssert(state.board.length === config.visibleHeight + config.hiddenRows, 'Tetris board rows mismatch');
      if (state !== stateRef.current) {
        stateRef.current = state;
        setGameState(state);
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [config, consume, fixedStepMs]);

  useEffect(() => {
    if (!captureTarget) return;
    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      setPreferences((prev) => ({
        ...prev,
        keyBindings: {
          ...prev.keyBindings,
          [captureTarget]: event.code,
        },
      }));
      setCaptureTarget(null);
    };
    window.addEventListener('keydown', onKeyDown, { once: true });
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [captureTarget]);

  const restart = () => setGameState(createInitialGameState(config, gameState.rngState + 13));

  return (
    <TetrisErrorBoundary>
      <div className="h-full w-full bg-slate-950 text-slate-100 p-3" data-testid="tetris-app-root">
        <div className="relative mx-auto flex h-full w-full max-w-4xl gap-3 rounded-lg border border-slate-700 bg-slate-900/60 p-3">
          <div className="relative flex-1 flex items-center justify-center">
            <TetrisCanvas
              state={gameState}
              focused={isFocused}
              ghostEnabled={preferences.ghostPiece}
              gridlines={preferences.gridlines}
            />
            <Overlays
              status={gameState.status}
              showHelp={showHelp}
              onStart={() => setGameState((prev) => applyAction(prev, { type: 'start' }, config))}
              onRestart={restart}
            />
            <SettingsPanel
              visible={showSettings}
              keyBindings={preferences.keyBindings}
              onCapture={setCaptureTarget}
              captureTarget={captureTarget}
              ghostPiece={preferences.ghostPiece}
              gridlines={preferences.gridlines}
              sound={preferences.sound}
              allowRotate180={preferences.allowRotate180}
              dasMs={preferences.dasMs}
              arrMs={preferences.arrMs}
              setDasMs={(value) => setPreferences((prev) => ({ ...prev, dasMs: clamp(value, 40, 350) }))}
              setArrMs={(value) => setPreferences((prev) => ({ ...prev, arrMs: clamp(value, 0, 120) }))}
              onToggle={(setting) => setPreferences((prev) => ({ ...prev, [setting]: !prev[setting] }))}
            />
          </div>

          <Hud
            hold={gameState.hold}
            next={gameState.queue}
            score={gameState.scoring.score}
            lines={gameState.scoring.lines}
            level={gameState.scoring.level}
            status={gameState.status}
          />
        </div>
      </div>
    </TetrisErrorBoundary>
  );
};

export default TetrisApp;
