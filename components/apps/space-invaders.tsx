import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GameLayout from './GameLayout';
import useCanvasResize from '../../hooks/useCanvasResize';
import usePersistentState from '../../hooks/usePersistentState';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';
import { useGameLoop, VirtualPad } from './Games/common';
import {
  HIGH_SCORE_KEY,
  GameState,
  InputState,
  StepEvent,
  createGame,
  stepGame,
} from '../../apps/games/space-invaders';

const BASE_WIDTH = 480;
const BASE_HEIGHT = 360;

const isTextInput = (target: EventTarget | null) => {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
};

const SpaceInvaders: React.FC = () => {
  const canvasRef = useCanvasResize(BASE_WIDTH, BASE_HEIGHT);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const stateRef = useRef<GameState>(createGame({ width: BASE_WIDTH, height: BASE_HEIGHT }));
  const inputRef = useRef<InputState>({ left: false, right: false, fire: false });
  const [stage, setStage] = useState(1);
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = usePersistentState(
    HIGH_SCORE_KEY,
    0,
    (value): value is number => typeof value === 'number',
  );
  const [difficulty, setDifficulty] = usePersistentState(
    'space-invaders-difficulty',
    1,
    (value): value is number => typeof value === 'number',
  );
  const [soundEnabled, setSoundEnabled] = usePersistentState(
    'space-invaders-sound',
    true,
    (value): value is boolean => typeof value === 'boolean',
  );
  const [touchControls, setTouchControls] = usePersistentState(
    'space-invaders-touch',
    false,
    (value): value is boolean => typeof value === 'boolean',
  );
  const [paused, setPaused] = useState(false);
  const [status, setStatus] = useState<'ready' | 'playing' | 'wave' | 'gameover'>(
    'ready',
  );
  const [ariaMessage, setAriaMessage] = useState('');
  const prefersReducedMotion = usePrefersReducedMotion();
  const audioCtxRef = useRef<AudioContext | null>(null);
  const hasInteractedRef = useRef(false);
  const overlayTimeout = useRef<number | null>(null);
  const lastHudRef = useRef({
    stage: 1,
    lives: 3,
    score: 0,
    highScore,
  });

  const startGame = useCallback(() => {
    stateRef.current = createGame({
      width: BASE_WIDTH,
      height: BASE_HEIGHT,
      highScore,
    });
    setStage(1);
    setLives(3);
    setScore(0);
    setStatus('playing');
  }, [highScore]);

  const handleAudio = useCallback((frequency: number, duration = 0.08) => {
    if (!soundEnabled || !hasInteractedRef.current) return;
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = 0.08;
    osc.frequency.value = frequency;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }, [soundEnabled]);

  const announce = useCallback((message: string) => {
    setAriaMessage(message);
    window.clearTimeout(overlayTimeout.current || 0);
    overlayTimeout.current = window.setTimeout(() => setAriaMessage(''), 1200);
  }, []);

  const updateHud = useCallback(() => {
    const state = stateRef.current;
    if (state.stage !== lastHudRef.current.stage) {
      lastHudRef.current.stage = state.stage;
      setStage(state.stage);
    }
    if (state.lives !== lastHudRef.current.lives) {
      lastHudRef.current.lives = state.lives;
      setLives(state.lives);
    }
    if (state.score !== lastHudRef.current.score) {
      lastHudRef.current.score = state.score;
      setScore(state.score);
    }
    if (state.highScore !== lastHudRef.current.highScore) {
      lastHudRef.current.highScore = state.highScore;
      setHighScore(state.highScore);
    }
  }, [setHighScore]);

  const handleEvents = useCallback(
    (events: StepEvent[]) => {
      events.forEach((event) => {
        if (event.type === 'score') handleAudio(620);
        if (event.type === 'ufo-destroyed') handleAudio(900, 0.12);
        if (event.type === 'life-lost') handleAudio(180, 0.2);
        if (event.type === 'wave-complete') {
          setStatus('wave');
          announce('Wave cleared. Get ready.');
        }
        if (event.type === 'game-over') {
          setStatus('gameover');
          announce('Game over.');
        }
        if (event.message) {
          announce(event.message);
        }
      });
    },
    [announce, handleAudio],
  );

  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!ctxRef.current) {
      ctxRef.current = canvas.getContext('2d');
    }
    const ctx = ctxRef.current;
    if (!ctx) return;
    const state = stateRef.current;

    ctx.clearRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

    const gradient = ctx.createLinearGradient(0, 0, 0, BASE_HEIGHT);
    gradient.addColorStop(0, '#020617');
    gradient.addColorStop(1, '#0f172a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    for (let i = 0; i < 30; i += 1) {
      const x = (i * 73) % BASE_WIDTH;
      const y = (i * 41) % BASE_HEIGHT;
      ctx.fillRect(x, y, 1.5, 1.5);
    }

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(
      state.player.x,
      state.player.y,
      state.player.w,
      state.player.h,
    );

    if (state.player.shield) {
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        state.player.x - 2,
        state.player.y - 2,
        state.player.w + 4,
        state.player.h + 4,
      );
      ctx.fillStyle = '#22d3ee';
      ctx.fillRect(
        state.player.x - 2,
        state.player.y - 6,
        ((state.player.w + 4) * state.player.shieldHp) / 3,
        3,
      );
    }

    ctx.fillStyle = '#34d399';
    state.invaders.forEach((invader) => {
      if (!invader.alive) return;
      const bob = prefersReducedMotion ? 0 : Math.sin(invader.phase) * 2;
      ctx.fillRect(invader.x, invader.y + bob, invader.w, invader.h);
    });

    ctx.fillStyle = '#facc15';
    state.bullets.forEach((bullet) => {
      if (!bullet.active) return;
      ctx.fillRect(bullet.x, bullet.y, 2, 6);
    });

    state.shields.forEach((shield) => {
      ctx.fillStyle = shield.hp > 3 ? '#94a3b8' : '#64748b';
      ctx.fillRect(shield.x, shield.y, shield.w, shield.h);
    });

    state.powerUps.forEach((powerUp) => {
      if (!powerUp.active) return;
      ctx.fillStyle =
        powerUp.type === 'shield'
          ? '#22d3ee'
          : powerUp.type === 'rapid'
            ? '#fb923c'
            : '#f472b6';
      ctx.fillRect(powerUp.x - 5, powerUp.y - 5, 10, 10);
    });

    if (state.ufo.active) {
      ctx.fillStyle = '#f472b6';
      ctx.fillRect(state.ufo.x, state.ufo.y, state.ufo.w, state.ufo.h);
    }
  }, [canvasRef, prefersReducedMotion]);

  useEffect(() => {
    lastHudRef.current.highScore = highScore;
  }, [highScore]);

  useGameLoop(
    (delta) => {
      if (status !== 'playing' || paused) {
        return;
      }
      const step = stepGame(stateRef.current, inputRef.current, delta, {
        difficulty,
      });
      handleEvents(step.events);
      updateHud();
      renderFrame();

      if (stateRef.current.gameOver) {
        setStatus('gameover');
      }
    },
    status === 'playing' && !paused,
  );

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    node.focus();
  }, []);

  useEffect(() => {
    renderFrame();
  }, [renderFrame, paused, status]);

  useEffect(() => {
    inputRef.current.left = false;
    inputRef.current.right = false;
    inputRef.current.fire = false;
  }, [status]);

  useEffect(() => {
    if (paused) {
      announce('Paused');
    } else if (status === 'playing') {
      announce('Resumed');
    }
  }, [announce, paused, status]);

  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
      if (overlayTimeout.current) {
        window.clearTimeout(overlayTimeout.current);
      }
    };
  }, []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (isTextInput(event.target)) return;
      if (!hasInteractedRef.current) hasInteractedRef.current = true;
      if (event.repeat) return;
      if (status === 'ready' && (event.code === 'Space' || event.code === 'Enter')) {
        event.preventDefault();
        startGame();
        return;
      }
      if (status !== 'playing') return;
      if (event.code === 'ArrowLeft' || event.code === 'KeyA') {
        inputRef.current.left = true;
      }
      if (event.code === 'ArrowRight' || event.code === 'KeyD') {
        inputRef.current.right = true;
      }
      if (event.code === 'Space' || event.code === 'Enter') {
        inputRef.current.fire = true;
      }
    },
    [startGame, status],
  );

  const handleKeyUp = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (status !== 'playing') return;
    if (event.code === 'ArrowLeft' || event.code === 'KeyA') {
      inputRef.current.left = false;
    }
    if (event.code === 'ArrowRight' || event.code === 'KeyD') {
      inputRef.current.right = false;
    }
    if (event.code === 'Space' || event.code === 'Enter') {
      inputRef.current.fire = false;
    }
  }, [status]);

  const touchHandlers = useMemo(
    () => ({
      onDirection: (dir: { x: number; y: number }) => {
        if (!hasInteractedRef.current) hasInteractedRef.current = true;
        inputRef.current.left = dir.x < 0;
        inputRef.current.right = dir.x > 0;
      },
      onButton: (button: string) => {
        if (!hasInteractedRef.current) hasInteractedRef.current = true;
        if (button === 'A') {
          inputRef.current.fire = true;
        }
      },
      clear: () => {
        inputRef.current.left = false;
        inputRef.current.right = false;
        inputRef.current.fire = false;
      },
    }),
    [],
  );

  const settingsPanel = (
    <div className="space-y-3 text-sm text-slate-100">
      <div>
        <label htmlFor="si-difficulty" className="block text-xs uppercase text-slate-400">
          Difficulty
        </label>
        <input
          id="si-difficulty"
          type="range"
          min="1"
          max="3"
          step="1"
          value={difficulty}
          onChange={(event) => setDifficulty(Number(event.target.value))}
          className="w-full"
        />
      </div>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={soundEnabled}
          onChange={() => setSoundEnabled((value) => !value)}
        />
        <span>Sound effects</span>
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={touchControls}
          onChange={() => setTouchControls((value) => !value)}
        />
        <span>Touch controls</span>
      </label>
    </div>
  );

  const overlayLabel =
    status === 'ready'
      ? 'Press Space or Enter to start.'
      : status === 'wave'
        ? 'Wave complete!'
        : status === 'gameover'
          ? 'Game over.'
          : '';

  return (
    <GameLayout
      gameId="space-invaders"
      stage={stage}
      lives={lives}
      score={score}
      highScore={highScore}
      onPauseChange={setPaused}
      onRestart={startGame}
      pauseHotkeys={["p", "escape"]}
      restartHotkeys={["r"]}
      settingsPanel={settingsPanel}
    >
      <div
        ref={containerRef}
        className="relative h-full w-full bg-black text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onBlur={() => {
          inputRef.current.left = false;
          inputRef.current.right = false;
          inputRef.current.fire = false;
        }}
        onPointerDown={() => {
          if (!hasInteractedRef.current) hasInteractedRef.current = true;
          containerRef.current?.focus();
        }}
      >
        <canvas ref={canvasRef} className="h-full w-full" />
        {(status === 'ready' || status === 'wave' || status === 'gameover') && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-20">
            <div className="text-center space-y-3 px-4">
              <h2 className="text-xl font-semibold">
                {status === 'ready'
                  ? 'Space Invaders'
                  : status === 'wave'
                    ? 'Wave Clear'
                    : 'Game Over'}
              </h2>
              <p className="text-sm text-slate-200">{overlayLabel}</p>
              <button
                type="button"
                className="px-4 py-2 rounded bg-emerald-500 text-black font-semibold focus:outline-none focus:ring"
                onClick={() => {
                  if (status === 'wave') {
                    setStatus('playing');
                    return;
                  }
                  startGame();
                }}
              >
                {status === 'gameover'
                  ? 'Restart'
                  : status === 'wave'
                    ? 'Next Wave'
                    : 'Start'}
              </button>
            </div>
          </div>
        )}
        {touchControls && (
          <div
            className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20"
            onPointerUp={touchHandlers.clear}
            onPointerCancel={touchHandlers.clear}
          >
            <VirtualPad
              onDirection={touchHandlers.onDirection}
              onButton={touchHandlers.onButton}
            />
          </div>
        )}
        <div aria-live="polite" className="sr-only">
          {ariaMessage}
        </div>
      </div>
    </GameLayout>
  );
};

export default SpaceInvaders;
