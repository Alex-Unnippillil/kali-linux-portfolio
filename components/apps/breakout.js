"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import seedrandom from 'seedrandom';
import GameLayout from './GameLayout';
import useCanvasResize from '../../hooks/useCanvasResize';
import BreakoutEditor from './breakoutEditor';
import BreakoutLevels from './breakoutLevels';
import usePersistentState from '../../hooks/usePersistentState';
import { useGameLoop } from './Games/common';
import {
  DEFAULT_LAYOUT,
  GRID_COLS,
  getBuiltInLevelForStage,
  normalizeLayout,
} from '../../games/breakout/levels';
import {
  DEFAULT_LIVES,
  advanceStage,
  createDefaultProgress,
  loadProgress,
  sanitizeProgress,
  saveProgress,
  resetProgress,
} from '../../games/breakout/progress';

const WIDTH = 400;
const HEIGHT = 300;
const HUD_HEIGHT = 24;
const PADDLE_WIDTH = WIDTH * 0.15;
const PADDLE_HEIGHT = HEIGHT * 0.033;
const PADDLE_Y = HEIGHT - PADDLE_HEIGHT * 2;
const BALL_RADIUS = 5;
const BRICK_WIDTH = WIDTH / GRID_COLS;
const BRICK_HEIGHT = HEIGHT * 0.05;
const BALL_SPEED = 220;
const MAGNET_DURATION = 4; // seconds
const TRAIL_LENGTH = 12;
const STAGE_CLEAR_BONUS = 100;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const brickColor = (type) => {
  switch (type) {
    case 2:
      return '#43d9a1';
    case 3:
      return '#fb7185';
    case 1:
    default:
      return '#94a3b8';
  }
};

const createBricks = (layout) => {
  const bricks = [];
  for (let r = 0; r < layout.length; r += 1) {
    for (let c = 0; c < layout[r].length; c += 1) {
      const type = layout[r][c];
      if (type > 0) {
        bricks.push({
          x: c * BRICK_WIDTH,
          y: HUD_HEIGHT + r * (BRICK_HEIGHT + 2),
          w: BRICK_WIDTH - 2,
          h: BRICK_HEIGHT,
          type,
          alive: true,
        });
      }
    }
  }
  return bricks;
};

const createBall = (paddleX) => ({
  x: paddleX + PADDLE_WIDTH / 2,
  y: PADDLE_Y - BALL_RADIUS,
  vx: 0,
  vy: -BALL_SPEED,
  speed: BALL_SPEED,
  stuck: true,
  offset: PADDLE_WIDTH / 2,
  trail: [],
});

const computeAngleVelocity = (angle, speed) => ({
  vx: Math.sin(angle) * speed,
  vy: -Math.cos(angle) * speed,
});

const shouldShowContinue = (session) =>
  session.persist &&
  (session.progress.stage > 1 ||
    session.progress.score > 0 ||
    session.progress.lives < DEFAULT_LIVES);

const useLatestRef = (value) => {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
};

