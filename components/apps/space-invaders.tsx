import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GameLayout, { useInputRecorder } from './GameLayout';
import useInputMapping from './Games/common/input-remap/useInputMapping';
import useCanvasResize from '../../hooks/useCanvasResize';
import usePersistentState from '../../hooks/usePersistentState';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';
import { useGameLoop, useGamepad, useLeaderboard, VirtualPad } from './Games/common';
import { consumeGameKey } from '../../utils/gameInput';
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
const STAR_COUNT = 48;
const STAR_LAYERS = 3;
const MAX_PARTICLES = 80;
const COUNTDOWN_START = 3;

const DEFAULT_KEY_MAP = {
  left: 'ArrowLeft',
  right: 'ArrowRight',
  fire: ' ',
  pause: 'p',
  restart: 'r',
};

const ACTION_ALIASES: Record<keyof typeof DEFAULT_KEY_MAP, string[]> = {
  left: ['a'],
  right: ['d'],
  fire: ['Enter'],
  pause: ['Escape'],
  restart: [],
};

const normalizeMappedKey = (key: string) => {
  const trimmed = key.trim();
  if (!trimmed) return '';
  const lower = trimmed.toLowerCase();
  if (lower === 'space') return ' ';
  if (lower === 'esc') return 'Escape';
  return trimmed;
};

const splitMappedKeys = (value?: string) => {
  if (!value) return [];
  return value
    .split('/')
    .map((token) => normalizeMappedKey(token))
    .filter(Boolean);
};

const comparableKey = (key: string) => (key === ' ' ? ' ' : key.toLowerCase());

type GameStatus = 'ready' | 'countdown' | 'playing' | 'wave' | 'gameover';
type Particle = {
  x: number;
  y: number;
  dx: number;
  dy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
};
type Star = {
  x: number;
  y: number;
  size: number;
  speed: number;
  alpha: number;
};

type TonePreset = {
  type: OscillatorType;
  attack: number;
  release: number;
  volume: number;
};

const MARCH_FREQUENCIES = [180, 220, 165, 205];

const getInvaderColor = (points: number) => {
  if (points >= 30) return '#f472b6';
  if (points >= 20) return '#34d399';
  return '#a3e635';
};

const isTextInput = (target: EventTarget | null) => {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
};

const createSeededRandom = (seed: number) => {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
};

const createStarfield = () => {
  const rand = createSeededRandom(42);
  return Array.from({ length: STAR_COUNT }, () => {
    const layer = Math.floor(rand() * STAR_LAYERS);
    const speed = 6 + layer * 12 + rand() * 6;
    return {
      x: rand() * BASE_WIDTH,
      y: rand() * BASE_HEIGHT,
      size: 0.8 + layer * 0.4,
      speed,
      alpha: 0.4 + rand() * 0.5,
    } as Star;
  });
};

const drawPixelSprite = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  pixels: number[][],
  color: string,
  scale = 1,
) => {
  ctx.fillStyle = color;
  for (let row = 0; row < pixels.length; row += 1) {
    for (let col = 0; col < pixels[row].length; col += 1) {
      if (!pixels[row][col]) continue;
      ctx.fillRect(x + col * scale, y + row * scale, scale, scale);
    }
  }
};

