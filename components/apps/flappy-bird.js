import React, { useCallback, useEffect, useRef, useState } from 'react';
import GameLayout from './GameLayout';
import InputRemap from './Games/common/input-remap/InputRemap';
import useInputMapping from './Games/common/input-remap/useInputMapping';
import useCanvasResize from '../../hooks/useCanvasResize';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';
import useIsTouchDevice from '../../hooks/useIsTouchDevice';
import useAssetLoader from '../../hooks/useAssetLoader';
import {
  BIRD_SKINS,
  BIRD_ANIMATION_FRAMES,
  PIPE_SKINS,
} from '../../apps/games/flappy-bird/skins';
import {
  createFlappyEngine,
  GRAVITY_VARIANTS,
  GAME_WIDTH,
  GAME_HEIGHT,
} from '../../apps/games/flappy-bird/engine';
import { createFlappyRenderer } from '../../apps/games/flappy-bird/renderer';
import { loadBestRun, listGhostOptions, recordRun } from '../../games/flappy-bird/ghost';
import {
  STORAGE_KEYS,
  readBoolean,
  readNumber,
  writeValue,
  migrateLegacyFlappyRecords,
  readHighScore,
  writeHighScore,
} from '../../apps/games/flappy-bird/storage';
import { consumeGameKey, shouldHandleGameKey } from '../../utils/gameInput';
import { pollTwinStick } from '../../utils/gamepad';

const SETTINGS_DEFAULTS = {
  gravityVariant: 1,
  practiceMode: false,
  showGhost: true,
  reducedMotion: false,
  highHz: false,
  showHitbox: false,
};

const buildScoreEntries = (scores) =>
  scores.map((score, index) => ({ id: `${score}-${index}`, score }));

