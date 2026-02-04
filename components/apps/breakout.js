"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import seedrandom from 'seedrandom';
import GameLayout, { useInputRecorder } from './GameLayout';
import useCanvasResize from '../../hooks/useCanvasResize';
import BreakoutEditor from './breakoutEditor';
import BreakoutLevels from './breakoutLevels';
import usePersistedState from '../../hooks/usePersistedState';
import useGameControls from './useGameControls';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';
import { getMapping } from './Games/common/input-remap/useInputMapping';
import { random, reset as resetRng } from '../../apps/games/rng';
import { consumeGameKey, shouldHandleGameKey } from '../../utils/gameInput';
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
const BASE_PADDLE_WIDTH = WIDTH * 0.18;
const PADDLE_HEIGHT = HEIGHT * 0.035;
const PADDLE_Y = HEIGHT - PADDLE_HEIGHT * 2.2;
export const BALL_RADIUS = 5;
const BRICK_GAP = 2;
const BRICK_WIDTH = WIDTH / BREAKOUT_COLS;
const BRICK_HEIGHT = HEIGHT * 0.05;
const BASE_SPEED = 180;
const MAX_BALLS = 3;
const TRAIL_LENGTH = 10;
const SUB_STEPS = 3;
const MAGNET_DURATION = 6;
const MAX_BOUNCE_ANGLE = (70 * Math.PI) / 180;
const MIN_BOUNCE_ANGLE = (12 * Math.PI) / 180;
const POINTER_SERVE_THRESHOLD = 12;
const PARTICLE_LIFETIME = 0.5;

const DEFAULT_MAP = {
  left: 'ArrowLeft',
  right: 'ArrowRight',
  fire: ' ',
};

