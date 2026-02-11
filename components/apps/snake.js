import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import GameLayout from './GameLayout';
import useGameControls from './useGameControls';
import { useSaveSlots } from './Games/common';
import GameLoop from './Games/common/loop/GameLoop';
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
import rng from '../../apps/games/rng';
import {
  buildReplayMetadata,
  normalizeReplayForSave,
  parseReplayImport,
  replayLabel,
} from './snakeReplay';

const CELL_SIZE = 16; // pixels
const DEFAULT_SPEED = 120; // ms per move
const MAX_QUEUE = 3;
const BOARD_SIZE = GRID_SIZE * CELL_SIZE;
const SIMULATION_FPS = 60;
const COUNTDOWN_SECONDS = 3;
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
  const cachedLayersRef = useRef({
    background: null,
    grid: null,
    obstacleKey: '',
    obstacles: null,
    width: 0,
    height: 0,
  });
  const gameLoopRef = useRef(null);
  const pendingDirectionRef = useRef(null);
  const movementBudgetRef = useRef(0);
  const milestoneTimeoutRef = useRef(null);
  const [obstaclePack] = usePersistentState(
    'snake:obstacles',
    [],
    (v) => Array.isArray(v),
  );
  const [obstaclesEnabled, setObstaclesEnabled] = usePersistentState(
    'snake:obstaclesEnabled',
    true,
    (v) => typeof v === 'boolean',
  );
  const makeSeed = useCallback(
    () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    [],
  );
  const buildInitialState = useCallback(
    (seed, settings = {}) => {
      const nextSeed = seed || makeSeed();
      rng.reset(nextSeed);
      const obstaclesActive =
        settings.obstaclesEnabled ?? obstaclesEnabled;
      const obstacleSource = settings.obstaclePack ?? obstaclePack;
      return createInitialState({
        obstacles:
          obstaclesActive && obstacleSource.length ? obstacleSource : [],
        obstacleCount:
          obstaclesActive && !obstacleSource.length ? 5 : 0,
        random: rng.random,
      });
    },
    [obstaclePack, obstaclesEnabled, makeSeed],
  );
  const seedRef = useRef('');
  const initialStateRef = useRef(null);
  if (!initialStateRef.current) {
    seedRef.current = makeSeed();
    initialStateRef.current = buildInitialState(seedRef.current);
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
  const runningRef = useRef(true);
  const scoreRef = useRef(0);
  const audioCtx = useRef(null);
  const haptics = useGameHaptics();
  const prefersReducedMotion = usePrefersReducedMotion();

  const [running, setRunning] = useState(true);
  const [countdown, setCountdown] = useState(0);
  const [wrap, setWrap] = usePersistentState(
    'snake:wrap',
    false,
    (v) => typeof v === 'boolean',
  );
  const [skinId, setSkinId] = usePersistentState(
    'snake:skin',
    'classic',
    (v) => typeof v === 'string' && Object.prototype.hasOwnProperty.call(SKINS, v),
  );
  const [colorblindMode, setColorblindMode] = usePersistentState(
    'snake:colorblind',
    false,
    (v) => typeof v === 'boolean',
  );
  const [sound, setSound] = usePersistentState(
    'snake:sound',
    true,
    (v) => typeof v === 'boolean',
  );
  const [baseSpeed, setBaseSpeed] = usePersistentState(
    'snake:baseSpeed',
    DEFAULT_SPEED,
    (v) => typeof v === 'number',
  );
  const [speed, setSpeed] = useState(baseSpeed);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [highScore, setHighScore] = usePersistentState(
    'snake:highScore',
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
    'snake:touchControls',
    isTouch,
    (v) => typeof v === 'boolean',
  );
  const playingRef = useRef(false);
  const focusPausedRef = useRef(false);
  const replayModeRef = useRef('inputs');
  const legacyPlaybackRef = useRef([]);
  const legacyPlaybackIndexRef = useRef(0);
  const replayInputsRef = useRef([]);
  const replayIndexRef = useRef(0);
  const inputLogRef = useRef([]);
  const stepCountRef = useRef(0);
  const [milestoneFlash, setMilestoneFlash] = useState(false);
  const [reducedMotionPaused, setReducedMotionPaused] = useState(false);
  const [applySpeedImmediately, setApplySpeedImmediately] = usePersistentState(
    'snake:applySpeedImmediately',
    false,
    (v) => typeof v === 'boolean',
  );
  const [replayImportText, setReplayImportText] = useState('');
  const [replayMessage, setReplayMessage] = useState('');
  const [renameReplay, setRenameReplay] = useState('');

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

  const snakeColorBins = useMemo(() => {
    const bins = 20;
    return Array.from({ length: bins }, (_, idx) => {
      const ratio = bins <= 1 ? 0 : idx / (bins - 1);
      return {
        fill: lerpColor(skinConfig.snakePalette.mid, skinConfig.snakePalette.tail, ratio),
        highlight: lerpColor(
          skinConfig.snakePalette.head,
          skinConfig.snakePalette.mid,
          Math.sqrt(ratio),
        ),
      };
    });
  }, [skinConfig]);

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
    cachedLayersRef.current.background = null;
    cachedLayersRef.current.grid = null;
    cachedLayersRef.current.obstacles = null;
    cachedLayersRef.current.obstacleKey = '';
  }, [skinConfig]);


  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => () => {
    if (milestoneTimeoutRef.current) {
      clearTimeout(milestoneTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const migrations = [
      {
        oldKey: 'snake_wrap',
        newKey: 'snake:wrap',
        setter: setWrap,
        validator: (v) => typeof v === 'boolean',
      },
      {
        oldKey: 'snake_skin',
        newKey: 'snake:skin',
        setter: setSkinId,
        validator: (v) =>
          typeof v === 'string' &&
          Object.prototype.hasOwnProperty.call(SKINS, v),
      },
      {
        oldKey: 'snake_colorblind_mode',
        newKey: 'snake:colorblind',
        setter: setColorblindMode,
        validator: (v) => typeof v === 'boolean',
      },
      {
        oldKey: 'snake_sound',
        newKey: 'snake:sound',
        setter: setSound,
        validator: (v) => typeof v === 'boolean',
      },
      {
        oldKey: 'snake_base_speed',
        newKey: 'snake:baseSpeed',
        setter: setBaseSpeed,
        validator: (v) => typeof v === 'number',
      },
      {
        oldKey: 'snake_highscore',
        newKey: 'snake:highScore',
        setter: setHighScore,
        validator: (v) => typeof v === 'number',
      },
      {
        oldKey: 'snake_touch_controls',
        newKey: 'snake:touchControls',
        setter: setShowTouchControls,
        validator: (v) => typeof v === 'boolean',
      },
      {
        oldKey: 'snake_obstacles_enabled',
        newKey: 'snake:obstaclesEnabled',
        setter: setObstaclesEnabled,
        validator: (v) => typeof v === 'boolean',
      },
    ];
    migrations.forEach(({ oldKey, newKey, setter, validator }) => {
      try {
        const existing = window.localStorage.getItem(newKey);
        if (existing !== null) return;
        const legacy = window.localStorage.getItem(oldKey);
        if (legacy === null) return;
        const parsed = JSON.parse(legacy);
        if (validator && !validator(parsed)) return;
        window.localStorage.setItem(newKey, JSON.stringify(parsed));
        setter(parsed);
        window.localStorage.removeItem(oldKey);
      } catch {
        // ignore migration errors
      }
    });
  }, [
    setWrap,
    setSkinId,
    setColorblindMode,
    setSound,
    setBaseSpeed,
    setHighScore,
    setShowTouchControls,
    setObstaclesEnabled,
  ]);

  useEffect(() => {
    if (!prefersReducedMotion) return;
    particlesRef.current = [];
    setMilestoneFlash(false);
    if (milestoneTimeoutRef.current) {
      clearTimeout(milestoneTimeoutRef.current);
      milestoneTimeoutRef.current = null;
    }
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion) {
      setReducedMotionPaused(true);
      if (runningRef.current) {
        runningRef.current = false;
        setRunning(false);
      }
      return;
    }
    if (reducedMotionPaused) {
      setReducedMotionPaused(false);
      if (!gameOver && !won && isFocused) {
        runningRef.current = true;
        setRunning(true);
      }
    }
  }, [prefersReducedMotion, reducedMotionPaused, gameOver, won, isFocused]);

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
    const cache = cachedLayersRef.current;
    if (!cache.background || cache.width !== BOARD_SIZE || cache.height !== BOARD_SIZE) {
      const bgCanvas = document.createElement('canvas');
      bgCanvas.width = BOARD_SIZE;
      bgCanvas.height = BOARD_SIZE;
      const bgCtx = bgCanvas.getContext('2d');
      if (bgCtx) {
        const [bgTop, bgMid, bgBottom] = skinConfig.background;
        const gradient = bgCtx.createLinearGradient(0, 0, 0, BOARD_SIZE);
        gradient.addColorStop(0, bgTop);
        gradient.addColorStop(0.5, bgMid);
        gradient.addColorStop(1, bgBottom);
        bgCtx.fillStyle = gradient;
        bgCtx.fillRect(0, 0, BOARD_SIZE, BOARD_SIZE);
      }
      cache.background = bgCanvas;
      cache.width = BOARD_SIZE;
      cache.height = BOARD_SIZE;
    }
    if (!cache.grid || cache.width !== BOARD_SIZE || cache.height !== BOARD_SIZE) {
      const gridCanvas = document.createElement('canvas');
      gridCanvas.width = BOARD_SIZE;
      gridCanvas.height = BOARD_SIZE;
      const gridCtx = gridCanvas.getContext('2d');
      if (gridCtx) {
        gridCtx.save();
        gridCtx.lineWidth = 0.35;
        gridCtx.strokeStyle = skinConfig.gridAccent;
        gridCtx.beginPath();
        for (let i = 1; i < GRID_SIZE; i += 1) {
          const pos = i * CELL_SIZE + 0.5;
          gridCtx.moveTo(pos, 0);
          gridCtx.lineTo(pos, BOARD_SIZE);
          gridCtx.moveTo(0, pos);
          gridCtx.lineTo(BOARD_SIZE, pos);
        }
        gridCtx.stroke();
        gridCtx.restore();
      }
      cache.grid = gridCanvas;
    }
    if (cache.background) ctx.drawImage(cache.background, 0, 0);
    if (cache.grid) ctx.drawImage(cache.grid, 0, 0);

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

    // Obstacles with beveled shading (cached layer)
    const obstacleKey = obstaclesRef.current
      .map((o) => `${o.x},${o.y}`)
      .sort()
      .join('|');
    if (!cachedLayersRef.current.obstacles || cachedLayersRef.current.obstacleKey !== obstacleKey) {
      const obstacleCanvas = document.createElement('canvas');
      obstacleCanvas.width = BOARD_SIZE;
      obstacleCanvas.height = BOARD_SIZE;
      const obstacleCtx = obstacleCanvas.getContext('2d');
      if (obstacleCtx) {
        obstaclesRef.current.forEach((o) => {
          const x = o.x * CELL_SIZE;
          const y = o.y * CELL_SIZE;
          const obsGrad = obstacleCtx.createLinearGradient(x, y, x + CELL_SIZE, y + CELL_SIZE);
          obsGrad.addColorStop(0, 'rgba(148,163,184,0.75)');
          obsGrad.addColorStop(1, 'rgba(71,85,105,0.95)');
          obstacleCtx.fillStyle = obsGrad;
          obstacleCtx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
          obstacleCtx.strokeStyle = 'rgba(15,23,42,0.6)';
          obstacleCtx.strokeRect(x + 0.5, y + 0.5, CELL_SIZE - 1, CELL_SIZE - 1);
        });
      }
      cachedLayersRef.current.obstacles = obstacleCanvas;
      cachedLayersRef.current.obstacleKey = obstacleKey;
    }
    if (cachedLayersRef.current.obstacles) ctx.drawImage(cachedLayersRef.current.obstacles, 0, 0);

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
      const bin = snakeColorBins[Math.min(snakeColorBins.length - 1, Math.floor(ratio * snakeColorBins.length))];
      const fill = bin?.fill || skinConfig.snakePalette.mid;
      const highlight = bin?.highlight || skinConfig.snakePalette.head;
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
  }, [wrap, colorblindMode, skinConfig, prefersReducedMotion, snakeColorBins]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    ctxRef.current = ctx;
    draw();
  }, [draw, canvasRef]);

  /** Advance the game state by one step. */
  const advanceGame = useCallback(() => {
    if (playingRef.current && replayModeRef.current === 'frames') {
      const frames = legacyPlaybackRef.current;
      const idx = legacyPlaybackIndexRef.current;
      if (!frames || idx >= frames.length) {
        playingRef.current = false;
        runningRef.current = false;
        setRunning(false);
        return;
      }
      const frame = frames[idx];
      legacyPlaybackIndexRef.current += 1;
      snakeRef.current = frame.snake.map((s) => ({ ...s }));
      foodRef.current = { ...frame.food };
      obstaclesRef.current = frame.obstacles.map((o) => ({ ...o }));
      const frameScore = frame.score ?? 0;
      scoreRef.current = frameScore;
      setScore(frameScore);
      return;
    }
    if (playingRef.current) {
      const inputs = replayInputsRef.current;
      while (
        replayIndexRef.current < inputs.length &&
        inputs[replayIndexRef.current].stepIndex === stepCountRef.current
      ) {
        moveQueueRef.current.push(inputs[replayIndexRef.current].dir);
        replayIndexRef.current += 1;
      }
    }

    if (moveQueueRef.current.length) {
      const next = moveQueueRef.current.shift();
      if (
        next &&
        (dirRef.current.x + next.x !== 0 || dirRef.current.y + next.y !== 0)
      ) {
        pendingDirectionRef.current = next;
      }
    }

    if (pendingDirectionRef.current) {
      dirRef.current = pendingDirectionRef.current;
      pendingDirectionRef.current = null;
    }

    const consumedFood = { ...foodRef.current };
    const result = stepSnake(
      {
        snake: snakeRef.current.map((seg) => ({ x: seg.x, y: seg.y })),
        food: { ...foodRef.current },
        obstacles: obstaclesRef.current.map((o) => ({ x: o.x, y: o.y })),
      },
      dirRef.current,
      {
        wrap,
        gridSize: GRID_SIZE,
        random: rng.random,
        ensureReachableFood: obstaclesEnabled,
        obstaclePlacementSafety: obstaclesEnabled ? 'basic' : 'off',
      },
    );

    if (result.collision !== 'none') {
      haptics.danger();
      setGameOver(true);
      setWon(false);
      runningRef.current = false;
      setRunning(false);
      playingRef.current = false;
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

    stepCountRef.current += 1;

    if (result.won) {
      playingRef.current = false;
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
    obstaclesEnabled,
  ]);

  const tick = useCallback(
    (dtMs) => {
      const delta = dtMs / 1000;
      if (!prefersReducedMotion) {
        updateParticles(delta);
      }
      movementBudgetRef.current += dtMs;
      const maxMovesPerTick = 4;
      let moves = 0;
      while (movementBudgetRef.current >= speedRef.current && moves < maxMovesPerTick) {
        movementBudgetRef.current -= speedRef.current;
        advanceGame();
        moves += 1;
        if (!runningRef.current) break;
      }
    },
    [advanceGame, updateParticles, prefersReducedMotion],
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
    if (
      isFocused &&
      focusPausedRef.current &&
      !gameOver &&
      !won &&
      !reducedMotionPaused
    ) {
      focusPausedRef.current = false;
      runningRef.current = true;
      setRunning(true);
    }
  }, [isFocused, running, gameOver, won, reducedMotionPaused]);

  useEffect(() => {
    if (!gameLoopRef.current) {
      gameLoopRef.current = new GameLoop(tick, undefined, {
        fps: SIMULATION_FPS,
        maxDt: 120,
        interpolation: true,
        render: () => draw(),
      });
    }
    return () => {
      gameLoopRef.current?.stop();
      gameLoopRef.current = null;
    };
  }, [tick, draw]);

  useEffect(() => {
    const loop = gameLoopRef.current;
    if (!loop) return;
    if (running) {
      loop.start();
    } else {
      loop.stop();
      draw();
    }
  }, [running, draw]);

  const enqueueDirection = useCallback(
    ({ x, y }) => {
      if (playingRef.current || gameOver || won) return;
      const queue = moveQueueRef.current;
      const curr = queue.length ? queue[queue.length - 1] : dirRef.current;
      if (curr.x + x === 0 && curr.y + y === 0) return;
      if (queue.length >= MAX_QUEUE) return;
      queue.push({ x, y });
      inputLogRef.current.push({
        stepIndex: stepCountRef.current,
        dir: { x, y },
      });
    },
    [gameOver, won],
  );

  useGameControls(enqueueDirection, 'snake', {
    preventDefault: true,
    isFocused,
    targetRef: canvasRef,
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
    if (inputLogRef.current.length || stepCountRef.current > 0) {
      const name = `replay-${Date.now()}`;
      saveReplay(
        name,
        normalizeReplayForSave(
          {
            seed: seedRef.current,
            settings: {
              wrap,
              obstaclesEnabled,
              obstaclePack,
              baseSpeed,
              skinId,
              colorblind: colorblindMode,
            },
            inputs: inputLogRef.current,
            metadata: buildReplayMetadata({
              score: scoreRef.current,
              wrap,
              obstaclesEnabled,
              baseSpeed,
              skinId,
              colorblind: colorblindMode,
              name,
            }),
          },
          name,
        ),
      );
    }
  }, [gameOver, won, saveReplay, wrap, obstaclesEnabled, obstaclePack, baseSpeed, skinId, colorblindMode]);

  const startWithCountdown = useCallback(() => {
    if (prefersReducedMotion) {
      runningRef.current = true;
      setRunning(true);
      return;
    }
    setCountdown(COUNTDOWN_SECONDS);
    let remaining = COUNTDOWN_SECONDS;
    const timer = window.setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        window.clearInterval(timer);
        setCountdown(0);
        runningRef.current = true;
        setRunning(true);
        return;
      }
      setCountdown(remaining);
    }, 400);
  }, [prefersReducedMotion]);

  /** Reset the game to its initial state. */
  const reset = useCallback(() => {
    const nextSeed = makeSeed();
    seedRef.current = nextSeed;
    const base = buildInitialState(nextSeed);
    snakeRef.current = base.snake.map((seg) => ({ ...seg, scale: 1 }));
    foodRef.current = { ...base.food };
    obstaclesRef.current = base.obstacles.map((o) => ({ ...o }));
    dirRef.current = { x: 1, y: 0 };
    moveQueueRef.current = [];
    playingRef.current = false;
    replayModeRef.current = 'inputs';
    legacyPlaybackRef.current = [];
    legacyPlaybackIndexRef.current = 0;
    replayInputsRef.current = [];
    replayIndexRef.current = 0;
    inputLogRef.current = [];
    stepCountRef.current = 0;
    movementBudgetRef.current = 0;
    const shouldRun = !prefersReducedMotion && isFocused;
    runningRef.current = false;
    setScore(0);
    scoreRef.current = 0;
    setGameOver(false);
    setWon(false);
    setRunning(false);
    setSpeed(baseSpeed);
    speedRef.current = baseSpeed;
    particlesRef.current = [];
    setMilestoneFlash(false);
    setReducedMotionPaused(prefersReducedMotion);
    if (milestoneTimeoutRef.current) {
      clearTimeout(milestoneTimeoutRef.current);
      milestoneTimeoutRef.current = null;
    }
    draw();
    if (shouldRun) startWithCountdown();
  }, [baseSpeed, buildInitialState, draw, isFocused, makeSeed, prefersReducedMotion, startWithCountdown]);

  const startReplay = useCallback(
    (name) => {
      const data = loadReplay(name);
      if (!data) return;
      const safeInputs = Array.isArray(data.inputs) ? data.inputs : [];
      const hasLegacyFrames = Array.isArray(data.frames) && data.frames.length > 0;
      replayModeRef.current = hasLegacyFrames ? 'frames' : 'inputs';
      legacyPlaybackRef.current = hasLegacyFrames ? data.frames : [];
      legacyPlaybackIndexRef.current = 0;
      replayInputsRef.current = safeInputs;
      replayIndexRef.current = 0;
      stepCountRef.current = 0;
      inputLogRef.current = [];
      playingRef.current = true;
      const settings = data.settings || {};
      if (settings.wrap !== undefined) setWrap(settings.wrap);
      if (settings.obstaclesEnabled !== undefined) {
        setObstaclesEnabled(settings.obstaclesEnabled);
      }
      if (settings.baseSpeed !== undefined) {
        setBaseSpeed(settings.baseSpeed);
        setSpeed(settings.baseSpeed);
        speedRef.current = settings.baseSpeed;
      } else {
        setSpeed(baseSpeed);
        speedRef.current = baseSpeed;
      }
      if (settings.skinId !== undefined) setSkinId(settings.skinId);
      const replaySeed = data.seed || makeSeed();
      seedRef.current = replaySeed;
      const base = buildInitialState(replaySeed, settings);
      snakeRef.current = base.snake.map((seg) => ({ ...seg, scale: 1 }));
      obstaclesRef.current = base.obstacles.map((o) => ({ ...o }));
      foodRef.current = { ...base.food };
      dirRef.current = { x: 1, y: 0 };
      moveQueueRef.current = [];
      movementBudgetRef.current = 0;
      const shouldRun = !prefersReducedMotion && isFocused;
      setReducedMotionPaused(prefersReducedMotion);
      setRunning(false);
      runningRef.current = shouldRun;
      setGameOver(false);
      setWon(false);
      if (hasLegacyFrames) {
        const first = data.frames[0];
        snakeRef.current = first.snake.map((s) => ({ ...s }));
        obstaclesRef.current = first.obstacles.map((o) => ({ ...o }));
        foodRef.current = { ...first.food };
        const frameScore = first.score ?? 0;
        scoreRef.current = frameScore;
        setScore(frameScore);
      } else {
        scoreRef.current = 0;
        setScore(0);
      }
      if (shouldRun) startWithCountdown();
    },
    [
      baseSpeed,
      buildInitialState,
      isFocused,
      loadReplay,
      makeSeed,
      prefersReducedMotion,
      setBaseSpeed,
      setObstaclesEnabled,
      setSkinId,
      setSpeed,
      setWrap,
      startWithCountdown,
    ],
  );

  const handlePauseChange = useCallback(
    (paused) => {
      if (paused) {
        runningRef.current = false;
        setRunning(false);
        return;
      }
      if (reducedMotionPaused) {
        return;
      }
      if (playingRef.current || (!gameOver && !won)) {
        startWithCountdown();
      }
    },
    [gameOver, won, reducedMotionPaused, startWithCountdown],
  );

  const handleBaseSpeedChange = useCallback(
    (event) => {
      const value = Number(event.target.value);
      setBaseSpeed(value);
      if (applySpeedImmediately) {
        setSpeed(value);
        speedRef.current = value;
      }
    },
    [applySpeedImmediately, setBaseSpeed, setSpeed],
  );

  const resetHighScore = useCallback(() => setHighScore(0), [setHighScore]);

  const replayOptions = useMemo(() => listReplays().map((name) => ({ name, label: replayLabel(name, loadReplay(name)) })), [listReplays, loadReplay]);
  const settingsPanel = (
    <div className="space-y-3 text-sm text-slate-100">
      <div className="space-y-2">
        <label className="flex items-center justify-between gap-2">
          <span>Wrap</span>
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={wrap}
            aria-label="Wrap"
            onChange={(e) => setWrap(e.target.checked)}
          />
        </label>
        <label className="flex items-center justify-between gap-2">
          <span>Obstacles</span>
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={obstaclesEnabled}
            aria-label="Obstacles"
            onChange={(e) => {
              setObstaclesEnabled(e.target.checked);
              reset();
            }}
          />
        </label>
        <p className="text-xs text-slate-400">Changing obstacles restarts the run.</p>
        <label className="flex items-center justify-between gap-2">
          <span>Sound</span>
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={sound}
            aria-label="Sound"
            onChange={(e) => setSound(e.target.checked)}
          />
        </label>
        <label className="flex items-center justify-between gap-2">
          <span>Haptics</span>
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={haptics.enabled}
            aria-label="Haptics"
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
            aria-label="Colorblind assist"
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
          <span>Apply speed immediately</span>
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={applySpeedImmediately}
            aria-label="Apply speed immediately"
            onChange={(e) => setApplySpeedImmediately(e.target.checked)}
          />
        </label>
        {!applySpeedImmediately && <p className="text-xs text-slate-400">Base speed applies on restart for consistent runs.</p>}
        <label className="flex items-center justify-between gap-2">
          <span>Touch D-pad</span>
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={showTouchControls}
            aria-label="Touch D-pad"
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
            {replayOptions.map((replay) => (
              <option key={replay.name} value={replay.name}>
                {replay.label}
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
        <div className="flex gap-2">
          <input
            type="text"
            value={renameReplay}
            onChange={(e) => setRenameReplay(e.target.value)}
            placeholder="New replay name"
            className="flex-1 rounded bg-gray-800/80 px-2 py-1"
            aria-label="Replay name"
          />
          <button
            type="button"
            className="px-3 py-1 bg-gray-700/80 rounded shadow-sm transition hover:bg-gray-600 focus:outline-none focus:ring disabled:opacity-50"
            disabled={!selectedReplay || !renameReplay.trim()}
            onClick={() => {
              const data = loadReplay(selectedReplay);
              if (!data) return;
              const nextName = renameReplay.trim();
              saveReplay(nextName, normalizeReplayForSave({ ...data, metadata: { ...(data.metadata || {}), name: nextName } }, nextName));
              if (nextName !== selectedReplay) removeReplay(selectedReplay);
              setSelectedReplay(nextName);
              setRenameReplay('');
            }}
            aria-label="Rename replay"
          >
            Rename
          </button>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="flex-1 px-3 py-1 bg-gray-700/80 rounded shadow-sm transition hover:bg-gray-600 focus:outline-none focus:ring disabled:opacity-50"
            disabled={!selectedReplay}
            onClick={async () => {
              const data = loadReplay(selectedReplay);
              if (!data) return;
              const payload = JSON.stringify(normalizeReplayForSave(data, selectedReplay), null, 2);
              try {
                if (navigator.clipboard?.writeText) {
                  await navigator.clipboard.writeText(payload);
                  setReplayMessage('Replay copied to clipboard.');
                  return;
                }
              } catch {}
              try {
                const blob = new Blob([payload], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${selectedReplay}.json`;
                a.click();
                URL.revokeObjectURL(url);
                setReplayMessage('Replay downloaded as JSON.');
              } catch {
                setReplayMessage('Unable to export replay.');
              }
            }}
          >
            Export JSON
          </button>
        </div>
        <div className="space-y-1">
          <textarea
            value={replayImportText}
            onChange={(e) => setReplayImportText(e.target.value)}
            className="w-full rounded bg-gray-800/80 px-2 py-1"
            rows={3}
            placeholder="Paste replay JSON"
            aria-label="Replay import JSON"
          />
          <button
            type="button"
            className="w-full px-3 py-1 bg-gray-700/80 rounded shadow-sm transition hover:bg-gray-600 focus:outline-none focus:ring"
            onClick={() => {
              const parsed = parseReplayImport(replayImportText);
              if (!parsed) {
                setReplayMessage('Invalid replay JSON.');
                return;
              }
              const replayName = `replay-${Date.now()}`;
              saveReplay(replayName, normalizeReplayForSave(parsed, replayName));
              setSelectedReplay(replayName);
              setReplayMessage('Replay imported.');
            }}
          >
            Import JSON
          </button>
        </div>
        {replayMessage && <p className="text-xs text-slate-300">{replayMessage}</p>}
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
          {reducedMotionPaused && !gameOver && !won && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 text-center px-4"
              role="status"
              aria-live="polite"
            >
              <div className="text-lg font-semibold text-slate-100">
                Reduced motion is enabled. Press Resume to play.
              </div>
              <button
                type="button"
                className="px-4 py-1.5 bg-emerald-500/90 text-slate-900 font-semibold rounded shadow-sm transition hover:bg-emerald-400 focus:outline-none focus:ring"
                onClick={() => {
                  setReducedMotionPaused(false);
                  if (!gameOver && !won && isFocused) {
                    startWithCountdown();
                  }
                }}
              >
                Resume
              </button>
            </div>
          )}
          {countdown > 0 && !gameOver && !won && (
            <div
              className="absolute inset-0 flex items-center justify-center bg-black/55 text-5xl font-bold text-emerald-200"
              role="status"
              aria-live="polite"
            >
              {countdown}
            </div>
          )}
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
              onPointerDown={() => { haptics.vibrate([10]); enqueueDirection({ x: 0, y: -1 }); }}
              className="h-12 w-12 rounded bg-gray-800/80 shadow-sm transition hover:bg-gray-700 focus:outline-none focus:ring"
              aria-label="Move up"
            >
              ↑
            </button>
            <div />
            <button
              type="button"
              onPointerDown={() => { haptics.vibrate([10]); enqueueDirection({ x: -1, y: 0 }); }}
              className="h-12 w-12 rounded bg-gray-800/80 shadow-sm transition hover:bg-gray-700 focus:outline-none focus:ring"
              aria-label="Move left"
            >
              ←
            </button>
            <button
              type="button"
              onPointerDown={() => { haptics.vibrate([10]); enqueueDirection({ x: 0, y: 1 }); }}
              className="h-12 w-12 rounded bg-gray-800/80 shadow-sm transition hover:bg-gray-700 focus:outline-none focus:ring"
              aria-label="Move down"
            >
              ↓
            </button>
            <button
              type="button"
              onPointerDown={() => { haptics.vibrate([10]); enqueueDirection({ x: 1, y: 0 }); }}
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