const FlappyBird = ({ windowMeta } = {}) => {
  const isWindowFocused = windowMeta?.isFocused ?? true;
  const prefersReducedMotion = usePrefersReducedMotion();
  const isTouch = useIsTouchDevice();
  const canvasRef = useCanvasResize(GAME_WIDTH, GAME_HEIGHT);
  const liveRef = useRef(null);
  const engineRef = useRef(null);
  const rendererRef = useRef(null);
  const ctxRef = useRef(null);
  const frameAccumulatorRef = useRef(0);
  const focusPausedRef = useRef(false);
  const lastRunRef = useRef(null);
  const milestoneTimeoutRef = useRef(null);
  const gamepadRef = useRef({ fire: false, up: false });

  const [birdSkin, setBirdSkin] = useState(() =>
    readNumber(STORAGE_KEYS.birdSkin, 0, { min: 0 }),
  );
  const [pipeSkinIndex, setPipeSkinIndex] = useState(() =>
    readNumber(STORAGE_KEYS.pipeSkin, 0, { min: 0 }),
  );
  const [settings, setSettings] = useState(() => ({
    ...SETTINGS_DEFAULTS,
    gravityVariant: readNumber(STORAGE_KEYS.gravity, SETTINGS_DEFAULTS.gravityVariant, {
      min: 0,
      max: GRAVITY_VARIANTS.length - 1,
    }),
    practiceMode: readBoolean(STORAGE_KEYS.practice, SETTINGS_DEFAULTS.practiceMode),
    showGhost: readBoolean(STORAGE_KEYS.ghost, SETTINGS_DEFAULTS.showGhost),
    reducedMotion: readBoolean(STORAGE_KEYS.reducedMotion, prefersReducedMotion),
    highHz: readBoolean(STORAGE_KEYS.highHz, SETTINGS_DEFAULTS.highHz),
    showHitbox: readBoolean(STORAGE_KEYS.hitbox, SETTINGS_DEFAULTS.showHitbox),
  }));
  const settingsRef = useRef(settings);

  const [gameState, setGameState] = useState('menu');
  const [layoutPaused, setLayoutPaused] = useState(false);
  const [focusPaused, setFocusPaused] = useState(false);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [bestOverall, setBestOverall] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [ghostRun, setGhostRun] = useState(null);
  const [milestoneMessage, setMilestoneMessage] = useState(null);
  const renderOptionsRef = useRef(null);
  const isTestEnv = process.env.NODE_ENV === 'test';

  const [mapping, setKey] = useInputMapping('flappy-bird', {
    flap: 'Space',
    pause: 'Escape',
  });

  const { loading: assetsLoading, error: assetsError } = useAssetLoader({
    images: BIRD_ANIMATION_FRAMES.flat(),
  });

  const [birdFrames, setBirdFrames] = useState(() =>
    BIRD_ANIMATION_FRAMES.map(() => []),
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setBirdFrames(
      BIRD_ANIMATION_FRAMES.map((frames) =>
        frames.map((src) => {
          const img = new Image();
          img.src = src;
          return img;
        }),
      ),
    );
  }, []);

  const isPaused = layoutPaused || focusPaused;

  const announce = useCallback((message) => {
    if (liveRef.current) {
      liveRef.current.textContent = message;
    }
  }, []);

  const focusCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    requestAnimationFrame(() => {
      canvas.focus();
    });
  }, [canvasRef]);

  const syncLeaderboard = useCallback(
    (gravityName) => {
      const scores = listGhostOptions(gravityName);
      setLeaderboard(buildScoreEntries(scores.slice(0, 5)));
    },
    [],
  );

  const updateBestRun = useCallback(
    (gravityName) => {
      const bestRun = loadBestRun(gravityName);
      setGhostRun(bestRun);
      setBestScore(bestRun?.score ?? 0);
      syncLeaderboard(gravityName);
    },
    [syncLeaderboard],
  );

  useEffect(() => {
    settingsRef.current = settings;
    if (engineRef.current) {
      engineRef.current.applySettings({
        gravityVariant: settings.gravityVariant,
        practiceMode: settings.practiceMode,
        reducedMotion: settings.reducedMotion,
      });
    }
    if (rendererRef.current && engineRef.current) {
      rendererRef.current.reset(
        engineRef.current.state.seed,
        settings.reducedMotion,
      );
    }
  }, [settings]);

  useEffect(() => {
    writeValue(STORAGE_KEYS.birdSkin, String(birdSkin));
  }, [birdSkin]);

  useEffect(() => {
    writeValue(STORAGE_KEYS.pipeSkin, String(pipeSkinIndex));
  }, [pipeSkinIndex]);

  useEffect(() => {
    writeValue(STORAGE_KEYS.gravity, String(settings.gravityVariant));
  }, [settings.gravityVariant]);

  useEffect(() => {
    writeValue(STORAGE_KEYS.practice, settings.practiceMode ? '1' : '0');
  }, [settings.practiceMode]);

  useEffect(() => {
    writeValue(STORAGE_KEYS.ghost, settings.showGhost ? '1' : '0');
  }, [settings.showGhost]);

  useEffect(() => {
    writeValue(STORAGE_KEYS.reducedMotion, settings.reducedMotion ? '1' : '0');
  }, [settings.reducedMotion]);

  useEffect(() => {
    writeValue(STORAGE_KEYS.highHz, settings.highHz ? '1' : '0');
  }, [settings.highHz]);

  useEffect(() => {
    writeValue(STORAGE_KEYS.hitbox, settings.showHitbox ? '1' : '0');
  }, [settings.showHitbox]);

  useEffect(() => {
    migrateLegacyFlappyRecords(GRAVITY_VARIANTS.map((variant) => variant.name));
    setBestOverall(readHighScore());
  }, []);

  useEffect(() => {
    const gravityName = GRAVITY_VARIANTS[settings.gravityVariant]?.name;
    if (!gravityName) return;
    updateBestRun(gravityName);
  }, [settings.gravityVariant, updateBestRun]);

  useEffect(() => {
    if (!rendererRef.current) {
      rendererRef.current = createFlappyRenderer(GAME_WIDTH, GAME_HEIGHT);
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctxRef.current = ctx;
    if (!engineRef.current) {
      engineRef.current = createFlappyEngine({
        settings: {
          gravityVariant: settingsRef.current.gravityVariant,
          practiceMode: settingsRef.current.practiceMode,
          reducedMotion: settingsRef.current.reducedMotion,
        },
      });
    }
    rendererRef.current?.reset(
      engineRef.current.state.seed,
      settingsRef.current.reducedMotion,
    );
  }, [canvasRef]);

  const startGame = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.start();
    engineRef.current.setReplay(null);
    lastRunRef.current = null;
    setScore(0);
    setMilestoneMessage(null);
    if (milestoneTimeoutRef.current) {
      clearTimeout(milestoneTimeoutRef.current);
    }
    setGameState('running');
    frameAccumulatorRef.current = 0;
    rendererRef.current?.reset(engineRef.current.state.seed, settingsRef.current.reducedMotion);
    announce('Score: 0');
    focusCanvas();
  }, [announce, focusCanvas]);

  const restartGame = useCallback(() => {
    startGame();
  }, [startGame]);

  const returnToMenu = useCallback(() => {
    setGameState('menu');
  }, []);

  const handleGameOver = useCallback(
    (runData) => {
      setGameState('gameover');
      lastRunRef.current = runData;
      if (runData.score > 0) {
        const gravityName = GRAVITY_VARIANTS[settingsRef.current.gravityVariant]?.name;
        if (gravityName) {
          recordRun(gravityName, {
            score: runData.score,
            pos: runData.positions,
          });
          updateBestRun(gravityName);
        }
      }
      setBestOverall((prev) => {
        const next = Math.max(prev, runData.score);
        if (next !== prev) writeHighScore(next);
        return next;
      });
      announce(`Game over. Final score: ${runData.score}`);
    },
    [announce, updateBestRun],
  );

  const startReplay = useCallback(() => {
    const lastRun = lastRunRef.current;
    if (!lastRun || !engineRef.current) return;
    engineRef.current.start(lastRun.seed);
    engineRef.current.setReplay(lastRun.flaps || []);
    setScore(0);
    setMilestoneMessage(null);
    if (milestoneTimeoutRef.current) {
      clearTimeout(milestoneTimeoutRef.current);
    }
    setGameState('running');
    frameAccumulatorRef.current = 0;
    rendererRef.current?.reset(
      engineRef.current.state.seed,
      settingsRef.current.reducedMotion,
    );
    announce('Score: 0');
    focusCanvas();
  }, [announce, focusCanvas]);

  const handlePauseChange = useCallback(
    (nextPaused) => {
      setLayoutPaused(nextPaused);
      if (!nextPaused) focusCanvas();
    },
    [focusCanvas],
  );

  const matchesKey = useCallback((event, key) => {
    if (!key) return false;
    const target = key.toLowerCase();
    return (
      event.key.toLowerCase() === target ||
      event.code.toLowerCase() === target
    );
  }, []);

  const assetsBlocked = !isTestEnv && (assetsLoading || assetsError);

  const handleFlapAction = useCallback(() => {
    if (!isWindowFocused || assetsBlocked) return;
    if (gameState === 'menu') {
      startGame();
      return;
    }
    if (gameState === 'gameover') {
      restartGame();
      return;
    }
    if (isPaused) return;
    engineRef.current?.flap();
  }, [assetsBlocked, gameState, isPaused, isWindowFocused, restartGame, startGame]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!shouldHandleGameKey(event, { isFocused: isWindowFocused })) return;
      if (matchesKey(event, mapping?.flap)) {
        consumeGameKey(event);
        handleFlapAction();
        return;
      }
      if (event.key.toLowerCase() === 'r' && gameState === 'gameover') {
        consumeGameKey(event);
        if (lastRunRef.current) {
          startReplay();
        } else {
          restartGame();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    gameState,
    handleFlapAction,
    isWindowFocused,
    mapping,
    matchesKey,
    restartGame,
    startReplay,
  ]);

  useEffect(() => {
    if (!isWindowFocused) {
      focusPausedRef.current = true;
      setFocusPaused(true);
      return;
    }
    if (isWindowFocused && focusPausedRef.current) {
      focusPausedRef.current = false;
      setFocusPaused(false);
    }
  }, [isWindowFocused]);

  useEffect(() => {
    let raf;
    const loop = () => {
      if (isWindowFocused && !assetsBlocked) {
        const pad = pollTwinStick();
        const up = pad.moveY < -0.6;
        const fire = pad.fire;
        const prev = gamepadRef.current;
        if ((fire && !prev.fire) || (up && !prev.up)) {
          handleFlapAction();
        }
        prev.fire = fire;
        prev.up = up;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [assetsBlocked, handleFlapAction, isWindowFocused]);

  const stepFrame = useCallback(
    (delta) => {
      const engine = engineRef.current;
      const renderer = rendererRef.current;
      const ctx = ctxRef.current;
      const renderOptions = renderOptionsRef.current;
      if (!engine || !renderer || !ctx || !renderOptions) return;
      const baseFps = settingsRef.current.highHz ? 120 : 60;
      const stepDuration = settingsRef.current.practiceMode
        ? 1 / (baseFps / 2)
        : 1 / baseFps;
      frameAccumulatorRef.current += delta;

      while (frameAccumulatorRef.current >= stepDuration) {
        const result = engine.step();
        renderer.update(settingsRef.current.reducedMotion);
        if (result?.scored) {
          setScore(engine.state.score);
          announce(`Score: ${engine.state.score}`);
        }
        if (result?.milestone) {
          const message = `Milestone! ${result.milestone} points`;
          setMilestoneMessage(message);
          if (milestoneTimeoutRef.current) {
            clearTimeout(milestoneTimeoutRef.current);
          }
          milestoneTimeoutRef.current = setTimeout(() => {
            setMilestoneMessage(null);
          }, 2400);
          renderer.spawnParticles(engine.state.bird.x + 10, GAME_HEIGHT / 2, '#8ff7ff', 18, 3);
        }
        if (result?.crash) {
          renderer.spawnParticles(engine.state.bird.x, engine.state.bird.y, '#fbd34d', 24, 3);
        }
        if (result?.gameOver) {
          handleGameOver(result.gameOver);
          break;
        }
        frameAccumulatorRef.current -= stepDuration;
      }

      renderer.render(ctx, engine.state, renderOptions);
    },
    [announce, handleGameOver],
  );

  const shouldRunLoop =
    gameState === 'running' &&
    isWindowFocused &&
    !isPaused &&
    !assetsBlocked;

  useEffect(() => {
    if (gameState !== 'running') return;
    if (!shouldRunLoop) return;
    let raf;
    let last = performance.now();
    const loop = (now) => {
      const delta = (now - last) / 1000;
      last = now;
      stepFrame(delta);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [gameState, shouldRunLoop, stepFrame]);

  useEffect(() => {
    if (gameState !== 'running' || shouldRunLoop) return;
    const engine = engineRef.current;
    const renderer = rendererRef.current;
    const ctx = ctxRef.current;
    const renderOptions = renderOptionsRef.current;
    if (!engine || !renderer || !ctx || !renderOptions) return;
    renderer.render(ctx, engine.state, renderOptions);
  }, [gameState, shouldRunLoop]);

  useEffect(() => {
    renderOptionsRef.current = {
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      pipeSkins: PIPE_SKINS,
      birdFrames,
      birdSkinIndex: birdSkin,
      pipeSkinIndex,
      showHitbox: settingsRef.current.showHitbox,
      showGhost: settingsRef.current.showGhost,
      ghostRun,
      reducedMotion: settingsRef.current.reducedMotion,
      practiceMode: settingsRef.current.practiceMode,
    };
  }, [birdFrames, birdSkin, ghostRun, pipeSkinIndex, settings]);

  useEffect(() => () => {
    if (milestoneTimeoutRef.current) clearTimeout(milestoneTimeoutRef.current);
  }, []);

  const settingsPanel = (
    <div className="space-y-4 text-sm text-slate-100">
      <div className="space-y-2">
        <label className="flex flex-col text-sm">
          <span className="text-xs uppercase tracking-widest text-white/60">Difficulty</span>
          <select
            className="mt-1 rounded border border-white/20 bg-white/90 px-3 py-2 text-black"
            value={settings.gravityVariant}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                gravityVariant: parseInt(e.target.value, 10),
              }))
            }
          >
            {GRAVITY_VARIANTS.map((variant, index) => (
              <option key={variant.name} value={index}>
                {variant.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center justify-between gap-4">
          <span>
            <span className="font-semibold">Practice mode</span>
            <span className="block text-xs text-white/60">
              Wider gaps with relaxed collisions.
            </span>
          </span>
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-white/40 bg-white/80 text-sky-500 focus:ring-sky-400"
            aria-label="Practice mode"
            checked={settings.practiceMode}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                practiceMode: e.target.checked,
              }))
            }
          />
        </label>
        <label className="flex items-center justify-between gap-4">
          <span>
            <span className="font-semibold">Ghost run</span>
            <span className="block text-xs text-white/60">Overlay best run.</span>
          </span>
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-white/40 bg-white/80 text-sky-500 focus:ring-sky-400"
            aria-label="Ghost run"
            checked={settings.showGhost}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                showGhost: e.target.checked,
              }))
            }
          />
        </label>
      </div>
      <div className="space-y-2">
        <label className="flex items-center justify-between gap-4">
          <span>
            <span className="font-semibold">Reduced motion</span>
            <span className="block text-xs text-white/60">
              Calms background animation.
            </span>
          </span>
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-white/40 bg-white/80 text-sky-500 focus:ring-sky-400"
            aria-label="Reduced motion"
            checked={settings.reducedMotion}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                reducedMotion: e.target.checked,
              }))
            }
          />
        </label>
        <label className="flex items-center justify-between gap-4">
          <span>
            <span className="font-semibold">120 Hz mode</span>
            <span className="block text-xs text-white/60">Higher refresh rate.</span>
          </span>
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-white/40 bg-white/80 text-sky-500 focus:ring-sky-400"
            aria-label="120 Hz mode"
            checked={settings.highHz}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                highHz: e.target.checked,
              }))
            }
          />
        </label>
        <label className="flex items-center justify-between gap-4">
          <span>
            <span className="font-semibold">Hitbox overlay</span>
            <span className="block text-xs text-white/60">Debug collision bounds.</span>
          </span>
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-white/40 bg-white/80 text-sky-500 focus:ring-sky-400"
            aria-label="Hitbox overlay"
            checked={settings.showHitbox}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                showHitbox: e.target.checked,
              }))
            }
          />
        </label>
      </div>
      <div className="space-y-2">
        <div className="text-xs uppercase tracking-widest text-white/60">Controls</div>
        <InputRemap
          mapping={mapping}
          setKey={setKey}
          actions={{ flap: 'Space', pause: 'Escape' }}
        />
      </div>
    </div>
  );

  return (
    <GameLayout
      gameId="flappy-bird"
      score={score}
      highScore={bestScore}
      onPauseChange={handlePauseChange}
      onRestart={restartGame}
      pauseHotkeys={[mapping?.pause || 'Escape']}
      settingsPanel={settingsPanel}
      isFocused={isWindowFocused}
    >
      <div className="relative h-full w-full">
        {milestoneMessage && (
          <div className="pointer-events-none absolute left-1/2 top-8 z-30 -translate-x-1/2 rounded-full bg-white/20 px-4 py-2 text-sm font-semibold uppercase tracking-widest text-yellow-200 shadow-lg backdrop-blur transition-opacity duration-300">
            {milestoneMessage}
          </div>
        )}
        <canvas
          ref={canvasRef}
          className="h-full w-full touch-none bg-black focus:outline-none focus:ring-2 focus:ring-sky-400"
          role="img"
          aria-label="Flappy Bird game"
          tabIndex={0}
          onPointerDown={(event) => {
            if (event.cancelable) event.preventDefault();
            handleFlapAction();
          }}
        />

        {gameState === 'menu' && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center space-y-6 bg-black/80 p-6 text-white">
            <div className="grid w-full max-w-4xl gap-6 md:grid-cols-2">
              <div className="space-y-4 text-left">
                <label className="flex flex-col text-sm">
                  <span className="text-xs uppercase tracking-widest text-white/60">Bird Skin</span>
                  <select
                    className="mt-1 rounded border border-white/20 bg-white/90 px-3 py-2 text-black"
                    value={birdSkin}
                    onChange={(e) => setBirdSkin(parseInt(e.target.value, 10))}
                    aria-label="Bird Skin"
                  >
                    {BIRD_SKINS.map((name, i) => (
                      <option key={name} value={i}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col text-sm">
                  <span className="text-xs uppercase tracking-widest text-white/60">Pipe Skin</span>
                  <select
                    className="mt-1 rounded border border-white/20 bg-white/90 px-3 py-2 text-black"
                    value={pipeSkinIndex}
                    onChange={(e) => setPipeSkinIndex(parseInt(e.target.value, 10))}
                    aria-label="Pipe Skin"
                  >
                    {PIPE_SKINS.map((_, i) => (
                      <option key={i} value={i}>
                        {`Skin ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </label>
                {settingsPanel}
                <div className="rounded-lg bg-white/10 p-4 text-xs uppercase tracking-widest text-white/70">
                  <p className="text-white">Controls</p>
                  <p className="mt-2 text-[11px] text-white/70">
                    {isTouch ? 'Tap the play area to flap.' : 'Space or click to flap.'}
                  </p>
                  <p className="mt-1 text-[11px] text-white/60">
                    Gamepad: press A / primary button or push up to flap.
                  </p>
                  <p className="mt-2 text-[11px] text-white/60">
                    Use the settings button to remap keys.
                  </p>
                </div>
              </div>
              <div className="rounded-lg bg-white/10 p-4 backdrop-blur">
                <h3 className="text-lg font-semibold">High Scores</h3>
                <p className="text-sm text-white/70">
                  Best overall:{' '}
                  <span className="font-semibold text-white">{bestOverall}</span>
                </p>
                <ul className="mt-3 space-y-1 text-sm">
                  {leaderboard.length ? (
                    leaderboard.map(({ id, score: entryScore }) => (
                      <li key={id} className="flex items-center justify-between rounded bg-black/30 px-3 py-1">
                        <span className="font-semibold uppercase tracking-wide text-white/80">Run</span>
                        <span>{entryScore}</span>
                      </li>
                    ))
                  ) : (
                    <li className="rounded bg-black/30 px-3 py-2 text-white/60">
                      No runs recorded yet.
                    </li>
                  )}
                </ul>
              </div>
            </div>
            {assetsLoading && (
              <p className="text-xs uppercase tracking-widest text-white/60">Loading assets…</p>
            )}
            {assetsError && (
              <p className="text-xs uppercase tracking-widest text-red-200">
                Some assets failed to load. Try refreshing.
              </p>
            )}
            <button
              type="button"
              className="w-40 rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold uppercase tracking-widest text-white shadow-lg transition hover:bg-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-300"
              onClick={startGame}
              disabled={!isTestEnv && assetsLoading}
            >
              Start
            </button>
          </div>
        )}

        {gameState === 'gameover' && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center space-y-6 bg-black/75 p-6 text-white">
            <div className="w-full max-w-md rounded-lg bg-white/10 p-6 text-center shadow-xl backdrop-blur">
              <h3 className="text-3xl font-semibold">Game Over</h3>
              <p className="mt-4 text-lg">Final score: {score}</p>
              <p className="text-sm text-white/70">Best this mode: {bestScore}</p>
              <p className="text-sm text-white/60">Global best: {bestOverall}</p>
              {lastRunRef.current && (
                <p className="mt-2 text-xs text-white/60">
                  Press R to replay your last run.
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                className="rounded-full bg-sky-500 px-5 py-2 text-sm font-semibold uppercase tracking-widest text-white shadow hover:bg-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-300"
                onClick={restartGame}
              >
                Play Again
              </button>
              {lastRunRef.current && (
                <button
                  type="button"
                  className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold uppercase tracking-widest text-white shadow hover:bg-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-300"
                  onClick={startReplay}
                >
                  Replay Last
                </button>
              )}
              <button
                type="button"
                className="rounded-full bg-white/20 px-5 py-2 text-sm font-semibold uppercase tracking-widest text-white hover:bg-white/30 focus:outline-none focus:ring-4 focus:ring-white/40"
                onClick={returnToMenu}
              >
                Change Skins
              </button>
            </div>
          </div>
        )}

        <div ref={liveRef} className="sr-only" aria-live="polite" />
      </div>
    </GameLayout>
  );
};

export default FlappyBird;