const Breakout = () => {
  const canvasRef = useCanvasResize(WIDTH, HEIGHT);
  const ctxRef = useRef(null);
  const paddleRef = useRef(WIDTH / 2 - PADDLE_WIDTH / 2);
  const ballsRef = useRef([]);
  const bricksRef = useRef([]);
  const magnetRef = useRef(0);
  const audioCtxRef = useRef(null);

  const stored = useMemo(() => sanitizeProgress(loadProgress()), []);
  const initialLayout = useMemo(
    () => normalizeLayout(getBuiltInLevelForStage(stored.stage).layout),
    [stored.stage],
  );

  const [session, setSession] = useState(() => ({
    persist: true,
    name: getBuiltInLevelForStage(stored.stage).name,
    layout: initialLayout,
    progress: stored,
  }));
  const sessionRef = useLatestRef(session);

  const [soundEnabled, setSoundEnabled] = usePersistentState(
    'breakout:sound-enabled',
    true,
    (v) => typeof v === 'boolean',
  );
  const soundEnabledRef = useLatestRef(soundEnabled);

  const [highScore, setHighScore] = usePersistentState(
    'breakout:high-score',
    0,
    (v) => typeof v === 'number' && Number.isFinite(v),
  );

  const [selecting, setSelecting] = useState(true);
  const [layoutPaused, setLayoutPaused] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const playSound = useCallback(
    (frequency) => {
      if (!soundEnabledRef.current) return;
      try {
        if (!audioCtxRef.current) {
          audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        const ctx = audioCtxRef.current;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = frequency;
        gain.gain.value = 0.15;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } catch {
        /* ignore audio errors */
      }
    },
    [soundEnabledRef],
  );

  const resetGameState = useCallback((layout) => {
    const normalized = normalizeLayout(layout || DEFAULT_LAYOUT);
    paddleRef.current = WIDTH / 2 - PADDLE_WIDTH / 2;
    ballsRef.current = [createBall(paddleRef.current)];
    bricksRef.current = createBricks(normalized);
    magnetRef.current = 0;
  }, []);

  useEffect(() => {
    resetGameState(session.layout);
  }, [resetGameState, session.layout]);

  useEffect(() => {
    if (session.progress.score > highScore) {
      setHighScore(session.progress.score);
    }
  }, [session.progress.score, highScore, setHighScore]);

  useEffect(() => {
    if (!session.persist) return;
    saveProgress(session.progress);
  }, [session.persist, session.progress]);

  const resetStage = useCallback(() => {
    let layoutToStart = sessionRef.current.layout;
    setSession((prev) => {
      if (prev.persist) {
        const level = getBuiltInLevelForStage(prev.progress.stage);
        layoutToStart = normalizeLayout(level.layout);
        return {
          persist: true,
          name: level.name,
          layout: layoutToStart,
          progress: createDefaultProgress(prev.progress.stage),
        };
      }
      layoutToStart = normalizeLayout(prev.layout);
      return {
        ...prev,
        layout: layoutToStart,
        progress: createDefaultProgress(1),
      };
    });
    setStatusMessage('');
    resetGameState(layoutToStart);
    setSelecting(false);
  }, [resetGameState, sessionRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    ctxRef.current = ctx;

    const handlePointer = (event) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      paddleRef.current = clamp(x - PADDLE_WIDTH / 2, 0, WIDTH - PADDLE_WIDTH);
    };

    const release = () => {
      if (selecting) return;
      ballsRef.current.forEach((ball) => {
        if (!ball.stuck) return;
        ball.stuck = false;
        const angle = (Math.random() - 0.5) * 0.6;
        const { vx, vy } = computeAngleVelocity(angle, ball.speed);
        ball.vx = vx;
        ball.vy = vy;
        ball.trail = [];
      });
      playSound(520);
    };

    const handleKey = (event) => {
      if (selecting) return;
      if (event.key === 'ArrowLeft') {
        paddleRef.current = clamp(
          paddleRef.current - 20,
          0,
          WIDTH - PADDLE_WIDTH,
        );
      } else if (event.key === 'ArrowRight') {
        paddleRef.current = clamp(
          paddleRef.current + 20,
          0,
          WIDTH - PADDLE_WIDTH,
        );
      } else if (event.key === ' ' || event.key === 'ArrowUp') {
        event.preventDefault();
        release();
      } else if (event.key.toLowerCase() === 'r') {
        event.preventDefault();
        resetStage();
      } else if (event.key.toLowerCase() === 'm') {
        setSoundEnabled((prev) => !prev);
      }
    };

    canvas.addEventListener('pointermove', handlePointer);
    canvas.addEventListener('click', release);
    window.addEventListener('keydown', handleKey);

    return () => {
      canvas.removeEventListener('pointermove', handlePointer);
      canvas.removeEventListener('click', release);
      window.removeEventListener('keydown', handleKey);
    };
  }, [canvasRef, selecting, playSound, resetStage, setSoundEnabled]);

  const addScore = useCallback((points) => {
    if (!points) return;
    setSession((prev) => ({
      ...prev,
      progress: {
        ...prev.progress,
        score: prev.progress.score + points,
      },
    }));
  }, []);

  const handleLifeLost = useCallback(() => {
    let remainingLives = 0;
    let layoutToStart = sessionRef.current.layout;
    const wasPersist = sessionRef.current.persist;
    setSession((prev) => {
      const lives = Math.max(prev.progress.lives - 1, 0);
      remainingLives = lives;
      if (lives > 0) {
        return {
          ...prev,
          progress: { ...prev.progress, lives },
        };
      }
      const reset = createDefaultProgress(1);
      if (prev.persist) {
        const nextLevel = getBuiltInLevelForStage(reset.stage);
        layoutToStart = normalizeLayout(nextLevel.layout);
        return {
          persist: true,
          name: nextLevel.name,
          layout: layoutToStart,
          progress: reset,
        };
      }
      layoutToStart = normalizeLayout(prev.layout);
      return {
        ...prev,
        layout: layoutToStart,
        progress: reset,
      };
    });
    playSound(220);
    if (remainingLives > 0) {
      setStatusMessage('Life lost — try again!');
      resetGameState(layoutToStart);
      setSelecting(false);
    } else {
      setStatusMessage('Game over! Select a stage to restart.');
      setSelecting(true);
      if (wasPersist) {
        resetProgress();
      }
    }
  }, [playSound, resetGameState, sessionRef]);

  const completeStage = useCallback(() => {
    setSession((prev) => {
      if (prev.persist) {
        const rewardLives = Math.min(prev.progress.lives + 1, DEFAULT_LIVES);
        const nextProgress = advanceStage(prev.progress, {
          scoreBonus: STAGE_CLEAR_BONUS,
          lives: rewardLives,
        });
        const nextLevel = getBuiltInLevelForStage(nextProgress.stage);
        return {
          persist: true,
          name: nextLevel.name,
          layout: normalizeLayout(nextLevel.layout),
          progress: nextProgress,
        };
      }
      return {
        ...prev,
        progress: {
          stage: prev.progress.stage + 1,
          lives: DEFAULT_LIVES,
          score: prev.progress.score + STAGE_CLEAR_BONUS,
        },
      };
    });
    playSound(880);
    setStatusMessage('Stage cleared! Continue when ready.');
    setSelecting(true);
  }, [playSound]);

  const handleLevelSelect = useCallback(
    (choice) => {
      if (choice.type === 'built-in') {
        const progress = createDefaultProgress(choice.index);
        const layout = normalizeLayout(choice.layout);
        setSession({
          persist: true,
          name: choice.name,
          layout,
          progress,
        });
        resetGameState(layout);
      } else {
        const layout = normalizeLayout(choice.layout);
        setSession({
          persist: false,
          name: choice.name,
          layout,
          progress: createDefaultProgress(1),
        });
        resetGameState(layout);
      }
      setStatusMessage('');
      setSelecting(false);
    },
    [resetGameState],
  );

  const handleContinue = useCallback(() => {
    resetGameState(sessionRef.current.layout);
    setStatusMessage('');
    setSelecting(false);
  }, [resetGameState, sessionRef]);

  const handleResetProgress = useCallback(() => {
    const progress = resetProgress();
    const level = getBuiltInLevelForStage(progress.stage);
    const layout = normalizeLayout(level.layout);
    setSession({
      persist: true,
      name: level.name,
      layout,
      progress,
    });
    resetGameState(layout);
    setStatusMessage('Progress reset. Choose a stage.');
    setSelecting(true);
  }, [resetGameState]);

  const running = !selecting && !layoutPaused;

  const updateGame = useCallback(
    (delta) => {
      const ctx = ctxRef.current;
      if (!ctx) return;

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      if (magnetRef.current > 0) {
        magnetRef.current = Math.max(0, magnetRef.current - delta);
      }

      const extraBalls = [];
      let gainedScore = 0;

      ballsRef.current.forEach((ball) => {
        if (ball.stuck) {
          ball.x = paddleRef.current + ball.offset;
          ball.y = PADDLE_Y - BALL_RADIUS;
          ball.trail = [];
          return;
        }
        ball.trail.push({ x: ball.x, y: ball.y });
        if (ball.trail.length > TRAIL_LENGTH) ball.trail.shift();

        ball.x += ball.vx * delta;
        ball.y += ball.vy * delta;

        if (ball.x <= BALL_RADIUS) {
          ball.x = BALL_RADIUS;
          ball.vx = Math.abs(ball.vx);
          playSound(420);
        } else if (ball.x >= WIDTH - BALL_RADIUS) {
          ball.x = WIDTH - BALL_RADIUS;
          ball.vx = -Math.abs(ball.vx);
          playSound(420);
        }

        if (ball.y <= HUD_HEIGHT + BALL_RADIUS) {
          ball.y = HUD_HEIGHT + BALL_RADIUS;
          ball.vy = Math.abs(ball.vy);
          playSound(420);
        }

        if (
          ball.vy > 0 &&
          ball.y >= PADDLE_Y - BALL_RADIUS &&
          ball.x >= paddleRef.current &&
          ball.x <= paddleRef.current + PADDLE_WIDTH
        ) {
          const offset =
            (ball.x - (paddleRef.current + PADDLE_WIDTH / 2)) /
            (PADDLE_WIDTH / 2);
          const angle = (offset * Math.PI) / 3;
          const { vx, vy } = computeAngleVelocity(angle, ball.speed);
          ball.vx = vx;
          ball.vy = vy;
          ball.y = PADDLE_Y - BALL_RADIUS;
          if (magnetRef.current > 0) {
            ball.stuck = true;
            ball.offset = clamp(ball.x - paddleRef.current, 0, PADDLE_WIDTH);
          }
          playSound(500);
        }

        bricksRef.current.forEach((brick) => {
          if (!brick.alive) return;
          if (
            ball.x + BALL_RADIUS > brick.x &&
            ball.x - BALL_RADIUS < brick.x + brick.w &&
            ball.y + BALL_RADIUS > brick.y &&
            ball.y - BALL_RADIUS < brick.y + brick.h
          ) {
            brick.alive = false;
            ball.vy *= -1;
            gainedScore += brick.type === 1 ? 25 : brick.type === 2 ? 50 : 75;
            if (brick.type === 2) {
              extraBalls.push({
                ...ball,
                vx: -ball.vx || ball.speed,
                vy: ball.vy,
                stuck: false,
                trail: [],
              });
              playSound(760);
            } else if (brick.type === 3) {
              magnetRef.current = MAGNET_DURATION;
              playSound(640);
            } else {
              playSound(680);
            }
          }
        });
      });

      if (extraBalls.length) {
        ballsRef.current.push(...extraBalls);
      }
      if (gainedScore) addScore(gainedScore);

      ballsRef.current = ballsRef.current.filter((ball) => ball.y <= HEIGHT + BALL_RADIUS);
      if (ballsRef.current.length === 0) {
        handleLifeLost();
        return;
      }

      const remaining = bricksRef.current.filter((brick) => brick.alive);
      if (remaining.length === 0) {
        completeStage();
        return;
      }

      remaining.forEach((brick) => {
        ctx.fillStyle = brickColor(brick.type);
        ctx.fillRect(brick.x, brick.y, brick.w, brick.h);
      });

      ctx.fillStyle = '#fff';
      ctx.fillRect(paddleRef.current, PADDLE_Y, PADDLE_WIDTH, PADDLE_HEIGHT);

      ballsRef.current.forEach((ball) => {
        ball.trail.forEach((point, index) => {
          ctx.fillStyle = `rgba(255,255,255,${((index + 1) / ball.trail.length) * 0.4})`;
          ctx.beginPath();
          ctx.arc(point.x, point.y, BALL_RADIUS, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      });

      if (magnetRef.current > 0) {
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(10, 6, (magnetRef.current / MAGNET_DURATION) * 60, 6);
      }
    },
    [addScore, completeStage, handleLifeLost, playSound],
  );

  useGameLoop(updateGame, running);

  const canContinue = shouldShowContinue(session);

  return (
    <GameLayout
      gameId="breakout"
      stage={session.progress.stage}
      lives={session.progress.lives}
      score={session.progress.score}
      highScore={highScore}
      editor={<BreakoutEditor onLoad={(grid) => handleLevelSelect({ type: 'custom', name: 'Editor', layout: grid })} />}
      onPauseChange={setLayoutPaused}
    >
      {selecting && (
        <BreakoutLevels
          onSelect={handleLevelSelect}
          onContinue={handleContinue}
          canContinue={canContinue}
          status={statusMessage}
          onReset={handleResetProgress}
        />
      )}
      <canvas ref={canvasRef} className="w-full h-full bg-black" />
      <div className="absolute bottom-2 right-2 z-30 flex flex-col gap-2 items-end text-sm">
        <button
          type="button"
          onClick={() => setSoundEnabled((prev) => !prev)}
          className="px-3 py-1 bg-gray-700 text-white rounded"
        >
          Sound: {soundEnabled ? 'On' : 'Off'}
        </button>
        <button
          type="button"
          onClick={resetStage}
          className="px-3 py-1 bg-gray-700 text-white rounded"
        >
          Reset Stage
        </button>
      </div>
    </GameLayout>
  );
};

export default Breakout;

export const createRng = (seed) => (seed ? seedrandom(seed) : Math.random);