const INVADER_SPRITES = {
  top: [
    [0, 0, 1, 0, 0, 0, 0, 1, 0, 0],
    [0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
    [0, 0, 1, 1, 1, 1, 1, 1, 0, 0],
    [0, 1, 1, 0, 1, 1, 0, 1, 1, 0],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 1, 1, 1, 1, 1, 1, 0, 1],
    [1, 0, 1, 0, 0, 0, 0, 1, 0, 1],
    [0, 0, 0, 1, 1, 0, 1, 1, 0, 0],
  ],
  middle: [
    [0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 0, 1, 1, 1, 1, 0, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [0, 0, 1, 1, 0, 0, 1, 1, 0, 0],
    [0, 1, 1, 0, 1, 1, 0, 1, 1, 0],
    [1, 1, 0, 0, 0, 0, 0, 0, 1, 1],
  ],
  bottom: [
    [0, 0, 1, 1, 0, 0, 1, 1, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 0, 1, 1, 1, 1, 0, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [0, 0, 1, 1, 0, 0, 1, 1, 0, 0],
    [0, 1, 1, 0, 0, 0, 0, 1, 1, 0],
    [1, 1, 0, 0, 0, 0, 0, 0, 1, 1],
  ],
};

const SpaceInvaders: React.FC = () => {
  const canvasRef = useCanvasResize(BASE_WIDTH, BASE_HEIGHT);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const stateRef = useRef<GameState>(createGame({ width: BASE_WIDTH, height: BASE_HEIGHT }));
  const inputRef = useRef<InputState>({ left: false, right: false, fire: false });
  const replayInputRef = useRef<InputState | null>(null);
  const replayTimeoutRef = useRef<number | null>(null);
  const lastRecordedInputRef = useRef<InputState>({
    left: false,
    right: false,
    fire: false,
  });
  const particlesRef = useRef<Particle[]>([]);
  const starsRef = useRef<Star[]>(createStarfield());
  const shakeRef = useRef({ time: 0, intensity: 0, phase: 0 });
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
  const [gamepadEnabled, setGamepadEnabled] = usePersistentState(
    'space-invaders-gamepad',
    true,
    (value): value is boolean => typeof value === 'boolean',
  );
  const [shakeEnabled, setShakeEnabled] = usePersistentState(
    'space-invaders-shake',
    true,
    (value): value is boolean => typeof value === 'boolean',
  );
  const [paused, setPaused] = useState(false);
  const [status, setStatus] = useState<GameStatus>('ready');
  const [countdown, setCountdown] = useState(0);
  const [initials, setInitials] = useState('');
  const [showInitialsPrompt, setShowInitialsPrompt] = useState(false);
  const [ariaMessage, setAriaMessage] = useState('');
  const [mapping] = useInputMapping('space-invaders', DEFAULT_KEY_MAP);
  const prefersReducedMotion = usePrefersReducedMotion();
  const gamepadState = useGamepad();
  const { scores: localScores, addScore } = useLeaderboard('space-invaders', 5);
  const { record, registerReplay } = useInputRecorder();
  const audioCtxRef = useRef<AudioContext | null>(null);
  const hasInteractedRef = useRef(false);
  const overlayTimeout = useRef<number | null>(null);
  const pendingScoreRef = useRef<number | null>(null);
  const lastHudRef = useRef({
    stage: 1,
    lives: 3,
    score: 0,
    highScore,
  });

  const actionKeySets = useMemo(() => {
    const entries = (Object.keys(DEFAULT_KEY_MAP) as Array<keyof typeof DEFAULT_KEY_MAP>).map(
      (action) => {
        const set = new Set<string>();
        [...splitMappedKeys(DEFAULT_KEY_MAP[action]), ...splitMappedKeys(mapping[action]), ...ACTION_ALIASES[action]].forEach(
          (key) => {
            set.add(comparableKey(key));
          },
        );
        return [action, set] as const;
      },
    );
    return Object.fromEntries(entries) as Record<keyof typeof DEFAULT_KEY_MAP, Set<string>>;
  }, [mapping]);

  const matchesAction = useCallback(
    (action: keyof typeof DEFAULT_KEY_MAP, key: string) => {
      return actionKeySets[action].has(comparableKey(key));
    },
    [actionKeySets],
  );

  const isGameControlKey = useCallback(
    (key: string) => {
      return (Object.keys(actionKeySets) as Array<keyof typeof DEFAULT_KEY_MAP>).some((action) =>
        matchesAction(action, key),
      );
    },
    [actionKeySets, matchesAction],
  );

  const pauseHotkeys = useMemo(
    () => Array.from(new Set([...splitMappedKeys(mapping.pause), 'p', 'escape'].map((key) => key.toLowerCase()))),
    [mapping.pause],
  );

  const restartHotkeys = useMemo(
    () => Array.from(new Set([...splitMappedKeys(mapping.restart), 'r'].map((key) => key.toLowerCase()))),
    [mapping.restart],
  );

  const resetInput = useCallback(() => {
    inputRef.current = { left: false, right: false, fire: false };
    lastRecordedInputRef.current = { left: false, right: false, fire: false };
  }, []);

  const beginCountdown = useCallback(() => {
    setCountdown(COUNTDOWN_START);
    setStatus('countdown');
    setPaused(false);
  }, []);

  const startGame = useCallback(
    (options?: { skipCountdown?: boolean }) => {
      stateRef.current = createGame({
        width: BASE_WIDTH,
        height: BASE_HEIGHT,
        highScore,
      });
      setStage(1);
      setLives(3);
      setScore(0);
      setShowInitialsPrompt(false);
      setInitials('');
      pendingScoreRef.current = null;
      replayInputRef.current = null;
      resetInput();
      if (options?.skipCountdown) {
        setCountdown(0);
        setStatus('playing');
      } else {
        beginCountdown();
      }
    },
    [beginCountdown, highScore, resetInput],
  );

  const handleAudio = useCallback((frequency: number, duration = 0.08, preset?: Partial<TonePreset>) => {
    if (!soundEnabled || !hasInteractedRef.current) return;
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const tone: TonePreset = {
      type: 'square',
      attack: 0.005,
      release: duration,
      volume: 0.08,
      ...preset,
    };
    osc.type = tone.type;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(tone.volume, ctx.currentTime + tone.attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + tone.release);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + tone.release + 0.02);
  }, [soundEnabled]);

  const triggerShake = useCallback(
    (intensity: number) => {
      if (prefersReducedMotion || !shakeEnabled) return;
      shakeRef.current.time = 0.28;
      shakeRef.current.intensity = intensity;
      shakeRef.current.phase = 0;
    },
    [prefersReducedMotion, shakeEnabled],
  );

  const spawnParticles = useCallback((x: number, y: number, color: string, count = 8) => {
    const max = prefersReducedMotion ? Math.min(4, count) : count;
    for (let i = 0; i < max; i += 1) {
      if (particlesRef.current.length >= MAX_PARTICLES) break;
      const angle = (Math.PI * 2 * i) / max;
      particlesRef.current.push({
        x,
        y,
        dx: Math.cos(angle) * (30 + i * 2),
        dy: Math.sin(angle) * (30 + i * 2),
        life: 0.4,
        maxLife: 0.4,
        size: 2,
        color,
      });
    }
  }, [prefersReducedMotion]);

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
      if (state.highScore > lastHudRef.current.highScore) {
        announce('New high score!');
      }
      lastHudRef.current.highScore = state.highScore;
      setHighScore(state.highScore);
    }
  }, [announce, setHighScore]);

  const recordInputChange = useCallback(
    (next: InputState) => {
      const prev = lastRecordedInputRef.current;
      if (
        prev.left === next.left &&
        prev.right === next.right &&
        prev.fire === next.fire
      ) {
        return;
      }
      lastRecordedInputRef.current = { ...next };
      record({ type: 'input', ...next });
    },
    [record],
  );

  const resolveInput = useCallback(() => {
    if (replayInputRef.current) return replayInputRef.current;
    const keyboard = inputRef.current;
    let left = keyboard.left;
    let right = keyboard.right;
    let fire = keyboard.fire;
    if (gamepadEnabled && gamepadState.connected) {
      const axisX = gamepadState.axes[0] ?? 0;
      const deadZone = 0.25;
      const dpadLeft = (gamepadState.buttons[14] ?? 0) > 0.5;
      const dpadRight = (gamepadState.buttons[15] ?? 0) > 0.5;
      left = left || axisX < -deadZone || dpadLeft;
      right = right || axisX > deadZone || dpadRight;
      const fireButton =
        (gamepadState.buttons[0] ?? 0) > 0.5 ||
        (gamepadState.buttons[1] ?? 0) > 0.5;
      fire = fire || fireButton;
    }
    const combined = { left, right, fire };
    recordInputChange(combined);
    return combined;
  }, [gamepadEnabled, gamepadState, recordInputChange]);

  const handleEvents = useCallback(
    (events: StepEvent[]) => {
      events.forEach((event) => {
        if (event.type === 'invader-destroyed') {
          const tone = 640 - (event.row ?? 0) * 24;
          handleAudio(tone, 0.08, { type: 'square', volume: 0.05 });
          if (event.x !== undefined && event.y !== undefined) {
            spawnParticles(event.x, event.y, '#a7f3d0', 6);
          }
        }
        if (event.type === 'ufo-destroyed') {
          handleAudio(920, 0.18, { type: 'sawtooth', volume: 0.09 });
          if (event.x !== undefined && event.y !== undefined) {
            spawnParticles(event.x, event.y, '#f472b6', 12);
          }
        }
        if (event.type === 'life-lost') {
          handleAudio(150, 0.28, { type: 'triangle', volume: 0.1 });
          triggerShake(4);
        }
        if (event.type === 'shield-hit') {
          handleAudio(260, 0.06, { type: 'square', volume: 0.04 });
        }
        if (event.type === 'invader-step') {
          const march = MARCH_FREQUENCIES[event.value ?? 0] ?? MARCH_FREQUENCIES[0];
          handleAudio(march, 0.07, { type: 'square', volume: 0.045 });
        }
        if (event.type === 'wave-complete') {
          setStatus('wave');
          announce('Wave cleared. Get ready.');
          triggerShake(3);
        }
        if (event.type === 'game-over') {
          setStatus('gameover');
          announce('Game over.');
        }
        if (event.type === 'extra-life') {
          announce('Extra life awarded.');
          handleAudio(780, 0.16, { type: 'triangle', volume: 0.1 });
        }
        if (event.message) {
          announce(event.message);
        }
      });
    },
    [announce, handleAudio, spawnParticles, triggerShake],
  );

  const updateStars = useCallback((delta: number) => {
    starsRef.current.forEach((star) => {
      star.y += star.speed * delta;
      if (star.y > BASE_HEIGHT) {
        star.y -= BASE_HEIGHT;
      }
    });
  }, []);

  const updateParticles = useCallback((delta: number) => {
    if (!particlesRef.current.length) return;
    let write = 0;
    for (let i = 0; i < particlesRef.current.length; i += 1) {
      const particle = particlesRef.current[i];
      particle.life -= delta;
      if (particle.life <= 0) continue;
      particle.x += particle.dx * delta;
      particle.y += particle.dy * delta;
      particle.dy += 20 * delta;
      particlesRef.current[write] = particle;
      write += 1;
    }
    particlesRef.current.length = write;
  }, []);

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
    ctx.imageSmoothingEnabled = false;

    ctx.save();
    const shake = shakeRef.current;
    if (shake.time > 0 && shakeEnabled && !prefersReducedMotion) {
      const magnitude = (shake.time / 0.28) * shake.intensity;
      const offsetX = Math.sin(shake.phase) * magnitude;
      const offsetY = Math.cos(shake.phase * 1.3) * magnitude;
      ctx.translate(offsetX, offsetY);
    }

    const gradient = ctx.createLinearGradient(0, 0, 0, BASE_HEIGHT);
    gradient.addColorStop(0, '#020617');
    gradient.addColorStop(1, '#0b1120');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

    starsRef.current.forEach((star) => {
      ctx.globalAlpha = star.alpha;
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(star.x, star.y, star.size, star.size);
    });
    ctx.globalAlpha = 1;

    drawPixelSprite(
      ctx,
      Math.floor(state.player.x),
      Math.floor(state.player.y),
      [
        [0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
        [0, 0, 1, 1, 1, 1, 1, 1, 0, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
        [1, 1, 1, 0, 1, 1, 0, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      ],
      '#f8fafc',
      2,
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

    state.invaders.forEach((invader) => {
      if (!invader.alive) return;
      ctx.fillStyle = getInvaderColor(invader.points);
      const bob = prefersReducedMotion ? 0 : Math.sin(invader.phase) * 1.5;
      const key = invader.points >= 30 ? 'top' : invader.points >= 20 ? 'middle' : 'bottom';
      const sprite = INVADER_SPRITES[key];
      const offsetY = state.invaderFrame === 0 ? 0 : 1;
      drawPixelSprite(ctx, invader.x, invader.y + bob + offsetY, sprite, ctx.fillStyle as string, 2);
    });

    ctx.fillStyle = '#facc15';
    state.bullets.forEach((bullet) => {
      if (!bullet.active) return;
      ctx.fillStyle = bullet.owner === 'player' ? '#facc15' : '#fb7185';
      ctx.fillRect(bullet.x, bullet.y, 2, 6);
    });

    state.shields.forEach((shield) => {
      if (shield.hp <= 0) return;
      const segW = shield.w / shield.cols;
      const segH = shield.h / shield.rows;
      for (let row = 0; row < shield.rows; row += 1) {
        for (let col = 0; col < shield.cols; col += 1) {
          const idx = row * shield.cols + col;
          const hp = shield.segments[idx];
          if (hp <= 0) continue;
          const intensity = hp / shield.segmentHp;
          ctx.fillStyle =
            intensity > 0.66 ? '#94a3b8' : intensity > 0.33 ? '#64748b' : '#475569';
          ctx.fillRect(
            shield.x + col * segW,
            shield.y + row * segH,
            segW - 1,
            segH - 1,
          );
        }
      }
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

    particlesRef.current.forEach((particle) => {
      ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
      ctx.fillStyle = particle.color;
      ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
    });
    ctx.globalAlpha = 1;

    if (state.ufo.active) {
      drawPixelSprite(
        ctx,
        state.ufo.x,
        state.ufo.y,
        [
          [0, 0, 1, 1, 1, 1, 1, 1, 0, 0],
          [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
          [1, 1, 0, 1, 1, 1, 1, 0, 1, 1],
          [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
          [0, 0, 1, 0, 0, 0, 0, 1, 0, 0],
        ],
        '#fb7185',
        3,
      );
      ctx.fillStyle = '#fef08a';
      ctx.font = '10px monospace';
      ctx.fillText(`${state.ufo.value}`, state.ufo.x + 6, state.ufo.y - 4);
    }

    ctx.fillStyle = 'rgba(148, 163, 184, 0.06)';
    for (let y = 0; y < BASE_HEIGHT; y += 4) {
      ctx.fillRect(0, y, BASE_WIDTH, 1);
    }

    ctx.restore();
  }, [canvasRef, prefersReducedMotion, shakeEnabled]);

  useEffect(() => {
    lastHudRef.current.highScore = highScore;
  }, [highScore]);

  useEffect(() => {
    if (status !== 'countdown') return undefined;
    if (paused) return undefined;
    if (countdown <= 0) {
      setStatus('playing');
      return undefined;
    }
    const timer = window.setTimeout(() => {
      setCountdown((value) => value - 1);
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [countdown, paused, status]);

  useEffect(() => {
    if (status !== 'countdown') return;
    if (!gamepadEnabled || !gamepadState.connected) return;
    const firePressed =
      (gamepadState.buttons[0] ?? 0) > 0.5 ||
      (gamepadState.buttons[1] ?? 0) > 0.5;
    if (firePressed) {
      setCountdown(0);
      setStatus('playing');
    }
  }, [gamepadEnabled, gamepadState, status]);

  useEffect(() => {
    if (status !== 'gameover') return;
    const currentScore = stateRef.current.score;
    pendingScoreRef.current = currentScore;
    const lastScore = localScores[localScores.length - 1]?.score ?? -Infinity;
    const qualifies = localScores.length < 5 || currentScore > lastScore;
    setShowInitialsPrompt(qualifies);
    if (qualifies) {
      setInitials('');
    }
  }, [localScores, status]);

  useEffect(() => {
    registerReplay((input, idx) => {
      if (idx === 0) {
        replayInputRef.current = { left: false, right: false, fire: false };
        startGame({ skipCountdown: true });
      }
      if (!input || input.type !== 'input') return;
      replayInputRef.current = {
        left: Boolean(input.left),
        right: Boolean(input.right),
        fire: Boolean(input.fire),
      };
      if (replayTimeoutRef.current) {
        window.clearTimeout(replayTimeoutRef.current);
      }
      replayTimeoutRef.current = window.setTimeout(() => {
        replayInputRef.current = null;
      }, 200);
    });
  }, [registerReplay, startGame]);

  useGameLoop(
    (delta) => {
      if (status !== 'playing' || paused) {
        return;
      }
      const input = resolveInput();
      const step = stepGame(stateRef.current, input, delta, {
        difficulty,
      });
      handleEvents(step.events);
      updateStars(delta);
      updateParticles(delta);
      if (shakeRef.current.time > 0) {
        shakeRef.current.time = Math.max(0, shakeRef.current.time - delta);
        shakeRef.current.phase += delta * 30;
      }
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
    resetInput();
  }, [resetInput, status]);

  useEffect(() => {
    if (paused) {
      announce('Paused');
      resetInput();
    } else if (status === 'playing') {
      announce('Resumed');
    }
  }, [announce, paused, resetInput, status]);

  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
      if (overlayTimeout.current) {
        window.clearTimeout(overlayTimeout.current);
      }
      if (replayTimeoutRef.current) {
        window.clearTimeout(replayTimeoutRef.current);
      }
    };
  }, []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (isTextInput(event.target)) return;
      const key = event.key;
      const isControl = isGameControlKey(key);
      if (isControl) {
        consumeGameKey(event);
      }
      if (!hasInteractedRef.current) hasInteractedRef.current = true;
      if (event.repeat) return;
      if (status === 'ready' && matchesAction('fire', key)) {
        startGame();
        return;
      }
      if (status === 'countdown' && matchesAction('fire', key)) {
        setCountdown(0);
        setStatus('playing');
        return;
      }
      if (status !== 'playing') return;
      if (matchesAction('left', key)) {
        inputRef.current.left = true;
      }
      if (matchesAction('right', key)) {
        inputRef.current.right = true;
      }
      if (matchesAction('fire', key)) {
        inputRef.current.fire = true;
      }
    },
    [isGameControlKey, matchesAction, startGame, status],
  );

  const handleKeyUp = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const key = event.key;
      if (isGameControlKey(key)) {
        consumeGameKey(event);
      }
      if (status !== 'playing') return;
      if (matchesAction('left', key)) {
        inputRef.current.left = false;
      }
      if (matchesAction('right', key)) {
        inputRef.current.right = false;
      }
      if (matchesAction('fire', key)) {
        inputRef.current.fire = false;
      }
    },
    [isGameControlKey, matchesAction, status],
  );

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
          if (status === 'countdown') {
            setCountdown(0);
            setStatus('playing');
            return;
          }
          inputRef.current.fire = true;
        }
      },
      clear: () => {
        inputRef.current.left = false;
        inputRef.current.right = false;
        inputRef.current.fire = false;
      },
    }),
    [status],
  );

  const handleSubmitScore = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      if (pendingScoreRef.current === null) return;
      const trimmed = initials.trim().slice(0, 8).toUpperCase();
      if (!trimmed) return;
      addScore(trimmed, pendingScoreRef.current);
      setShowInitialsPrompt(false);
      pendingScoreRef.current = null;
    },
    [addScore, initials],
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
          aria-label="Difficulty"
        />
      </div>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={soundEnabled}
          onChange={() => setSoundEnabled((value) => !value)}
          aria-label="Sound effects"
        />
        <span>Sound effects</span>
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={touchControls}
          onChange={() => setTouchControls((value) => !value)}
          aria-label="Touch controls"
        />
        <span>Touch controls</span>
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={gamepadEnabled}
          onChange={() => setGamepadEnabled((value) => !value)}
          aria-label="Gamepad input"
        />
        <span>Gamepad input</span>
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={shakeEnabled}
          onChange={() => setShakeEnabled((value) => !value)}
          aria-label="Screen shake"
        />
        <span>Screen shake</span>
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
          : status === 'countdown'
            ? 'Get ready...'
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
      pauseHotkeys={pauseHotkeys}
      restartHotkeys={restartHotkeys}
      settingsPanel={settingsPanel}
    >
      <div
        ref={containerRef}
        className="relative h-full w-full bg-black text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onBlur={() => {
          resetInput();
          setPaused(true);
        }}
        onPointerDown={() => {
          if (!hasInteractedRef.current) hasInteractedRef.current = true;
          containerRef.current?.focus();
        }}
      >
        <canvas
          ref={canvasRef}
          className="h-full w-full"
          aria-label="Space Invaders game canvas"
        />
        {(status === 'ready' ||
          status === 'wave' ||
          status === 'gameover' ||
          status === 'countdown') && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-20">
            <div className="text-center space-y-3 px-4">
              <h2 className="text-xl font-semibold">
                {status === 'ready'
                  ? 'Space Invaders'
                  : status === 'wave'
                    ? 'Wave Clear'
                    : status === 'countdown'
                      ? 'Launching...'
                      : 'Game Over'}
              </h2>
              <p className="text-sm text-slate-200">{overlayLabel}</p>
              {status === 'countdown' && (
                <div className="space-y-1">
                  <div className="text-4xl font-bold text-emerald-300">
                    {countdown || 'Go!'}
                  </div>
                  <div className="text-xs text-slate-300">Press fire to skip</div>
                </div>
              )}
              {status === 'gameover' && (
                <div className="text-left text-xs text-slate-200 space-y-2">
                  <div className="font-semibold text-slate-100">Local Leaderboard</div>
                  {localScores.length === 0 ? (
                    <div className="text-slate-400">No scores yet.</div>
                  ) : (
                    <ol className="space-y-1">
                      {localScores.map((entry, index) => (
                        <li key={`${entry.name}-${entry.date}`}>
                          <span className="w-4 inline-block text-slate-400">
                            {index + 1}.
                          </span>
                          <span className="font-semibold text-slate-100">
                            {entry.name}
                          </span>
                          <span className="ml-2 text-slate-300">{entry.score}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                  {showInitialsPrompt && (
                    <form onSubmit={handleSubmitScore} className="space-y-2 pt-2">
                      <label className="block text-slate-300">
                        New high score! Enter initials:
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          value={initials}
                          onChange={(event) => setInitials(event.target.value)}
                          maxLength={8}
                          className="px-2 py-1 rounded bg-slate-900 border border-slate-600 text-slate-100 w-28"
                          placeholder="AAA"
                          aria-label="Initials"
                        />
                        <button
                          type="submit"
                          className="px-3 py-1 rounded bg-emerald-500 text-black font-semibold"
                        >
                          Save
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
              {(status === 'ready' || status === 'wave' || status === 'gameover') && (
                <button
                  type="button"
                  className="px-4 py-2 rounded bg-emerald-500 text-black font-semibold focus:outline-none focus:ring"
                  onClick={() => {
                    if (status === 'wave') {
                      beginCountdown();
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
              )}
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
