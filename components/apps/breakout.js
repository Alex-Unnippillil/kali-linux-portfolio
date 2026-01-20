"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import seedrandom from 'seedrandom';
import GameLayout from './GameLayout';
import useCanvasResize from '../../hooks/useCanvasResize';
import BreakoutEditor from './breakoutEditor';
import BreakoutLevels from './breakoutLevels';
import usePersistedState from '../../hooks/usePersistedState';
import useGameControls from './useGameControls';
import { getMapping } from './Games/common/input-remap/useInputMapping';
import {
  BREAKOUT_COLS,
  BREAKOUT_PRESETS,
  BREAKOUT_ROWS,
  DEFAULT_LAYOUT,
  normalizeLayout,
} from './breakoutPresets';

const WIDTH = 400;
const HEIGHT = 300;
const HUD_HEIGHT = 22;
const PADDLE_WIDTH = WIDTH * 0.18;
const PADDLE_HEIGHT = HEIGHT * 0.035;
const PADDLE_Y = HEIGHT - PADDLE_HEIGHT * 2.2;
const BALL_RADIUS = 5;
const BRICK_GAP = 2;
const BRICK_WIDTH = WIDTH / BREAKOUT_COLS;
const BRICK_HEIGHT = HEIGHT * 0.05;
const BASE_SPEED = 180;
const MAX_BALLS = 3;
const TRAIL_LENGTH = 10;
const SUB_STEPS = 3;
const MAGNET_DURATION = 6;

