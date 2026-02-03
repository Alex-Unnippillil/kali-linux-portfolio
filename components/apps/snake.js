import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import GameLayout from './GameLayout';
import useGameControls from './useGameControls';
import { useSaveSlots, useGameLoop } from './Games/common';
import useGameHaptics from '../../hooks/useGameHaptics';
import usePersistentState from '../../hooks/usePersistentState';
import useCanvasResize from '../../hooks/useCanvasResize';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';
import useIsTouchDevice from '../../hooks/useIsTouchDevice';
import {
  GRID_SIZE,
  createInitialState,
  stepSnake,
} from '../../apps/snake';

const CELL_SIZE = 16; // pixels
const DEFAULT_SPEED = 120; // ms per move
const MAX_QUEUE = 3;
const BOARD_SIZE = GRID_SIZE * CELL_SIZE;
const SKINS = {
  classic: {
    label: 'Neon Classic',
    background: ['#020617', '#0f172a', '#1e293b'],
    snake: {
      head: '#4ade80',
      mid: '#22c55e',
      tail: '#14532d',
    },
    colorblindSnake: {
      head: '#facc15',
      mid: '#fbbf24',
      tail: '#b45309',
    },
    food: '#fb7185',
    colorblindFood: '#60a5fa',
    particles: '#f97316',
    milestone: '#fde047',
    gridAccent: 'rgba(45,212,191,0.25)',
  },
  midnight: {
    label: 'Midnight Alloy',
    background: ['#020617', '#111827', '#0f172a'],
    snake: {
      head: '#38bdf8',
      mid: '#0ea5e9',
      tail: '#075985',
    },
    colorblindSnake: {
      head: '#f97316',
      mid: '#ea580c',
      tail: '#9a3412',
    },
    food: '#facc15',
    colorblindFood: '#f472b6',
    particles: '#38bdf8',
    milestone: '#a78bfa',
    gridAccent: 'rgba(56,189,248,0.22)',
  },
  dusk: {
    label: 'Solar Dusk',
    background: ['#111827', '#1f2937', '#0f172a'],
    snake: {
      head: '#f87171',
      mid: '#f97316',
      tail: '#b45309',
    },
    colorblindSnake: {
      head: '#34d399',
      mid: '#22c55e',
      tail: '#166534',
    },
    food: '#38bdf8',
    colorblindFood: '#a855f7',
    particles: '#fbbf24',
    milestone: '#f472b6',
    gridAccent: 'rgba(248,113,113,0.2)',
  },
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const hexToRgb = (hex) => {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
};

const hexToRgba = (hex, alpha) => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const rgbToHex = ({ r, g, b }) =>
  `#${[r, g, b]
    .map((val) => {
      const clamped = clamp(Math.round(val), 0, 255);
      return clamped.toString(16).padStart(2, '0');
    })
    .join('')}`;

const lerpColor = (a, b, t) => {
  const colorA = hexToRgb(a);
  const colorB = hexToRgb(b);
  return rgbToHex({
    r: colorA.r + (colorB.r - colorA.r) * t,
    g: colorA.g + (colorB.g - colorA.g) * t,
    b: colorA.b + (colorB.b - colorA.b) * t,
  });
};

const Snake = ({ windowMeta } = {}) => {
  const isFocused = windowMeta?.isFocused ?? true;
  const isTouch = useIsTouchDevice();
  const canvasRef = useCanvasResize(GRID_SIZE * CELL_SIZE, GRID_SIZE * CELL_SIZE);
  const ctxRef = useRef(null);
  const particlesRef = useRef([]);
  const milestoneTimeoutRef = useRef(null);
  const [obstaclePack] = usePersistentState(
    'snake:obstacles',
    [],
    (v) => Array.isArray(v),
  );
  const [obstaclesEnabled, setObstaclesEnabled] = usePersistentState(
    'snake_obstacles_enabled',
    true,
    (v) => typeof v === 'boolean',
  );
  const buildInitialState = useCallback(
    () =>
      createInitialState({
        obstacles:
          obstaclesEnabled && obstaclePack.length ? obstaclePack : [],
        obstacleCount:
          obstaclesEnabled && !obstaclePack.length ? 5 : 0,
      }),
    [obstaclePack, obstaclesEnabled],
  );
  const initialStateRef = useRef(null);
  if (!initialStateRef.current) {
    initialStateRef.current = buildInitialState();
  }
  const snakeRef = useRef(
    initialStateRef.current.snake.map((seg) => ({ ...seg, scale: 1 })),
  );
  const foodRef = useRef({ ...initialStateRef.current.food });
  const obstaclesRef = useRef(
    initialStateRef.current.obstacles.map((o) => ({ ...o })),
  );
  const dirRef = useRef({ x: 1, y: 0 });
  const moveQueueRef = useRef([]);
  const accumulatorRef = useRef(0);
  const runningRef = useRef(true);
  const scoreRef = useRef(0);
  const audioCtx = useRef(null);
  const haptics = useGameHaptics();
  const prefersReducedMotion = usePrefersReducedMotion();

  const [running, setRunning] = useState(true);
  const [wrap, setWrap] = usePersistentState(
    'snake_wrap',
    false,
    (v) => typeof v === 'boolean',
  );
  const [skinId, setSkinId] = usePersistentState(
    'snake_skin',
    'classic',
    (v) => typeof v === 'string' && Object.prototype.hasOwnProperty.call(SKINS, v),
  );
  const [colorblindMode, setColorblindMode] = usePersistentState(
    'snake_colorblind_mode',
    false,
    (v) => typeof v === 'boolean',
  );
  const [sound, setSound] = usePersistentState(
    'snake_sound',
    true,
    (v) => typeof v === 'boolean',
  );
  const [baseSpeed, setBaseSpeed] = usePersistentState(
    'snake_base_speed',
    DEFAULT_SPEED,
    (v) => typeof v === 'number',
  );
  const [speed, setSpeed] = useState(baseSpeed);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [highScore, setHighScore] = usePersistentState(
    'snake_highscore',
    0,
    (v) => typeof v === 'number',
  );
  const speedRef = useRef(baseSpeed);
  const {
    save: saveReplay,
    load: loadReplay,
    list: listReplays,
    remove: removeReplay,
  } = useSaveSlots('snake-replay');
  const [selectedReplay, setSelectedReplay] = useState('');
  const [showTouchControls, setShowTouchControls] = usePersistentState(
    'snake_touch_controls',
    isTouch,
    (v) => typeof v === 'boolean',
  );
  const playingRef = useRef(false);
  const focusPausedRef = useRef(false);
  const playbackRef = useRef([]);
  const playbackIndexRef = useRef(0);
  const recordingRef = useRef([]);
  const [milestoneFlash, setMilestoneFlash] = useState(false);

  const skinConfig = useMemo(() => {
    const base = SKINS[skinId] || SKINS.classic;
    const snakePalette = colorblindMode
      ? base.colorblindSnake || base.snake
      : base.snake;
    return {
      ...base,
      snakePalette,
      foodColor: colorblindMode ? base.colorblindFood || base.food : base.food,
    };
  }, [skinId, colorblindMode]);

  const triggerMilestoneFlash = useCallback(() => {
    if (prefersReducedMotion) return;
    setMilestoneFlash(true);
    if (milestoneTimeoutRef.current) {
      clearTimeout(milestoneTimeoutRef.current);
    }
    milestoneTimeoutRef.current = setTimeout(() => {
      setMilestoneFlash(false);
      milestoneTimeoutRef.current = null;
    }, 900);
  }, [prefersReducedMotion]);

  const spawnParticles = useCallback(
    (position, { milestone = false } = {}) => {
      if (prefersReducedMotion) return;
      const count = milestone ? 56 : 28;
      const spread = milestone ? 2.6 : 1.6;
      const centerX = position.x * CELL_SIZE + CELL_SIZE / 2;
      const centerY = position.y * CELL_SIZE + CELL_SIZE / 2;
      const color = milestone ? skinConfig.milestone : skinConfig.particles;
      for (let i = 0; i < count; i += 1) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * Math.PI * 0.25;
        const speed = (Math.random() * 0.5 + 0.4) * spread;
        particlesRef.current.push({
          x: centerX,
          y: centerY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: milestone ? 1.4 + Math.random() * 0.4 : 0.7 + Math.random() * 0.3,
          initialLife: milestone ? 1.8 : 0.9,
          size: milestone ? Math.random() * 2.5 + 2 : Math.random() * 1.8 + 1,
          color,
          glow: milestone,
          gravity: milestone ? 0.25 : 0.4,
        });
      }
    },
    [prefersReducedMotion, skinConfig],
  );

  const updateParticles = useCallback((delta) => {
    if (!particlesRef.current.length) return;
    const dt = clamp(delta * 60, 0, 3);
    for (let i = particlesRef.current.length - 1; i >= 0; i -= 1) {
      const p = particlesRef.current[i];
      p.life -= delta;
      if (p.life <= 0) {
        particlesRef.current.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy = p.vy * 0.94 + p.gravity * dt * 0.6;
    }
  }, []);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    recordingRef.current = [
      {
        snake: snakeRef.current.map((s) => ({
          x: s.x,
          y: s.y,
          scale: s.scale,
        })),
        food: { ...foodRef.current },
        obstacles: obstaclesRef.current.map((o) => ({ ...o })),
        score: 0,
      },
    ];
  }, []);

  useEffect(() => () => {
    if (milestoneTimeoutRef.current) {
      clearTimeout(milestoneTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    if (!prefersReducedMotion) return;
    particlesRef.current = [];
    setMilestoneFlash(false);
    if (milestoneTimeoutRef.current) {
      clearTimeout(milestoneTimeoutRef.current);
      milestoneTimeoutRef.current = null;
    }
  }, [prefersReducedMotion]);

  /**
   * Play a short tone if sound is enabled.
   * @param {number} freq frequency in Hz
   */
  const beep = useCallback(
    (freq) => {
      if (!sound) return;
      try {
        const ctx =
          audioCtx.current ||
          new (window.AudioContext || window.webkitAudioContext)();
        audioCtx.current = ctx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          ctx.currentTime + 0.15,
        );
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } catch {
        // ignore audio errors
      }
    },
    [sound],
  );

  /** Render the current game state to the canvas. */
  const draw = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    ctx.clearRect(0, 0, BOARD_SIZE, BOARD_SIZE);
    const [bgTop, bgMid, bgBottom] = skinConfig.background;
    const gradient = ctx.createLinearGradient(0, 0, 0, BOARD_SIZE);
    gradient.addColorStop(0, bgTop);
    gradient.addColorStop(0.5, bgMid);
    gradient.addColorStop(1, bgBottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, BOARD_SIZE, BOARD_SIZE);

    // Subtle grid overlay for depth perception
    ctx.save();
    ctx.lineWidth = 0.35;
    ctx.strokeStyle = skinConfig.gridAccent;
    ctx.beginPath();
    for (let i = 1; i < GRID_SIZE; i += 1) {
      const pos = i * CELL_SIZE + 0.5;
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, BOARD_SIZE);
      ctx.moveTo(0, pos);
      ctx.lineTo(BOARD_SIZE, pos);
    }
    ctx.stroke();
    ctx.restore();

    // Ghost path preview with adaptive color
    const ghost = [];
    let gx = snakeRef.current[0].x;
    let gy = snakeRef.current[0].y;
    let gdir = dirRef.current;
    const moves = moveQueueRef.current;
    for (let i = 0; i < 5; i += 1) {
      if (moves[i]) gdir = moves[i];
      gx += gdir.x;
      gy += gdir.y;
      if (wrap) {
        gx = (gx + GRID_SIZE) % GRID_SIZE;
        gy = (gy + GRID_SIZE) % GRID_SIZE;
      } else if (gx < 0 || gy < 0 || gx >= GRID_SIZE || gy >= GRID_SIZE) {
        break;
      }
      ghost.push({ x: gx, y: gy });
    }
    if (ghost.length) {
      ctx.fillStyle = colorblindMode
        ? 'rgba(125,211,252,0.35)'
        : 'rgba(74,222,128,0.35)';
      ghost.forEach((g) => {
        ctx.fillRect(g.x * CELL_SIZE, g.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      });
    }

    // Obstacles with beveled shading
    obstaclesRef.current.forEach((o) => {
      const x = o.x * CELL_SIZE;
      const y = o.y * CELL_SIZE;
      const obsGrad = ctx.createLinearGradient(x, y, x + CELL_SIZE, y + CELL_SIZE);
      obsGrad.addColorStop(0, 'rgba(148,163,184,0.75)');
      obsGrad.addColorStop(1, 'rgba(71,85,105,0.95)');
      ctx.fillStyle = obsGrad;
      ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
      ctx.strokeStyle = 'rgba(15,23,42,0.6)';
      ctx.strokeRect(x + 0.5, y + 0.5, CELL_SIZE - 1, CELL_SIZE - 1);
    });

    // Food with halo
    const food = foodRef.current;
    const fx = food.x * CELL_SIZE + CELL_SIZE / 2;
    const fy = food.y * CELL_SIZE + CELL_SIZE / 2;
    const foodGradient = ctx.createRadialGradient(
      fx,
      fy,
      CELL_SIZE * 0.2,
      fx,
      fy,
      CELL_SIZE * 0.8,
    );
    foodGradient.addColorStop(0, '#fff9');
    foodGradient.addColorStop(0.45, skinConfig.foodColor);
    foodGradient.addColorStop(1, hexToRgba(skinConfig.foodColor, 0.1));
    ctx.fillStyle = foodGradient;
    ctx.beginPath();
    ctx.arc(fx, fy, CELL_SIZE * 0.45, 0, Math.PI * 2);
    ctx.fill();
    if (colorblindMode) {
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(fx - CELL_SIZE * 0.2, fy);
      ctx.lineTo(fx + CELL_SIZE * 0.2, fy);
      ctx.moveTo(fx, fy - CELL_SIZE * 0.2);
      ctx.lineTo(fx, fy + CELL_SIZE * 0.2);
      ctx.stroke();
    }

    // Snake segments with dynamic shading
    const segments = snakeRef.current;
    segments.forEach((seg, index) => {
      const scale = seg.scale ?? 1;
      const size = CELL_SIZE * scale;
      const offset = (CELL_SIZE - size) / 2;
      const x = seg.x * CELL_SIZE + offset;
      const y = seg.y * CELL_SIZE + offset;
      const ratio = segments.length <= 1 ? 0 : index / (segments.length - 1 || 1);
      const fill = lerpColor(skinConfig.snakePalette.mid, skinConfig.snakePalette.tail, ratio);
      const highlight = lerpColor(skinConfig.snakePalette.head, skinConfig.snakePalette.mid, Math.sqrt(ratio));
      const bodyGradient = ctx.createLinearGradient(x, y, x + size, y + size);
      bodyGradient.addColorStop(0, highlight);
      bodyGradient.addColorStop(1, fill);
      ctx.fillStyle = bodyGradient;
      ctx.fillRect(x, y, size, size);
      ctx.strokeStyle = hexToRgba('#0f172a', 0.25);
      ctx.lineWidth = 0.8;
      ctx.strokeRect(x + 0.4, y + 0.4, size - 0.8, size - 0.8);
      if (colorblindMode) {
        ctx.strokeStyle = hexToRgba('#0f172a', 0.5);
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(x, y + size / 2);
        ctx.lineTo(x + size, y + size / 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (scale < 1) {
        seg.scale = prefersReducedMotion ? 1 : Math.min(1, scale + 0.1);
      }
    });

    // Dynamic lighting around the head
    const head = segments[0];
    if (head && !prefersReducedMotion) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const cx = head.x * CELL_SIZE + CELL_SIZE / 2;
      const cy = head.y * CELL_SIZE + CELL_SIZE / 2;
      const glow = ctx.createRadialGradient(
        cx,
        cy,
        CELL_SIZE * 0.3,
        cx,
        cy,
        CELL_SIZE * 5,
      );
      glow.addColorStop(0, hexToRgba(skinConfig.snakePalette.head, 0.55));
      glow.addColorStop(0.4, hexToRgba(skinConfig.snakePalette.mid, 0.25));
      glow.addColorStop(1, 'rgba(15,23,42,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, BOARD_SIZE, BOARD_SIZE);
      ctx.restore();
    }

    // Particles overlay
    if (particlesRef.current.length) {
      ctx.save();
      particlesRef.current.forEach((p) => {
        const lifeRatio = clamp(p.life / p.initialLife, 0, 1);
        const alpha = clamp(lifeRatio + 0.1, 0, 1);
        if (p.glow) {
          const glowParticle = ctx.createRadialGradient(
            p.x,
            p.y,
            0,
            p.x,
            p.y,
            p.size * 4,
          );
          glowParticle.addColorStop(0, hexToRgba(p.color, alpha));
          glowParticle.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = glowParticle;
          ctx.globalAlpha = 0.6 * alpha;
          ctx.fillRect(p.x - p.size * 4, p.y - p.size * 4, p.size * 8, p.size * 8);
        }
        ctx.globalAlpha = alpha;
        ctx.fillStyle = hexToRgba(p.color, clamp(alpha + 0.2, 0, 1));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }
  }, [wrap, colorblindMode, skinConfig, prefersReducedMotion]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    ctxRef.current = ctx;
    draw();
  }, [draw, canvasRef]);

  /** Advance the game state by one step. */
  const advanceGame = useCallback(() => {
    if (playingRef.current) {
      const frames = playbackRef.current;
      const idx = playbackIndexRef.current;
      if (!frames || idx >= frames.length) {
        playingRef.current = false;
        runningRef.current = false;
        setRunning(false);
        return;
      }
      const frame = frames[idx];
      playbackIndexRef.current += 1;
      snakeRef.current = frame.snake.map((s) => ({ ...s }));
      foodRef.current = { ...frame.food };
      obstaclesRef.current = frame.obstacles.map((o) => ({ ...o }));
      const frameScore = frame.score ?? 0;
      scoreRef.current = frameScore;
      setScore(frameScore);
      return;
    }

    if (moveQueueRef.current.length) {
      const next = moveQueueRef.current.shift();
      if (
        next &&
        (dirRef.current.x + next.x !== 0 || dirRef.current.y + next.y !== 0)
      ) {
        dirRef.current = next;
      }
    }

    const consumedFood = { ...foodRef.current };
    const result = stepSnake(
      {
        snake: snakeRef.current.map((seg) => ({ x: seg.x, y: seg.y })),
        food: { ...foodRef.current },
        obstacles: obstaclesRef.current.map((o) => ({ x: o.x, y: o.y })),
      },
      dirRef.current,
      { wrap, gridSize: GRID_SIZE },
    );

    if (result.collision !== 'none') {
      haptics.danger();
      setGameOver(true);
      setWon(false);
      runningRef.current = false;
      setRunning(false);
      beep(120);
      return;
    }
    const nextSnake = result.state.snake.map((seg) => ({ ...seg, scale: 1 }));
    if (result.grew && !prefersReducedMotion && nextSnake.length) {
      nextSnake[0].scale = 0;
    }
    snakeRef.current = nextSnake;
    foodRef.current = { ...result.state.food };
    obstaclesRef.current = result.state.obstacles.map((o) => ({ ...o }));

    if (result.grew) {
      const nextScore = scoreRef.current + 1;
      scoreRef.current = nextScore;
      setScore(nextScore);
      haptics.score();
      beep(440);
      setSpeed((s) => Math.max(50, s * 0.95));
      spawnParticles(consumedFood);
      if (nextScore > 0 && nextScore % 5 === 0) {
        triggerMilestoneFlash();
        if (nextSnake.length) {
          spawnParticles(nextSnake[0], { milestone: true });
        }
      }
    }

    recordingRef.current.push({
      snake: snakeRef.current.map((seg) => ({
        x: seg.x,
        y: seg.y,
        scale: seg.scale,
      })),
      food: { ...foodRef.current },
      obstacles: obstaclesRef.current.map((o) => ({ ...o })),
      score: scoreRef.current,
    });

    if (result.won) {
      setWon(true);
      setGameOver(false);
      runningRef.current = false;
      setRunning(false);
      beep(620);
    }
  }, [
    wrap,
    beep,
    haptics,
    prefersReducedMotion,
    setRunning,
    setSpeed,
    spawnParticles,
    triggerMilestoneFlash,
  ]);

  const tick = useCallback(
    (delta) => {
      if (!prefersReducedMotion) {
        updateParticles(delta);
      }
      accumulatorRef.current += delta * 1000;
      if (accumulatorRef.current < speedRef.current) {
        draw();
        return;
      }
      while (accumulatorRef.current >= speedRef.current) {
        accumulatorRef.current -= speedRef.current;
        advanceGame();
        if (!runningRef.current) break;
      }
      draw();
    },
    [advanceGame, draw, updateParticles, prefersReducedMotion],
  );

  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  useEffect(() => {
    if (!isFocused && running) {
      focusPausedRef.current = true;
      runningRef.current = false;
      setRunning(false);
      return;
    }
    if (isFocused && focusPausedRef.current && !gameOver && !won) {
      focusPausedRef.current = false;
      runningRef.current = true;
      setRunning(true);
    }
  }, [isFocused, running, gameOver, won]);

  useGameLoop(tick, running);

  const enqueueDirection = useCallback(
    ({ x, y }) => {
      if (playingRef.current || gameOver || won) return;
      const queue = moveQueueRef.current;
      const curr = queue.length ? queue[queue.length - 1] : dirRef.current;
      if (curr.x + x === 0 && curr.y + y === 0) return;
      if (queue.length >= MAX_QUEUE) return;
      queue.push({ x, y });
    },
    [gameOver, won],
  );

  useGameControls(enqueueDirection, 'snake', {
    preventDefault: true,
    isFocused,
  });

  useEffect(() => {
    if ((gameOver || won) && score > highScore) {
      setHighScore(score);
    }
  }, [gameOver, won, score, highScore, setHighScore]);

  useEffect(() => {
    if (gameOver) haptics.gameOver();
  }, [gameOver, haptics]);

  useEffect(() => {
    if (!gameOver && !won) return;
    if (playingRef.current) return;
    if (recordingRef.current.length) {
      const name = `replay-${Date.now()}`;
      saveReplay(name, { frames: recordingRef.current, wrap });
    }
  }, [gameOver, won, saveReplay, wrap]);

  /** Reset the game to its initial state. */
  const reset = useCallback(() => {
    const base = buildInitialState();
    snakeRef.current = base.snake.map((seg) => ({ ...seg, scale: 1 }));
    foodRef.current = { ...base.food };
    obstaclesRef.current = base.obstacles.map((o) => ({ ...o }));
    dirRef.current = { x: 1, y: 0 };
    moveQueueRef.current = [];
    playingRef.current = false;
    playbackRef.current = [];
    playbackIndexRef.current = 0;
    accumulatorRef.current = 0;
    runningRef.current = true;
    setScore(0);
    scoreRef.current = 0;
    setGameOver(false);
    setWon(false);
    setRunning(true);
    setSpeed(baseSpeed);
    speedRef.current = baseSpeed;
    particlesRef.current = [];
    setMilestoneFlash(false);
    if (milestoneTimeoutRef.current) {
      clearTimeout(milestoneTimeoutRef.current);
      milestoneTimeoutRef.current = null;
    }
    recordingRef.current = [
      {
        snake: snakeRef.current.map((s) => ({
          x: s.x,
          y: s.y,
          scale: s.scale,
        })),
        food: { ...foodRef.current },
        obstacles: obstaclesRef.current.map((o) => ({ ...o })),
        score: 0,
      },
    ];
    draw();
  }, [baseSpeed, buildInitialState, draw]);

  const startReplay = useCallback(
    (name) => {
      const data = loadReplay(name);
      if (!data) return;
      playbackRef.current = data.frames || [];
      playbackIndexRef.current = 0;
      playingRef.current = true;
      setWrap(data.wrap ?? false);
      setRunning(true);
      runningRef.current = true;
      setGameOver(false);
      setWon(false);
      accumulatorRef.current = 0;
      if (data.frames?.length) {
        const first = data.frames[0];
        snakeRef.current = first.snake.map((s) => ({ ...s }));
        obstaclesRef.current = first.obstacles.map((o) => ({ ...o }));
        foodRef.current = { ...first.food };
        const frameScore = first.score ?? 0;
        scoreRef.current = frameScore;
        setScore(frameScore);
      }
    },
    [loadReplay, setWrap],
  );

  const handlePauseChange = useCallback(
    (paused) => {
      if (paused) {
        runningRef.current = false;
        setRunning(false);
        return;
      }
      if (playingRef.current || (!gameOver && !won)) {
        runningRef.current = true;
        setRunning(true);
      }
    },
    [gameOver, won],
  );

  const handleBaseSpeedChange = useCallback(
    (event) => {
      const value = Number(event.target.value);
      setBaseSpeed(value);
      setSpeed(value);
    },
    [setBaseSpeed, setSpeed],
  );

  const resetHighScore = useCallback(() => setHighScore(0), [setHighScore]);

  const replayOptions = listReplays();
  const settingsPanel = (
    <div className="space-y-3 text-sm text-slate-100">
      <div className="space-y-2">
        <label className="flex items-center justify-between gap-2">
          <span>Wrap</span>
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={wrap}
            onChange={(e) => setWrap(e.target.checked)}
          />
        </label>
        <label className="flex items-center justify-between gap-2">
          <span>Obstacles</span>
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={obstaclesEnabled}
            onChange={(e) => {
              setObstaclesEnabled(e.target.checked);
              reset();
            }}
          />
        </label>
        <label className="flex items-center justify-between gap-2">
          <span>Sound</span>
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={sound}
            onChange={(e) => setSound(e.target.checked)}
          />
        </label>
        <label className="flex items-center justify-between gap-2">
          <span>Haptics</span>
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={haptics.enabled}
            onChange={haptics.toggle}
          />
        </label>
      </div>
      <div className="space-y-2">
        <label htmlFor="snake-skin" className="flex items-center justify-between gap-2">
          <span>Skin</span>
          <select
            id="snake-skin"
            className="bg-gray-800/80 rounded px-2 py-1 focus:outline-none focus:ring"
            value={skinId}
            onChange={(e) => setSkinId(e.target.value)}
          >
            {Object.entries(SKINS).map(([key, skin]) => (
              <option key={key} value={key}>
                {skin.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center justify-between gap-2">
          <span>Colorblind assist</span>
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={colorblindMode}
            onChange={(e) => setColorblindMode(e.target.checked)}
          />
        </label>
      </div>
      <div className="space-y-2">
        <label htmlFor="snake-speed" className="flex flex-col gap-2">
          <span className="flex items-center justify-between">
            <span>Base speed</span>
            <span className="text-xs text-slate-400">{baseSpeed}ms</span>
          </span>
          <input
            id="snake-speed"
            type="range"
            min="50"
            max="300"
            step="10"
            value={baseSpeed}
            onChange={handleBaseSpeedChange}
            aria-label="Base speed"
            className="accent-emerald-400"
          />
        </label>
        <label className="flex items-center justify-between gap-2">
          <span>Touch D-pad</span>
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={showTouchControls}
            onChange={(e) => setShowTouchControls(e.target.checked)}
          />
        </label>
      </div>
      <div className="space-y-2">
        <label htmlFor="snake-replay" className="flex items-center justify-between gap-2">
          <span>Replay</span>
          <select
            id="snake-replay"
            className="bg-gray-800/80 rounded px-2 py-1 focus:outline-none focus:ring"
            value={selectedReplay}
            onChange={(e) => setSelectedReplay(e.target.value)}
          >
            <option value="">Select</option>
            {replayOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            className="flex-1 px-3 py-1 bg-gray-700/80 rounded shadow-sm transition hover:bg-gray-600 focus:outline-none focus:ring disabled:opacity-50"
            onClick={() => startReplay(selectedReplay)}
            disabled={!selectedReplay}
          >
            Play
          </button>
          <button
            type="button"
            className="flex-1 px-3 py-1 bg-gray-700/80 rounded shadow-sm transition hover:bg-gray-600 focus:outline-none focus:ring disabled:opacity-50"
            onClick={() => {
              removeReplay(selectedReplay);
              setSelectedReplay('');
            }}
            disabled={!selectedReplay}
          >
            Delete
          </button>
        </div>
      </div>
      <button
        type="button"
        className="w-full px-3 py-1 bg-gray-700/80 rounded shadow-sm transition hover:bg-gray-600 focus:outline-none focus:ring"
        onClick={resetHighScore}
      >
        Reset high score
      </button>
    </div>
  );

  return (
    <GameLayout
      gameId="snake"
      score={score}
      highScore={highScore}
      onPauseChange={handlePauseChange}
      onRestart={reset}
      pauseHotkeys={[' ', 'space', 'spacebar']}
      restartHotkeys={['r']}
      settingsPanel={settingsPanel}
      isFocused={isFocused}
    >
      <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white select-none px-3 pb-4">
        <p id="snake-instructions" className="sr-only">
          Use arrow keys or swipe to move. Press Space to pause and R to restart.
        </p>
        <div className="relative flex flex-col items-center">
          <canvas
            ref={canvasRef}
            className="bg-gray-900/80 border border-gray-700/70 shadow-xl w-full h-full rounded"
            tabIndex={0}
            aria-label="Snake game board"
            aria-describedby="snake-instructions"
          />
          {gameOver && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 text-center px-4"
              role="status"
              aria-live="polite"
            >
              <div className="text-2xl font-semibold text-rose-200">
                Game Over
              </div>
              <div className="text-sm text-slate-200">
                Press R or Restart to try again.
              </div>
            </div>
          )}
          {won && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 text-center px-4"
              role="status"
              aria-live="polite"
            >
              <div className="text-2xl font-semibold text-emerald-200">
                You win!
              </div>
              <div className="text-sm text-slate-200">
                Press R or Restart to play again.
              </div>
            </div>
          )}
          {milestoneFlash && (
            <div
              className="absolute -top-10 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500/80 px-4 py-1 text-sm font-semibold text-slate-900 shadow-lg backdrop-blur"
              role="status"
              aria-live="polite"
            >
              Milestone {score}!
            </div>
          )}
        </div>
        {showTouchControls && (
          <div className="mt-4 grid grid-cols-3 gap-2 text-lg">
            <div />
            <button
              type="button"
              onPointerDown={() => enqueueDirection({ x: 0, y: -1 })}
              className="h-12 w-12 rounded bg-gray-800/80 shadow-sm transition hover:bg-gray-700 focus:outline-none focus:ring"
              aria-label="Move up"
            >
              ↑
            </button>
            <div />
            <button
              type="button"
              onPointerDown={() => enqueueDirection({ x: -1, y: 0 })}
              className="h-12 w-12 rounded bg-gray-800/80 shadow-sm transition hover:bg-gray-700 focus:outline-none focus:ring"
              aria-label="Move left"
            >
              ←
            </button>
            <button
              type="button"
              onPointerDown={() => enqueueDirection({ x: 0, y: 1 })}
              className="h-12 w-12 rounded bg-gray-800/80 shadow-sm transition hover:bg-gray-700 focus:outline-none focus:ring"
              aria-label="Move down"
            >
              ↓
            </button>
            <button
              type="button"
              onPointerDown={() => enqueueDirection({ x: 1, y: 0 })}
              className="h-12 w-12 rounded bg-gray-800/80 shadow-sm transition hover:bg-gray-700 focus:outline-none focus:ring"
              aria-label="Move right"
            >
              →
            </button>
          </div>
        )}
      </div>
    </GameLayout>
  );
};

export default Snake;