const STORAGE_KEYS = {
  highScore: 'breakout-highscore',
  trail: 'breakout-trail',
  speed: 'breakout-speed',
  difficulty: 'breakout-difficulty',
  effects: 'breakout-effects',
  hitbox: 'breakout-debug-hitbox',
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const pointsForBrick = (type) => {
  if (type === 2) return 50;
  if (type === 3) return 75;
  return 25;
};

export const circleRectCollision = (ball, rect) => {
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

export const createBricks = (layout) => {
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

export const normalizeVelocity = (vx, vy, speed) => {
  const magnitude = Math.hypot(vx, vy) || 0.0001;
  return {
    vx: (vx / magnitude) * speed,
    vy: (vy / magnitude) * speed,
  };
};

const clampBounceAngle = (vx, vy) => {
  const speed = Math.hypot(vx, vy) || BASE_SPEED;
  let angle = Math.atan2(vy, vx);
  if (Math.abs(Math.sin(angle)) < Math.sin(MIN_BOUNCE_ANGLE)) {
    const sign = Math.sign(vy) || -1;
    angle = sign * MIN_BOUNCE_ANGLE;
  }
  return {
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
  };
};

const applySpeedClamp = (vx, vy, speed) => {
  const normalized = normalizeVelocity(vx, vy, speed);
  const clamped = clampBounceAngle(normalized.vx, normalized.vy);
  return { vx: clamped.vx, vy: clamped.vy };
};

const reflectVelocity = (vx, vy, nx, ny, speed) => {
  const dot = vx * nx + vy * ny;
  const nextVx = vx - 2 * dot * nx;
  const nextVy = vy - 2 * dot * ny;
  return applySpeedClamp(nextVx, nextVy, speed);
};

export const computePaddleBounce = (ballX, paddleX, speed, paddleWidth) => {
  const relative =
    (ballX - (paddleX + paddleWidth / 2)) / (paddleWidth / 2);
  const clamped = clamp(relative, -1, 1);
  const angle = (-Math.PI / 2) + clamped * MAX_BOUNCE_ANGLE;
  return {
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
  };
};

export const createBall = (paddleX, rng, paddleWidth, speed) => {
  const angle = (-Math.PI / 2) + (rng() - 0.5) * (Math.PI / 3);
  return {
    x: paddleX + paddleWidth / 2,
    y: PADDLE_Y - BALL_RADIUS,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    stuck: true,
    offset: paddleWidth / 2,
    trail: [],
  };
};

export const shouldServeFromPointer = (startX, endX) =>
  Math.abs(startX - endX) < POINTER_SERVE_THRESHOLD;

export const stepBallPhysics = ({
  ball,
  dt,
  speed,
  paddleX,
  paddleWidth,
  bricks,
}) => {
  const nextBall = { ...ball };
  let hitBrickIndex = null;
  let hitBrick = null;
  let paddleHit = false;

  nextBall.x += nextBall.vx * dt;
  nextBall.y += nextBall.vy * dt;

  if (nextBall.x <= BALL_RADIUS) {
    nextBall.x = BALL_RADIUS;
    const clamped = applySpeedClamp(-nextBall.vx, nextBall.vy, speed);
    nextBall.vx = clamped.vx;
    nextBall.vy = clamped.vy;
  }
  if (nextBall.x >= WIDTH - BALL_RADIUS) {
    nextBall.x = WIDTH - BALL_RADIUS;
    const clamped = applySpeedClamp(-nextBall.vx, nextBall.vy, speed);
    nextBall.vx = clamped.vx;
    nextBall.vy = clamped.vy;
  }
  if (nextBall.y <= BALL_RADIUS + HUD_HEIGHT) {
    nextBall.y = BALL_RADIUS + HUD_HEIGHT;
    const clamped = applySpeedClamp(nextBall.vx, -nextBall.vy, speed);
    nextBall.vx = clamped.vx;
    nextBall.vy = clamped.vy;
  }

  const paddleHitResult = circleRectCollision(nextBall, {
    x: paddleX,
    y: PADDLE_Y,
    w: paddleWidth,
    h: PADDLE_HEIGHT,
  });

  if (paddleHitResult && nextBall.vy > 0) {
    paddleHit = true;
    nextBall.x += paddleHitResult.nx * paddleHitResult.overlap;
    nextBall.y += paddleHitResult.ny * paddleHitResult.overlap;
    const bounce = computePaddleBounce(nextBall.x, paddleX, speed, paddleWidth);
    const clamped = applySpeedClamp(bounce.vx, bounce.vy, speed);
    nextBall.vx = clamped.vx;
    nextBall.vy = clamped.vy;
  }

  for (let i = 0; i < bricks.length; i += 1) {
    const brick = bricks[i];
    if (!brick.alive) continue;
    const hit = circleRectCollision(nextBall, brick);
    if (hit) {
      hitBrickIndex = i;
      hitBrick = hit;
      break;
    }
  }

  if (hitBrick && hitBrickIndex !== null) {
    nextBall.x += hitBrick.nx * hitBrick.overlap;
    nextBall.y += hitBrick.ny * hitBrick.overlap;
    const reflected = reflectVelocity(
      nextBall.vx,
      nextBall.vy,
      hitBrick.nx,
      hitBrick.ny,
      speed,
    );
    nextBall.vx = reflected.vx;
    nextBall.vy = reflected.vy;
  }

  return { ball: nextBall, hitBrickIndex, paddleHit };
};

export default function Breakout() {
  const canvasRef = useCanvasResize(WIDTH, HEIGHT);
  const controls = useGameControls(canvasRef, 'breakout');
  const animationRef = useRef(0);
  const lastTimeRef = useRef(0);
  const pointerTargetRef = useRef(null);
  const pointerActiveRef = useRef(false);
  const pointerStartRef = useRef(null);
  const releaseRef = useRef(false);
  const gameOverRef = useRef(false);
  const particleRef = useRef([]);
  const flashRef = useRef(0);
  const replayInputRef = useRef(null);
  const recordedInputRef = useRef({
    inputX: 0,
    pointerX: null,
    pointerActive: false,
  });

  const paddleRef = useRef({ x: WIDTH / 2 - BASE_PADDLE_WIDTH / 2 });
  const paddleWidthRef = useRef(BASE_PADDLE_WIDTH);
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
    STORAGE_KEYS.highScore,
    0,
  );
  const [paused, setPaused] = useState(false);
  const [selecting, setSelecting] = useState(true);
  const [announce, setAnnounce] = useState('');
  const [trailEnabled, setTrailEnabled] = usePersistedState(
    STORAGE_KEYS.trail,
    true,
  );
  const [speedMultiplier, setSpeedMultiplier] = usePersistedState(
    STORAGE_KEYS.speed,
    1,
  );
  const [difficulty, setDifficulty] = usePersistedState(
    STORAGE_KEYS.difficulty,
    'normal',
  );
  const [effectsEnabled, setEffectsEnabled] = usePersistedState(
    STORAGE_KEYS.effects,
    true,
  );
  const [showHitbox, setShowHitbox] = usePersistedState(
    STORAGE_KEYS.hitbox,
    false,
  );
  const [showEditor, setShowEditor] = useState(false);

  const trailEnabledRef = useRef(trailEnabled);
  const speedRef = useRef(speedMultiplier);
  const difficultyRef = useRef(difficulty);
  const effectsRef = useRef(effectsEnabled);
  const prefersReducedMotion = usePrefersReducedMotion();
  const { record, registerReplay } = useInputRecorder();


  useEffect(() => {
    highScoreRef.current = highScore;
  }, [highScore]);

  useEffect(() => {
    trailEnabledRef.current = trailEnabled;
  }, [trailEnabled]);

  useEffect(() => {
    speedRef.current = speedMultiplier;
  }, [speedMultiplier]);

  useEffect(() => {
    difficultyRef.current = difficulty;
  }, [difficulty]);

  useEffect(() => {
    effectsRef.current = effectsEnabled;
  }, [effectsEnabled]);

  useEffect(() => {
    updatePaddleWidth();
    ballsRef.current.forEach((ball) => {
      if (ball.stuck) {
        ball.offset = clamp(
          ball.offset,
          BALL_RADIUS,
          paddleWidthRef.current - BALL_RADIUS,
        );
      }
    });
  }, [difficulty, updatePaddleWidth]);

  const syncHud = useCallback(() => {
    setStage(stageRef.current);
    setLives(livesRef.current);
    setScore(scoreRef.current);
  }, []);

  const getDifficultyRamp = useCallback(() => {
    const stageIndex = Math.max(0, stageRef.current - 1);
    const baseRamp = difficultyRef.current === 'hard' ? 0.06 : 0.03;
    return 1 + Math.min(0.35, stageIndex * baseRamp);
  }, []);

  const getTargetSpeed = useCallback(() => {
    return BASE_SPEED * speedRef.current * getDifficultyRamp();
  }, [getDifficultyRamp]);

  const updatePaddleWidth = useCallback(() => {
    const stageIndex = Math.max(0, stageRef.current - 1);
    const difficultyScale = difficultyRef.current === 'hard' ? 0.92 : 1;
    const stageScale = 1 - Math.min(0.18, stageIndex * 0.03);
    paddleWidthRef.current = BASE_PADDLE_WIDTH * difficultyScale * stageScale;
    paddleRef.current.x = clamp(
      paddleRef.current.x,
      0,
      WIDTH - paddleWidthRef.current,
    );
  }, []);

  const resetBalls = useCallback(() => {
    const speed = getTargetSpeed();
    ballsRef.current = [
      {
        ...createBall(paddleRef.current.x, random, paddleWidthRef.current, speed),
        stuck: true,
      },
    ];
  }, [getTargetSpeed]);

  const startLevel = useCallback(({ layout, stageNumber }) => {
    const grid = normalizeLayout(layout, BREAKOUT_ROWS, BREAKOUT_COLS);
    selectionRef.current.layout = grid;
    bricksRef.current = createBricks(grid);
    bricksRemainingRef.current = bricksRef.current.filter((b) => b.alive).length;
    magnetRef.current = 0;
    gameOverRef.current = false;
    stageRef.current = stageNumber ?? stageRef.current;
    updatePaddleWidth();
    paddleRef.current.x = WIDTH / 2 - paddleWidthRef.current / 2;
    resetBalls();
    syncHud();
  }, [resetBalls, syncHud, updatePaddleWidth]);

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
    const speed = getTargetSpeed();
    ballsRef.current.forEach((ball) => {
      if (!ball.stuck) return;
      const angle = (-Math.PI / 2) + (random() - 0.5) * (Math.PI / 3);
      ball.vx = Math.cos(angle) * speed;
      ball.vy = Math.sin(angle) * speed;
      ball.stuck = false;
    });
  }, [getTargetSpeed]);

  const loseLife = useCallback(() => {
    livesRef.current -= 1;
    if (livesRef.current <= 0) {
      livesRef.current = 0;
      gameOverRef.current = true;
      announceEvent('Game over');
    } else {
      announceEvent('Life lost');
      flashRef.current = 0.35;
      resetBalls();
    }
    syncHud();
  }, [announceEvent, resetBalls, syncHud]);

  const handleRestart = useCallback((options = { resetRng: true }) => {
    if (options.resetRng) {
      resetRng();
    }
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
    if (!announce) return undefined;
    const timeout = window.setTimeout(() => setAnnounce(''), 2000);
    return () => window.clearTimeout(timeout);
  }, [announce]);

  useEffect(() => {
    registerReplay((input, idx) => {
      if (idx === 0) {
        replayInputRef.current = null;
        setSelecting(false);
        handleRestart({ resetRng: false });
      }
      if (!input) return;
      if (input.type === 'input') {
        replayInputRef.current = input;
      }
      if (input.type === 'serve') {
        releaseRef.current = true;
      }
    });
  }, [handleRestart, registerReplay]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const updateFromPointer = (clientX) => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width) return;
      const scaleX = WIDTH / rect.width;
      const x = (clientX - rect.left) * scaleX;
      pointerTargetRef.current = clamp(
        x - paddleWidthRef.current / 2,
        0,
        WIDTH - paddleWidthRef.current,
      );
    };

    const handlePointerDown = (e) => {
      pointerActiveRef.current = true;
      pointerStartRef.current = e.clientX;
      updateFromPointer(e.clientX);
      replayInputRef.current = null;
      canvas.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e) => {
      if (!pointerActiveRef.current) return;
      updateFromPointer(e.clientX);
    };

    const handlePointerUp = (e) => {
      pointerActiveRef.current = false;
      if (
        pointerStartRef.current !== null &&
        shouldServeFromPointer(pointerStartRef.current, e.clientX) &&
        ballsRef.current.some((ball) => ball.stuck)
      ) {
        releaseRef.current = true;
      }
      canvas.releasePointerCapture(e.pointerId);
      pointerStartRef.current = null;
    };

    const handlePointerLeave = () => {
      pointerActiveRef.current = false;
      pointerStartRef.current = null;
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
      if (!shouldHandleGameKey(e, { isFocused: true })) return;
      if (e.key === map.fire) {
        consumeGameKey(e);
        replayInputRef.current = null;
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
      ctx.font = '11px monospace';
      ctx.textBaseline = 'top';
      ctx.fillText(
        `Stage ${stageRef.current}: ${selectionRef.current.label || 'Custom'}`,
        8,
        4,
      );
      ctx.fillText(`Score ${scoreRef.current}`, WIDTH / 2 - 30, 4);
      ctx.fillText(`Lives ${livesRef.current}`, WIDTH - 70, 4);
      ctx.fillText(`High ${highScoreRef.current}`, WIDTH - 70, 14);

      if (magnetRef.current > 0) {
        const barWidth = 60;
        const barX = 8;
        const barY = HUD_HEIGHT - 6;
        const pct = clamp(magnetRef.current / MAGNET_DURATION, 0, 1);
        ctx.fillStyle = 'rgba(16, 185, 129, 0.6)';
        ctx.fillRect(barX, barY, barWidth, 3);
        ctx.fillStyle = '#34d399';
        ctx.fillRect(barX, barY, barWidth * pct, 3);
        ctx.fillStyle = '#e2e8f0';
      }
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
      ctx.fillText('Space / Tap to serve', WIDTH / 2, HEIGHT / 2 + 16);
      ctx.restore();
    };

    const drawReadyHint = () => {
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
      ctx.fillRect(WIDTH / 2 - 70, HEIGHT - 52, 140, 26);
      ctx.fillStyle = '#f8fafc';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Ready to launch', WIDTH / 2, HEIGHT - 34);
      ctx.restore();
    };

    const drawRoundedRect = (x, y, w, h, r) => {
      const radius = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + w - radius, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
      ctx.lineTo(x + w, y + h - radius);
      ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
      ctx.lineTo(x + radius, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
    };

    const drawBrick = (brick) => {
      const gradient = ctx.createLinearGradient(
        brick.x,
        brick.y,
        brick.x,
        brick.y + brick.h,
      );
      if (brick.type === 1) {
        gradient.addColorStop(0, '#cbd5f5');
        gradient.addColorStop(1, '#64748b');
      } else if (brick.type === 2) {
        gradient.addColorStop(0, '#6ee7b7');
        gradient.addColorStop(1, '#047857');
      } else {
        gradient.addColorStop(0, '#fda4af');
        gradient.addColorStop(1, '#be123c');
      }
      ctx.fillStyle = gradient;
      drawRoundedRect(brick.x, brick.y, brick.w, brick.h, 3);
      ctx.fill();
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();
    };

    const drawFrame = () => {
      ctx.clearRect(0, 0, WIDTH, HEIGHT);

      drawHud();

      bricksRef.current.forEach((brick) => {
        if (!brick.alive) return;
        drawBrick(brick);
        if (showHitbox) {
          ctx.strokeStyle = 'rgba(255,255,255,0.2)';
          ctx.strokeRect(brick.x, brick.y, brick.w, brick.h);
        }
      });

      ctx.save();
      if (magnetRef.current > 0) {
        ctx.shadowColor = '#34d399';
        ctx.shadowBlur = 12;
      }
      const paddleGradient = ctx.createLinearGradient(
        paddleRef.current.x,
        PADDLE_Y,
        paddleRef.current.x,
        PADDLE_Y + PADDLE_HEIGHT,
      );
      paddleGradient.addColorStop(0, '#f8fafc');
      paddleGradient.addColorStop(1, '#cbd5f5');
      ctx.fillStyle = paddleGradient;
      drawRoundedRect(
        paddleRef.current.x,
        PADDLE_Y,
        paddleWidthRef.current,
        PADDLE_HEIGHT,
        4,
      );
      ctx.fill();
      ctx.restore();

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
        const ballGradient = ctx.createRadialGradient(
          ball.x - 1,
          ball.y - 1,
          1,
          ball.x,
          ball.y,
          BALL_RADIUS + 1,
        );
        ballGradient.addColorStop(0, '#fff');
        ballGradient.addColorStop(1, '#cbd5f5');
        ctx.fillStyle = ballGradient;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        if (showHitbox) {
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.6)';
          ctx.stroke();
        }
      });

      if (effectsRef.current && !prefersReducedMotion) {
        particleRef.current.forEach((particle) => {
          ctx.fillStyle = particle.color;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      if (flashRef.current > 0 && !prefersReducedMotion) {
        ctx.fillStyle = `rgba(248, 113, 113, ${flashRef.current})`;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
      }

      if (paused) {
        drawMessage('Paused');
      } else if (gameOverRef.current) {
        drawMessage('Game Over');
      } else if (ballsRef.current.some((ball) => ball.stuck)) {
        drawReadyHint();
      }
    };

    if (selecting || paused) {
      drawFrame();
      return undefined;
    }

    const spawnParticles = (x, y, type) => {
      if (!effectsRef.current || prefersReducedMotion) return;
      const colors = type === 2 ? ['#6ee7b7', '#10b981'] : type === 3 ? ['#fda4af', '#fb7185'] : ['#cbd5f5', '#94a3b8'];
      for (let i = 0; i < 6; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 40 + Math.random() * 60;
        particleRef.current.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: PARTICLE_LIFETIME,
          size: 1.5 + Math.random() * 1.8,
          color: colors[i % colors.length],
        });
      }
    };

    const stepBall = (ball, dt, speed) => {
      const { ball: nextBall, hitBrickIndex, paddleHit } = stepBallPhysics({
        ball,
        dt,
        speed,
        paddleX: paddleRef.current.x,
        paddleWidth: paddleWidthRef.current,
        bricks: bricksRef.current,
      });

      ball.x = nextBall.x;
      ball.y = nextBall.y;
      ball.vx = nextBall.vx;
      ball.vy = nextBall.vy;

      if (paddleHit && magnetRef.current > 0) {
        ball.stuck = true;
        ball.offset = clamp(
          ball.x - paddleRef.current.x,
          BALL_RADIUS,
          paddleWidthRef.current - BALL_RADIUS,
        );
        ball.vx = 0;
        ball.vy = 0;
        announceEvent('Magnet catch');
      }

      if (hitBrickIndex !== null) {
        const brick = bricksRef.current[hitBrickIndex];
        if (brick?.alive) {
          brick.alive = false;
          bricksRemainingRef.current -= 1;
          spawnParticles(ball.x, ball.y, brick.type);

          if (brick.type === 2 && ballsRef.current.length < MAX_BALLS) {
            const spawnAngle =
              Math.atan2(ball.vy, ball.vx) + (random() - 0.5) * 0.6;
            const offset = BALL_RADIUS * 2;
            ballsRef.current.push({
              x: ball.x + Math.cos(spawnAngle) * offset,
              y: ball.y + Math.sin(spawnAngle) * offset,
              vx: Math.cos(spawnAngle) * speed,
              vy: Math.sin(spawnAngle) * speed,
              stuck: false,
              offset: paddleWidthRef.current / 2,
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
      }
    };

    const tick = (time) => {
      const deltaMs = Math.min(40, time - (lastTimeRef.current || time));
      lastTimeRef.current = time;
      const dt = (deltaMs / 1000) * speedRef.current;
      const targetSpeed = getTargetSpeed();
      magnetRef.current = Math.max(0, magnetRef.current - dt);
      if (flashRef.current > 0) {
        flashRef.current = Math.max(0, flashRef.current - dt * 1.2);
      }

      const map = getMapping('breakout', DEFAULT_MAP);
      const moveLeft = controls?.keys?.[map.left] || false;
      const moveRight = controls?.keys?.[map.right] || false;
      const joystickX = controls?.joystick?.x ?? 0;
      const inputX =
        Math.abs(joystickX) > 0.2
          ? joystickX
          : (moveRight ? 1 : 0) - (moveLeft ? 1 : 0);

      const liveInput = {
        inputX,
        pointerActive: pointerActiveRef.current,
        pointerX: pointerTargetRef.current,
      };
      if (
        replayInputRef.current &&
        (Math.abs(liveInput.inputX) > 0.1 || liveInput.pointerActive)
      ) {
        replayInputRef.current = null;
      }
      const activeInput = replayInputRef.current || liveInput;

      if (
        !replayInputRef.current &&
        (Math.abs(liveInput.inputX - recordedInputRef.current.inputX) > 0.01 ||
          liveInput.pointerActive !== recordedInputRef.current.pointerActive ||
          (liveInput.pointerX !== null &&
            recordedInputRef.current.pointerX === null) ||
          (liveInput.pointerX !== null &&
            recordedInputRef.current.pointerX !== null &&
            Math.abs(liveInput.pointerX - recordedInputRef.current.pointerX) > 2) ||
          (liveInput.pointerX === null &&
            recordedInputRef.current.pointerX !== null))
      ) {
        record({ type: 'input', ...liveInput });
        recordedInputRef.current = liveInput;
      }

      if (activeInput.pointerActive && activeInput.pointerX !== null) {
        paddleRef.current.x = activeInput.pointerX;
      } else if (activeInput.inputX !== 0) {
        paddleRef.current.x = clamp(
          paddleRef.current.x + activeInput.inputX * 260 * dt,
          0,
          WIDTH - paddleWidthRef.current,
        );
      }

      const hasStuckBall = ballsRef.current.some((ball) => ball.stuck);
      if (releaseRef.current || controls?.fire) {
        if (hasStuckBall) {
          if (!replayInputRef.current) {
            record({ type: 'serve' });
          }
          releaseBalls();
        }
        releaseRef.current = false;
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
            stepBall(ball, stepDt, targetSpeed);
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

      if (effectsRef.current && !prefersReducedMotion) {
        particleRef.current.forEach((particle) => {
          particle.x += particle.vx * dt;
          particle.y += particle.vy * dt;
          particle.vy += 30 * dt;
          particle.life -= dt;
        });
        particleRef.current = particleRef.current.filter(
          (particle) => particle.life > 0,
        );
      } else {
        particleRef.current = [];
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
    getTargetSpeed,
    prefersReducedMotion,
    record,
    showHitbox,
  ]);

  const settingsPanel = (
    <div className="text-sm text-white space-y-3">
      <div className="space-y-2">
        <label className="text-xs uppercase tracking-wide text-slate-400">
          Ball speed ({speedMultiplier.toFixed(1)}x)
        </label>
        <input
          type="range"
          min="0.6"
          max="1.6"
          step="0.1"
          value={speedMultiplier}
          onChange={(e) => setSpeedMultiplier(Number(e.target.value))}
          className="w-full"
          aria-label="Ball speed"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs uppercase tracking-wide text-slate-400">
          Difficulty
        </label>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-white"
          aria-label="Difficulty"
        >
          <option value="normal">Normal</option>
          <option value="hard">Hard</option>
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={trailEnabled}
          onChange={(e) => setTrailEnabled(e.target.checked)}
          aria-label="Toggle trail"
        />
        Trail
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={effectsEnabled}
          onChange={(e) => setEffectsEnabled(e.target.checked)}
          aria-label="Toggle effects"
        />
        Effects
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={showHitbox}
          onChange={(e) => setShowHitbox(e.target.checked)}
          aria-label="Toggle hitboxes"
        />
        Debug hitboxes
      </label>
      <button
        type="button"
        onClick={() => setSelecting(true)}
        className="w-full rounded bg-slate-700 px-2 py-1 text-white hover:bg-slate-600"
      >
        Choose Level
      </button>
      <div className="text-xs text-slate-400">
        Controls: Arrow keys, A/D, or gamepad. Tap/click to serve.
      </div>
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
      pauseHotkeys={['p', 'Escape']}
      restartHotkeys={['r']}
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
          aria-describedby="breakout-instructions"
        />
        <div id="breakout-instructions" className="sr-only">
          Use arrow keys or gamepad to move the paddle. Press space or tap to
          serve. Press P to pause, R to restart.
        </div>
        <div className="sr-only" role="status" aria-live="polite">
          {announce}
        </div>
      </div>
    </GameLayout>
  );
}

export const createRng = (seed) => (seed ? seedrandom(seed) : Math.random);