const DEFAULT_MAP = {
  left: 'ArrowLeft',
  right: 'ArrowRight',
  fire: ' ',
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const pointsForBrick = (type) => {
  if (type === 2) return 50;
  if (type === 3) return 75;
  return 25;
};

const circleRectCollision = (ball, rect) => {
  const closestX = clamp(ball.x, rect.x, rect.x + rect.w);
  const closestY = clamp(ball.y, rect.y, rect.y + rect.h);
  const dx = ball.x - closestX;
  const dy = ball.y - closestY;
  const dist2 = dx * dx + dy * dy;
  if (dist2 > BALL_RADIUS * BALL_RADIUS) return null;
  const dist = Math.sqrt(dist2) || 0.0001;
  return {
    nx: dx / dist,
    ny: dy / dist,
    overlap: BALL_RADIUS - dist,
  };
};

const createBricks = (layout) => {
  const grid = normalizeLayout(layout, BREAKOUT_ROWS, BREAKOUT_COLS);
  const bricks = [];
  for (let r = 0; r < grid.length; r += 1) {
    for (let c = 0; c < grid[r].length; c += 1) {
      const type = grid[r][c];
      if (type > 0) {
        bricks.push({
          x: c * BRICK_WIDTH,
          y: HUD_HEIGHT + r * (BRICK_HEIGHT + BRICK_GAP) + 6,
          w: BRICK_WIDTH - BRICK_GAP,
          h: BRICK_HEIGHT,
          type,
          alive: true,
        });
      }
    }
  }
  return bricks;
};

const createBall = (paddleX, rng) => {
  const angle = (-Math.PI / 2) + (rng() - 0.5) * (Math.PI / 3);
  return {
    x: paddleX + PADDLE_WIDTH / 2,
    y: PADDLE_Y - BALL_RADIUS,
    vx: Math.cos(angle) * BASE_SPEED,
    vy: Math.sin(angle) * BASE_SPEED,
    stuck: true,
    offset: PADDLE_WIDTH / 2,
    trail: [],
  };
};

export default function Breakout() {
  const canvasRef = useCanvasResize(WIDTH, HEIGHT);
  const controls = useGameControls(canvasRef, 'breakout');
  const rngRef = useRef(createRng(null));
  const animationRef = useRef(0);
  const lastTimeRef = useRef(0);
  const pointerTargetRef = useRef(null);
  const pointerActiveRef = useRef(false);
  const releaseRef = useRef(false);
  const gameOverRef = useRef(false);

  const paddleRef = useRef({ x: WIDTH / 2 - PADDLE_WIDTH / 2 });
  const ballsRef = useRef([]);
  const bricksRef = useRef([]);
  const bricksRemainingRef = useRef(0);
  const magnetRef = useRef(0);
  const stageRef = useRef(1);
  const livesRef = useRef(3);
  const scoreRef = useRef(0);
  const highScoreRef = useRef(0);

  const selectionRef = useRef({
    layout: DEFAULT_LAYOUT,
    label: 'Default',
    source: 'default',
    presetIndex: 0,
  });

  const [stage, setStage] = useState(1);
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = usePersistedState(
    'breakout-highscore',
    0,
  );
  const [paused, setPaused] = useState(false);
  const [selecting, setSelecting] = useState(true);
  const [announce, setAnnounce] = useState('');
  const [trailEnabled, setTrailEnabled] = usePersistedState(
    'breakout-trail',
    true,
  );
  const [speedMultiplier, setSpeedMultiplier] = usePersistedState(
    'breakout-speed',
    1,
  );
  const [showEditor, setShowEditor] = useState(false);

  const trailEnabledRef = useRef(trailEnabled);
  const speedRef = useRef(speedMultiplier);


  useEffect(() => {
    highScoreRef.current = highScore;
  }, [highScore]);

  useEffect(() => {
    trailEnabledRef.current = trailEnabled;
  }, [trailEnabled]);

  useEffect(() => {
    speedRef.current = speedMultiplier;
  }, [speedMultiplier]);

  const syncHud = useCallback(() => {
    setStage(stageRef.current);
    setLives(livesRef.current);
    setScore(scoreRef.current);
  }, []);

  const resetBalls = useCallback(() => {
    ballsRef.current = [
      {
        ...createBall(paddleRef.current.x, rngRef.current),
        stuck: true,
      },
    ];
  }, []);

  const startLevel = useCallback(({ layout, stageNumber }) => {
    const grid = normalizeLayout(layout, BREAKOUT_ROWS, BREAKOUT_COLS);
    selectionRef.current.layout = grid;
    bricksRef.current = createBricks(grid);
    bricksRemainingRef.current = bricksRef.current.filter((b) => b.alive).length;
    magnetRef.current = 0;
    gameOverRef.current = false;
    stageRef.current = stageNumber ?? stageRef.current;
    paddleRef.current.x = WIDTH / 2 - PADDLE_WIDTH / 2;
    resetBalls();
    syncHud();
  }, [resetBalls, syncHud]);

  useEffect(() => {
    startLevel({
      layout: selectionRef.current.layout,
      stageNumber: stageRef.current,
    });
  }, [startLevel]);

  const announceEvent = useCallback((message) => {
    setAnnounce(message);
  }, []);

  const nextLevel = useCallback(() => {
    if (
      selectionRef.current.source === 'preset' &&
      Number.isFinite(selectionRef.current.presetIndex)
    ) {
      const nextIndex =
        (Number(selectionRef.current.presetIndex) + 1) % BREAKOUT_PRESETS.length;
      const preset = BREAKOUT_PRESETS[nextIndex];
      selectionRef.current.presetIndex = nextIndex;
      selectionRef.current.label = preset.name;
      selectionRef.current.layout = preset.layout;
      stageRef.current = nextIndex + 1;
    } else {
      stageRef.current += 1;
    }

    startLevel({
      layout: selectionRef.current.layout,
      stageNumber: stageRef.current,
    });
    announceEvent('Level cleared');
  }, [announceEvent, startLevel]);

  const releaseBalls = useCallback(() => {
    const rng = rngRef.current;
    ballsRef.current.forEach((ball) => {
      if (!ball.stuck) return;
      const angle = (-Math.PI / 2) + (rng() - 0.5) * (Math.PI / 3);
      ball.vx = Math.cos(angle) * BASE_SPEED;
      ball.vy = Math.sin(angle) * BASE_SPEED;
      ball.stuck = false;
    });
  }, []);

  const loseLife = useCallback(() => {
    livesRef.current -= 1;
    if (livesRef.current <= 0) {
      livesRef.current = 0;
      gameOverRef.current = true;
      announceEvent('Game over');
    } else {
      announceEvent('Life lost');
      resetBalls();
    }
    syncHud();
  }, [announceEvent, resetBalls, syncHud]);

  const handleRestart = useCallback(() => {
    livesRef.current = 3;
    scoreRef.current = 0;
    stageRef.current = 1;
    announceEvent('Game restarted');
    startLevel({
      layout: selectionRef.current.layout,
      stageNumber: stageRef.current,
    });
  }, [announceEvent, startLevel]);

  const handleSelect = useCallback(
    (selection) => {
      if (!selection) {
        setSelecting(false);
        return;
      }
      selectionRef.current = {
        layout: normalizeLayout(selection.layout),
        label: selection.label,
        source: selection.source,
        presetIndex: selection.presetIndex,
        savedName: selection.savedName,
      };
      stageRef.current = Number.isFinite(selection.presetIndex)
        ? Number(selection.presetIndex) + 1
        : 1;
      livesRef.current = 3;
      scoreRef.current = 0;
      setSelecting(false);
      startLevel({
        layout: selectionRef.current.layout,
        stageNumber: stageRef.current,
      });
    },
    [startLevel],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const updateFromPointer = (clientX) => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width) return;
      const scaleX = WIDTH / rect.width;
      const x = (clientX - rect.left) * scaleX;
      pointerTargetRef.current = clamp(x - PADDLE_WIDTH / 2, 0, WIDTH - PADDLE_WIDTH);
    };

    const handlePointerDown = (e) => {
      pointerActiveRef.current = true;
      updateFromPointer(e.clientX);
      releaseRef.current = true;
      canvas.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e) => {
      if (!pointerActiveRef.current) return;
      updateFromPointer(e.clientX);
    };

    const handlePointerUp = (e) => {
      pointerActiveRef.current = false;
      canvas.releasePointerCapture(e.pointerId);
    };

    const handlePointerLeave = () => {
      pointerActiveRef.current = false;
      pointerTargetRef.current = null;
    };

    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointerleave', handlePointerLeave);
    canvas.addEventListener('pointercancel', handlePointerLeave);
    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointerleave', handlePointerLeave);
      canvas.removeEventListener('pointercancel', handlePointerLeave);
    };
  }, [canvasRef]);

  useEffect(() => {
    if (!controls) return;
    const map = getMapping('breakout', DEFAULT_MAP);
    const handleFire = (e) => {
      if (e.key === map.fire) {
        releaseRef.current = true;
      }
    };
    window.addEventListener('keydown', handleFire);
    return () => window.removeEventListener('keydown', handleFire);
  }, [controls]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const drawHud = () => {
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '12px monospace';
      ctx.textBaseline = 'top';
      ctx.fillText(`Stage ${stageRef.current}`, 8, 4);
      ctx.fillText(`Lives ${livesRef.current}`, WIDTH - 70, 4);
      ctx.fillText(`Score ${scoreRef.current}`, WIDTH / 2 - 30, 4);
    };

    const drawMessage = (text) => {
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.fillRect(0, HEIGHT / 2 - 30, WIDTH, 60);
      ctx.fillStyle = '#fff';
      ctx.font = '16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(text, WIDTH / 2, HEIGHT / 2 - 4);
      ctx.font = '12px monospace';
      ctx.fillText('Space / Click to serve', WIDTH / 2, HEIGHT / 2 + 16);
      ctx.restore();
    };

    const drawFrame = () => {
      ctx.clearRect(0, 0, WIDTH, HEIGHT);

      drawHud();

      bricksRef.current.forEach((brick) => {
        if (!brick.alive) return;
        ctx.fillStyle =
          brick.type === 1 ? '#94a3b8' : brick.type === 2 ? '#34d399' : '#f87171';
        ctx.fillRect(brick.x, brick.y, brick.w, brick.h);
      });

      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(paddleRef.current.x, PADDLE_Y, PADDLE_WIDTH, PADDLE_HEIGHT);

      ballsRef.current.forEach((ball) => {
        if (trailEnabledRef.current) {
          ball.trail.forEach((p, i) => {
            ctx.fillStyle = `rgba(255,255,255,${
              ((i + 1) / ball.trail.length) * 0.4
            })`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, BALL_RADIUS, 0, Math.PI * 2);
            ctx.fill();
          });
        }
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      });

      if (paused) {
        drawMessage('Paused');
      } else if (gameOverRef.current) {
        drawMessage('Game Over');
      } else if (ballsRef.current.some((ball) => ball.stuck)) {
        drawMessage('Ready to launch');
      }
    };

    if (selecting || paused) {
      drawFrame();
      return undefined;
    }

    const stepBall = (ball, dt) => {
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      if (ball.x <= BALL_RADIUS) {
        ball.x = BALL_RADIUS;
        ball.vx *= -1;
      }
      if (ball.x >= WIDTH - BALL_RADIUS) {
        ball.x = WIDTH - BALL_RADIUS;
        ball.vx *= -1;
      }
      if (ball.y <= BALL_RADIUS + HUD_HEIGHT) {
        ball.y = BALL_RADIUS + HUD_HEIGHT;
        ball.vy *= -1;
      }

      const paddleHit = circleRectCollision(ball, {
        x: paddleRef.current.x,
        y: PADDLE_Y,
        w: PADDLE_WIDTH,
        h: PADDLE_HEIGHT,
      });

      if (paddleHit && ball.vy > 0) {
        ball.x += paddleHit.nx * paddleHit.overlap;
        ball.y += paddleHit.ny * paddleHit.overlap;
        const dot = ball.vx * paddleHit.nx + ball.vy * paddleHit.ny;
        ball.vx -= 2 * dot * paddleHit.nx;
        ball.vy -= 2 * dot * paddleHit.ny;
        const relative =
          (ball.x - (paddleRef.current.x + PADDLE_WIDTH / 2)) /
          (PADDLE_WIDTH / 2);
        ball.vx += relative * 80;
        if (magnetRef.current > 0) {
          ball.stuck = true;
          ball.offset = clamp(
            ball.x - paddleRef.current.x,
            BALL_RADIUS,
            PADDLE_WIDTH - BALL_RADIUS,
          );
          announceEvent('Magnet catch');
        }
      }

      let hitBrick = null;
      for (let i = 0; i < bricksRef.current.length; i += 1) {
        const brick = bricksRef.current[i];
        if (!brick.alive) continue;
        const hit = circleRectCollision(ball, brick);
        if (hit) {
          hitBrick = { brick, hit };
          break;
        }
      }

      if (hitBrick) {
        const { brick, hit } = hitBrick;
        brick.alive = false;
        bricksRemainingRef.current -= 1;
        ball.x += hit.nx * hit.overlap;
        ball.y += hit.ny * hit.overlap;
        const dot = ball.vx * hit.nx + ball.vy * hit.ny;
        ball.vx -= 2 * dot * hit.nx;
        ball.vy -= 2 * dot * hit.ny;

        if (brick.type === 2 && ballsRef.current.length < MAX_BALLS) {
          ballsRef.current.push({
            ...createBall(paddleRef.current.x, rngRef.current),
            x: ball.x,
            y: ball.y,
            vx: -ball.vx,
            vy: ball.vy,
            stuck: false,
            trail: [],
          });
          announceEvent('Multi-ball');
        }
        if (brick.type === 3) {
          magnetRef.current = MAGNET_DURATION;
          announceEvent('Magnet active');
        }

        scoreRef.current += pointsForBrick(brick.type);
        if (scoreRef.current > highScoreRef.current) {
          highScoreRef.current = scoreRef.current;
          setHighScore(scoreRef.current);
        }
        setScore(scoreRef.current);
      }
    };

    const tick = (time) => {
      const deltaMs = Math.min(40, time - (lastTimeRef.current || time));
      lastTimeRef.current = time;
      const dt = (deltaMs / 1000) * speedRef.current;
      magnetRef.current = Math.max(0, magnetRef.current - dt);

      const map = getMapping('breakout', DEFAULT_MAP);
      const moveLeft = controls?.keys?.[map.left] || false;
      const moveRight = controls?.keys?.[map.right] || false;
      const joystickX = controls?.joystick?.x ?? 0;
      const inputX =
        Math.abs(joystickX) > 0.2
          ? joystickX
          : (moveRight ? 1 : 0) - (moveLeft ? 1 : 0);

      if (pointerActiveRef.current && pointerTargetRef.current !== null) {
        paddleRef.current.x = pointerTargetRef.current;
      } else if (inputX !== 0) {
        paddleRef.current.x = clamp(
          paddleRef.current.x + inputX * 220 * dt,
          0,
          WIDTH - PADDLE_WIDTH,
        );
      }

      if (releaseRef.current || controls?.fire) {
        releaseRef.current = false;
        releaseBalls();
      }

      ballsRef.current.forEach((ball) => {
        if (ball.stuck) {
          ball.x = paddleRef.current.x + ball.offset;
          ball.y = PADDLE_Y - BALL_RADIUS;
          ball.trail = [];
        }
      });

      for (let i = 0; i < SUB_STEPS; i += 1) {
        const stepDt = dt / SUB_STEPS;
        ballsRef.current.forEach((ball) => {
          if (!ball.stuck) {
            ball.trail.push({ x: ball.x, y: ball.y });
            if (ball.trail.length > TRAIL_LENGTH) ball.trail.shift();
            stepBall(ball, stepDt);
          }
        });
      }

      ballsRef.current = ballsRef.current.filter(
        (ball) => ball.y < HEIGHT + BALL_RADIUS,
      );

      if (ballsRef.current.length === 0 && !gameOverRef.current) {
        loseLife();
      }

      if (bricksRemainingRef.current <= 0 && !gameOverRef.current) {
        nextLevel();
      }

      drawFrame();
      animationRef.current = requestAnimationFrame(tick);
    };

    animationRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationRef.current);
  }, [
    announceEvent,
    canvasRef,
    controls,
    loseLife,
    nextLevel,
    paused,
    selecting,
    releaseBalls,
    setHighScore,
  ]);

  const settingsPanel = (
    <div className="text-sm text-white space-y-3">
      <div className="space-y-2">
        <label className="text-xs uppercase tracking-wide text-slate-400">
          Ball speed
        </label>
        <input
          type="range"
          min="0.6"
          max="1.6"
          step="0.1"
          value={speedMultiplier}
          onChange={(e) => setSpeedMultiplier(Number(e.target.value))}
          className="w-full"
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={trailEnabled}
          onChange={(e) => setTrailEnabled(e.target.checked)}
        />
        Trail
      </label>
      <button
        type="button"
        onClick={() => setSelecting(true)}
        className="w-full rounded bg-slate-700 px-2 py-1 text-white hover:bg-slate-600"
      >
        Choose Level
      </button>
    </div>
  );

  const editorPanel = (
    <div className="rounded border border-slate-700/70 bg-slate-900/80 p-2 text-white shadow-lg">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSelecting(true)}
          className="rounded bg-slate-700 px-2 py-1 text-xs hover:bg-slate-600"
        >
          Levels
        </button>
        <button
          type="button"
          onClick={() => setShowEditor((s) => !s)}
          className="rounded bg-slate-700 px-2 py-1 text-xs hover:bg-slate-600"
        >
          {showEditor ? 'Hide Editor' : 'Level Editor'}
        </button>
      </div>
      {showEditor && (
        <div className="mt-3">
          <BreakoutEditor
            onLoad={(grid, label) =>
              handleSelect({
                layout: grid,
                label: label || 'Custom',
                source: 'saved',
                savedName: label,
              })
            }
          />
        </div>
      )}
    </div>
  );

  return (
    <GameLayout
      gameId="breakout"
      stage={stage}
      lives={lives}
      score={score}
      highScore={highScore}
      onPauseChange={setPaused}
      onRestart={handleRestart}
      editor={editorPanel}
      settingsPanel={settingsPanel}
    >
      {selecting && (
        <BreakoutLevels
          onSelect={handleSelect}
          onClose={() => setSelecting(false)}
        />
      )}
      <div className="relative w-full h-full">
        <canvas
          ref={canvasRef}
          className="w-full h-full bg-black"
          tabIndex={0}
          role="img"
          aria-label="Breakout game canvas"
        />
        <div className="sr-only" role="status" aria-live="polite">
          {announce}
        </div>
      </div>
    </GameLayout>
  );
}

export const createRng = (seed) => (seed ? seedrandom(seed) : Math.random);
