"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import GameLayout from './GameLayout';
import { useGameLoop, useLeaderboard, VirtualPad } from './Games/common';
import useGameInput from '../../hooks/useGameInput';
import useCanvasResize from '../../hooks/useCanvasResize';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';
import useIsTouchDevice from '../../hooks/useIsTouchDevice';
import useGameAudio from '../../hooks/useGameAudio';
import usePersistentState from '../../hooks/usePersistentState';
import SpeedControls from '../../games/pacman/components/SpeedControls';
import MazeEditor from '../../games/pacman/components/MazeEditor';
import Modal from '../base/Modal';
import useGamepad from './Games/common/useGamepad';
import {
  createInitialState,
  step,
  type Direction,
  type GameState,
  type EngineOptions,
} from '../../apps/pacman/engine';
import {
  sanitizeLevel,
  validateLevelsPayload,
  type LevelDefinition,
} from '../../apps/pacman/types';

const TILE_SIZE = 20;
const FIXED_STEP = 1 / 120;
const MAX_DELTA = 0.1;

const DEFAULT_SCHEDULE = [
  { mode: 'scatter' as const, duration: 7 },
  { mode: 'chase' as const, duration: 20 },
  { mode: 'scatter' as const, duration: 7 },
  { mode: 'chase' as const, duration: 20 },
  { mode: 'scatter' as const, duration: 5 },
  { mode: 'chase' as const, duration: 20 },
  { mode: 'scatter' as const, duration: 5 },
  { mode: 'chase' as const, duration: Number.POSITIVE_INFINITY },
];

const DIFFICULTY_PRESETS = {
  classic: {
    label: 'Classic',
    pacSpeed: 4.5,
    ghostSpeeds: { scatter: 3.8, chase: 4.2 },
    frightenedDuration: 6,
  },
  arcade: {
    label: 'Arcade',
    pacSpeed: 5.2,
    ghostSpeeds: { scatter: 4.2, chase: 4.8 },
    frightenedDuration: 5,
  },
  hard: {
    label: 'Hard',
    pacSpeed: 5.8,
    ghostSpeeds: { scatter: 4.8, chase: 5.6 },
    frightenedDuration: 4,
  },
};

const DEFAULT_LEVEL: LevelDefinition = {
  name: 'Classic',
  maze: [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,3,2,2,1,2,2,2,2,2,1,2,2,3,1],
    [1,2,1,2,1,2,1,1,1,2,1,2,1,2,1],
    [1,2,1,2,2,2,2,0,1,2,2,2,1,2,1],
    [1,2,1,1,1,1,2,1,1,2,1,1,1,2,1],
    [1,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  ],
  fruit: { x: 7, y: 3 },
  fruitTimes: [10, 30],
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const Pacman: React.FC<{ windowMeta?: { isFocused?: boolean } }> = ({
  windowMeta,
} = {}) => {
  const isFocused = windowMeta?.isFocused ?? true;
  const prefersReducedMotion = usePrefersReducedMotion();
  const isTouch = useIsTouchDevice();
  const gamepad = useGamepad();
  const { playTone, muted, setMuted } = useGameAudio();
  const { scores: localScores, addScore } = useLeaderboard('pacman', 10);

  const [levels, setLevels] = useState<LevelDefinition[]>([DEFAULT_LEVEL]);
  const [activeLevelIndex, setActiveLevelIndex] = useState(0);
  const [customLevel, setCustomLevel] = useState<LevelDefinition | null>(null);
  const [levelSearch, setLevelSearch] = useState('');
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [remoteScores, setRemoteScores] = useState<
    { name: string; score: number }[]
  >([]);
  const isDifficultyKey = (
    value: unknown,
  ): value is keyof typeof DIFFICULTY_PRESETS =>
    typeof value === 'string' && value in DIFFICULTY_PRESETS;
  const [difficulty, setDifficulty] = usePersistentState(
    'pacman:difficulty',
    'classic',
    isDifficultyKey,
  );
  const isGhostSpeeds = (
    value: unknown,
  ): value is { scatter: number; chase: number } =>
    !!value &&
    typeof (value as { scatter?: unknown }).scatter === 'number' &&
    typeof (value as { chase?: unknown }).chase === 'number';
  const [ghostSpeeds, setGhostSpeeds] = usePersistentState(
    'pacman:ghostSpeeds',
    DIFFICULTY_PRESETS.classic.ghostSpeeds,
    isGhostSpeeds,
  );
  const isPositiveNumber = (value: unknown): value is number =>
    typeof value === 'number' && value > 0;
  const [gameSpeed, setGameSpeed] = usePersistentState(
    'pacman:gameSpeed',
    1,
    isPositiveNumber,
  );
  const [classicOnly, setClassicOnly] = usePersistentState(
    'pacman:classicOnly',
    false,
    (value) => typeof value === 'boolean',
  );
  const [randomLevels, setRandomLevels] = usePersistentState(
    'pacman:randomLevels',
    false,
    (value) => typeof value === 'boolean',
  );
  const [highScore, setHighScore] = usePersistentState(
    'pacman:highScore',
    0,
    (value) => typeof value === 'number',
  );
  const [uiState, setUiState] = useState({
    score: 0,
    lives: 3,
    pellets: 0,
    mode: 'scatter',
    status: 'playing',
  });

  const stateRef = useRef<GameState | null>(null);
  const accumulatorRef = useRef(0);
  const lastFrameRef = useRef(0);
  const directionRef = useRef<Direction | null>(null);
  const optionsRef = useRef<EngineOptions | null>(null);
  const canvasRef = useCanvasResize(
    (customLevel ?? levels[activeLevelIndex] ?? DEFAULT_LEVEL).maze[0].length *
      TILE_SIZE,
    (customLevel ?? levels[activeLevelIndex] ?? DEFAULT_LEVEL).maze.length *
      TILE_SIZE,
  );
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const pauseRequestedRef = useRef(false);
  const padConnectedRef = useRef(false);

  const activeLevel = customLevel ?? levels[activeLevelIndex] ?? DEFAULT_LEVEL;

  const filteredLevels = useMemo(() => {
    const source = classicOnly ? levels.slice(0, 1) : levels;
    if (!levelSearch) return source;
    const query = levelSearch.toLowerCase();
    return source.filter((level, index) => {
      const label = level.name || `Level ${index + 1}`;
      return label.toLowerCase().includes(query);
    });
  }, [levels, levelSearch, classicOnly]);

  const options = useMemo<EngineOptions>(() => {
    const preset = DIFFICULTY_PRESETS[difficulty] ?? DIFFICULTY_PRESETS.classic;
    return {
      speedMultiplier: gameSpeed,
      pacSpeed: preset.pacSpeed,
      ghostSpeeds,
      tunnelSpeed: 0.7,
      frightenedDuration: preset.frightenedDuration,
      scatterChaseSchedule: DEFAULT_SCHEDULE,
      randomModeLevel: 2,
      levelIndex: activeLevelIndex,
      fruitDuration: 9,
      turnTolerance: 0.22,
    };
  }, [difficulty, ghostSpeeds, gameSpeed, activeLevelIndex]);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const syncUi = useCallback(
    (state: GameState) => {
      if (state.score > highScore) {
        setHighScore(state.score);
      }
      setUiState((prev) => {
        const next = {
          score: state.score,
          lives: state.pac.lives,
          pellets: state.pelletsRemaining,
          mode: state.mode,
          status: state.status,
        };
        if (
          prev.score === next.score &&
          prev.lives === next.lives &&
          prev.pellets === next.pellets &&
          prev.mode === next.mode &&
          prev.status === next.status
        ) {
          return prev;
        }
        return next;
      });
    },
    [highScore, setHighScore],
  );

  const initLevel = useCallback(
    (level: LevelDefinition, index = 0, isCustom = false) => {
      const normalized = sanitizeLevel(level);
      if (isCustom) {
        setCustomLevel(normalized);
      } else {
        setCustomLevel(null);
        setActiveLevelIndex(index);
      }
      stateRef.current = createInitialState(normalized, {
        ...(optionsRef.current ?? options),
        levelIndex: index,
      });
      accumulatorRef.current = 0;
      lastFrameRef.current = 0;
      setStatusMessage('');
      setAnnouncement('');
      setStarted(false);
      setPaused(false);
    },
    [],
  );

  const resetGame = useCallback(() => {
    stateRef.current = createInitialState(activeLevel, options);
    accumulatorRef.current = 0;
    lastFrameRef.current = 0;
    setStatusMessage('');
    setAnnouncement('');
    setPaused(false);
  }, [activeLevel, options]);

  const advanceLevel = useCallback(() => {
    if (classicOnly) {
      resetGame();
      return;
    }
    if (randomLevels) {
      const nextIndex = Math.floor(Math.random() * levels.length);
      initLevel(levels[nextIndex], nextIndex);
      return;
    }
    const nextIndex = (activeLevelIndex + 1) % levels.length;
    initLevel(levels[nextIndex], nextIndex);
  }, [
    classicOnly,
    randomLevels,
    levels,
    activeLevelIndex,
    initLevel,
    resetGame,
  ]);

  const setBufferedDirection = useCallback(
    (dir: Direction) => {
      directionRef.current = dir;
    },
    [],
  );

  useGameInput({
    game: 'pacman',
    isFocused,
    onInput: ({ action, type }) => {
      if (type !== 'keydown') return;
      if (action === 'action' && !started) {
        setStarted(true);
        return;
      }
      if (action === 'up') setBufferedDirection({ x: 0, y: -1 });
      if (action === 'down') setBufferedDirection({ x: 0, y: 1 });
      if (action === 'left') setBufferedDirection({ x: -1, y: 0 });
      if (action === 'right') setBufferedDirection({ x: 1, y: 0 });
    },
  });

  useEffect(() => {
    if (gamepad.connected && !padConnectedRef.current) {
      padConnectedRef.current = true;
    }
    if (!gamepad.connected && padConnectedRef.current) {
      padConnectedRef.current = false;
      pauseRequestedRef.current = true;
    }
  }, [gamepad.connected]);

  useEffect(() => {
    if (!gamepad.connected) return;
    const [ax, ay] = gamepad.axes;
    const dirThreshold = 0.5;
    if (Math.abs(ax) > Math.abs(ay) && Math.abs(ax) > dirThreshold) {
      setBufferedDirection({ x: Math.sign(ax), y: 0 });
    } else if (Math.abs(ay) > dirThreshold) {
      setBufferedDirection({ x: 0, y: Math.sign(ay) });
    }
    const buttons = gamepad.buttons || [];
    if (buttons[12] > 0.5) setBufferedDirection({ x: 0, y: -1 });
    if (buttons[13] > 0.5) setBufferedDirection({ x: 0, y: 1 });
    if (buttons[14] > 0.5) setBufferedDirection({ x: -1, y: 0 });
    if (buttons[15] > 0.5) setBufferedDirection({ x: 1, y: 0 });
  }, [gamepad, setBufferedDirection]);

  useEffect(() => {
    setGhostSpeeds(
      DIFFICULTY_PRESETS[difficulty]?.ghostSpeeds ??
        DIFFICULTY_PRESETS.classic.ghostSpeeds,
    );
  }, [difficulty, setGhostSpeeds]);

  useEffect(() => {
    if (!stateRef.current) {
      stateRef.current = createInitialState(activeLevel, options);
    }
  }, [activeLevel, options]);

  useEffect(() => {
    if (!canvasRef.current) return;
    ctxRef.current = canvasRef.current.getContext('2d');
  }, [canvasRef]);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true') return;
    const load = async () => {
      try {
        const res = await fetch('/api/pacman/leaderboard');
        const data = await res.json();
        if (Array.isArray(data)) {
          setRemoteScores(data);
        }
      } catch {
        setRemoteScores([]);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    fetch('/pacman-levels.json')
      .then((res) => res.json())
      .then((data) => {
        if (!validateLevelsPayload(data)) return;
        setLevels(data.levels.map((level) => sanitizeLevel(level)));
        initLevel(data.levels[0], 0);
      })
      .catch(() => {});
  }, [initLevel]);

  const submitScore = useCallback(() => {
    setShowNameModal(true);
  }, []);

  const finalizeScore = useCallback(async () => {
    const raw = playerName.trim().replace(/[\x00-\x1F\x7F]/g, '');
    const name = raw.slice(0, 16) || 'Player';
    const score = stateRef.current?.score ?? 0;
    addScore(name, score);
    if (process.env.NEXT_PUBLIC_STATIC_EXPORT !== 'true') {
      try {
        const res = await fetch('/api/pacman/leaderboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, score }),
        });
        const data = await res.json();
        if (Array.isArray(data)) setRemoteScores(data);
      } catch {
        // ignore network errors
      }
    }
    setShowNameModal(false);
    setPlayerName('');
  }, [addScore, playerName]);

  const scoreList = remoteScores.length ? remoteScores : localScores;

  const handleEvents = useCallback(
    (events: ReturnType<typeof step>['events'], state: GameState) => {
      if (events.pellet) playTone?.(520, { duration: 0.03, volume: 0.2 });
      if (events.energizer) {
        playTone?.(300, { duration: 0.1, volume: 0.4 });
        setAnnouncement('Power pellet!');
      }
      if (events.ghostEaten) playTone?.(160, { duration: 0.12, volume: 0.5 });
      if (events.fruit) playTone?.(720, { duration: 0.08, volume: 0.4 });
      if (events.lifeLost) {
        playTone?.(220, { duration: 0.2, volume: 0.5 });
        setAnnouncement('Life lost');
      }
      if (events.gameOver) {
        playTone?.(120, { duration: 0.3, volume: 0.6 });
        setStatusMessage('Game Over');
        submitScore();
      }
      if (events.levelComplete) {
        playTone?.(880, { duration: 0.2, volume: 0.5 });
        setStatusMessage('Level complete!');
        window.setTimeout(() => {
          advanceLevel();
          setStarted(true);
        }, 900);
      }
      syncUi(state);
    },
    [advanceLevel, playTone, submitScore, syncUi],
  );

  const draw = useCallback(
    (state: GameState, time: number) => {
      const ctx = ctxRef.current;
      if (!ctx) return;
      const width = state.width * TILE_SIZE;
      const height = state.height * TILE_SIZE;
      ctx.clearRect(0, 0, width, height);

      const bg = ctx.createLinearGradient(0, 0, width, height);
      bg.addColorStop(0, '#050814');
      bg.addColorStop(0.5, '#0a1330');
      bg.addColorStop(1, '#04040a');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.strokeStyle = '#1f2a44';
      for (let x = 0; x <= width; x += TILE_SIZE) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y += TILE_SIZE) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      ctx.restore();

      for (let y = 0; y < state.height; y += 1) {
        for (let x = 0; x < state.width; x += 1) {
          if (state.maze[y][x] === 1) {
            ctx.fillStyle = '#0f2555';
            ctx.strokeStyle = '#5ee7ff';
            ctx.lineWidth = 1.8;
            ctx.shadowColor = 'rgba(94,231,255,0.55)';
            ctx.shadowBlur = 8;
            const px = x * TILE_SIZE;
            const py = y * TILE_SIZE;
            const radius = 4;
            ctx.beginPath();
            ctx.moveTo(px + radius, py);
            ctx.lineTo(px + TILE_SIZE - radius, py);
            ctx.quadraticCurveTo(
              px + TILE_SIZE,
              py,
              px + TILE_SIZE,
              py + radius,
            );
            ctx.lineTo(px + TILE_SIZE, py + TILE_SIZE - radius);
            ctx.quadraticCurveTo(
              px + TILE_SIZE,
              py + TILE_SIZE,
              px + TILE_SIZE - radius,
              py + TILE_SIZE,
            );
            ctx.lineTo(px + radius, py + TILE_SIZE);
            ctx.quadraticCurveTo(px, py + TILE_SIZE, px, py + TILE_SIZE - radius);
            ctx.lineTo(px, py + radius);
            ctx.quadraticCurveTo(px, py, px + radius, py);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.shadowBlur = 0;
          } else if (state.maze[y][x] === 2) {
            ctx.fillStyle = '#f8fafc';
            ctx.shadowColor = 'rgba(248,250,252,0.8)';
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(
              x * TILE_SIZE + TILE_SIZE / 2,
              y * TILE_SIZE + TILE_SIZE / 2,
              3,
              0,
              Math.PI * 2,
            );
            ctx.fill();
            ctx.shadowBlur = 0;
          } else if (state.maze[y][x] === 3) {
            const pulse = prefersReducedMotion
              ? 1
              : 1 + 0.2 * Math.sin(time * 4);
            ctx.fillStyle = '#fef9c3';
            ctx.shadowColor = 'rgba(254,249,195,0.9)';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(
              x * TILE_SIZE + TILE_SIZE / 2,
              y * TILE_SIZE + TILE_SIZE / 2,
              6 * pulse,
              0,
              Math.PI * 2,
            );
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }
      }

      if (state.fruit.active) {
        ctx.fillStyle = '#34d399';
        ctx.shadowColor = 'rgba(52,211,153,0.6)';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(
          state.fruit.x * TILE_SIZE + TILE_SIZE / 2,
          state.fruit.y * TILE_SIZE + TILE_SIZE / 2,
          6,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      const pac = state.pac;
      const angle = Math.atan2(pac.dir.y, pac.dir.x);
      const mouth = prefersReducedMotion
        ? 0.2
        : 0.2 + 0.2 * Math.sin(time * 8);
      ctx.shadowColor = 'rgba(250,204,21,0.7)';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(pac.x * TILE_SIZE, pac.y * TILE_SIZE);
      ctx.arc(
        pac.x * TILE_SIZE,
        pac.y * TILE_SIZE,
        TILE_SIZE / 2 - 2,
        angle + mouth,
        angle - mouth + Math.PI * 2,
      );
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

      state.ghosts.forEach((ghost) => {
        const baseX = ghost.x * TILE_SIZE;
        const baseY = ghost.y * TILE_SIZE;
        const frightFlash =
          state.frightenedTimer > 0 &&
          state.frightenedTimer < 1.5 &&
          !prefersReducedMotion &&
          Math.floor(time * 6) % 2 === 0;
        ctx.shadowColor =
          state.frightenedTimer > 0 ? 'rgba(29,78,216,0.6)' : 'rgba(148,163,184,0.5)';
        ctx.shadowBlur = 8;
        ctx.fillStyle =
          state.frightenedTimer > 0
            ? frightFlash
              ? '#fef08a'
              : '#1d4ed8'
            : ghost.name === 'blinky'
              ? '#ef4444'
              : ghost.name === 'pinky'
                ? '#f9a8d4'
                : ghost.name === 'inky'
                  ? '#22d3ee'
                  : '#fb923c';
        ctx.beginPath();
        ctx.arc(baseX, baseY, TILE_SIZE / 2 - 2, Math.PI, 0);
        ctx.lineTo(baseX + TILE_SIZE / 2 - 2, baseY + TILE_SIZE / 2 - 2);
        ctx.lineTo(baseX - TILE_SIZE / 2 + 2, baseY + TILE_SIZE / 2 - 2);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;

        const eyeOffsetX = 5;
        const eyeOffsetY = 3;
        const pupilOffset = 2.5;
        const dirAngle = Math.atan2(ghost.dir.y, ghost.dir.x);
        ctx.fillStyle = '#f8fafc';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1;
        [
          { ox: -eyeOffsetX, oy: -eyeOffsetY },
          { ox: eyeOffsetX, oy: -eyeOffsetY },
        ].forEach(({ ox, oy }) => {
          ctx.beginPath();
          ctx.arc(baseX + ox, baseY + oy, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        });
        ctx.fillStyle = '#0f172a';
        [
          { ox: -eyeOffsetX, oy: -eyeOffsetY },
          { ox: eyeOffsetX, oy: -eyeOffsetY },
        ].forEach(({ ox, oy }) => {
          ctx.beginPath();
          ctx.arc(
            baseX + ox + Math.cos(dirAngle) * pupilOffset,
            baseY + oy + Math.sin(dirAngle) * pupilOffset,
            2,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        });
      });
    },
    [prefersReducedMotion],
  );

  useGameLoop(
    (delta) => {
      if (!stateRef.current) return;
      if (!ctxRef.current) return;
      const clamped = clamp(delta, 0, MAX_DELTA);
      accumulatorRef.current += clamped;
      const state = stateRef.current;
      const inputDir = directionRef.current;
      if (inputDir) directionRef.current = null;

      const shouldUpdate = started && !paused && state.status === 'playing';
      while (shouldUpdate && accumulatorRef.current >= FIXED_STEP) {
        const result = step(stateRef.current, { direction: inputDir }, FIXED_STEP, options);
        stateRef.current = result.state;
        accumulatorRef.current -= FIXED_STEP;
        handleEvents(result.events, result.state);
      }

      lastFrameRef.current += clamped;
      draw(stateRef.current, lastFrameRef.current);
      syncUi(stateRef.current);
    },
    true,
  );

  useEffect(() => {
    if (!pauseRequestedRef.current) return;
    pauseRequestedRef.current = false;
    if (!paused) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      }
    }
  }, [paused]);

  const handlePlayMaze = useCallback(
    (maze: number[][]) => {
      initLevel(
        {
          name: 'Custom',
          maze: maze as LevelDefinition['maze'],
          fruit: { x: Math.floor(maze[0].length / 2), y: Math.floor(maze.length / 2) },
          fruitTimes: [12, 28],
        },
        0,
        true,
      );
      setStarted(true);
    },
    [initLevel],
  );

  const settingsPanel = (
    <div className="space-y-3 text-sm text-slate-100">
      <div>
        <label className="block text-xs uppercase tracking-wide text-slate-300">
          Difficulty
        </label>
        <select
          value={difficulty}
          onChange={(e) =>
            setDifficulty(e.target.value as keyof typeof DIFFICULTY_PRESETS)
          }
          className="mt-1 w-full rounded bg-slate-800/80 px-2 py-1"
        >
          {Object.entries(DIFFICULTY_PRESETS).map(([key, preset]) => (
            <option key={key} value={key}>
              {preset.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center justify-between">
        <span>Sound</span>
        <button
          type="button"
          onClick={() => setMuted(!muted)}
          className="rounded bg-slate-700 px-2 py-1"
        >
          {muted ? 'Muted' : 'On'}
        </button>
      </div>
      <div className="flex items-center justify-between">
        <span>Classic only</span>
        <button
          type="button"
          onClick={() => setClassicOnly(!classicOnly)}
          className="rounded bg-slate-700 px-2 py-1"
        >
          {classicOnly ? 'Enabled' : 'Off'}
        </button>
      </div>
      <div className="flex items-center justify-between">
        <span>Random levels</span>
        <button
          type="button"
          onClick={() => setRandomLevels(!randomLevels)}
          className="rounded bg-slate-700 px-2 py-1"
        >
          {randomLevels ? 'On' : 'Off'}
        </button>
      </div>
      <div className="rounded bg-slate-900/60 p-2">
        <SpeedControls
          ghostSpeeds={ghostSpeeds}
          setGhostSpeeds={setGhostSpeeds}
          gameSpeed={gameSpeed}
          setGameSpeed={setGameSpeed}
        />
      </div>
      <button
        type="button"
        onClick={() => setShowEditor((s) => !s)}
        className="w-full rounded bg-slate-700 px-2 py-1"
      >
        {showEditor ? 'Hide' : 'Show'} Maze Editor
      </button>
    </div>
  );

  const renderStartScreen = () => (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white gap-4"
      onPointerDown={(e) => {
        const target = e.target as HTMLElement;
        if (['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(target.tagName)) {
          return;
        }
        setStarted(true);
      }}
      role="button"
      aria-label="Start game"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') setStarted(true);
      }}
    >
      <div className="text-lg font-semibold">Pacman</div>
      <div className="text-sm text-slate-200">
        Press Space or tap to start
      </div>
      <div className="text-xs text-slate-300">
        Arrow keys, swipe, or gamepad to move
      </div>
      <div className="w-64 space-y-2">
        <input
          type="text"
          aria-label="Search levels"
          placeholder="Search levels..."
          className="w-full rounded bg-slate-800/80 px-2 py-1 text-sm"
          value={levelSearch}
          onChange={(e) => setLevelSearch(e.target.value)}
        />
        <select
          aria-label="Select level"
          value={activeLevelIndex}
          onChange={(e) => initLevel(levels[Number(e.target.value)], Number(e.target.value))}
          className="w-full rounded bg-slate-800/80 px-2 py-1 text-sm"
        >
          {filteredLevels.map((level, index) => (
            <option key={`${level.name}-${index}`} value={levels.indexOf(level)}>
              {level.name || `Level ${index + 1}`}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        onClick={() => setStarted(true)}
        className="rounded bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900"
      >
        Start
      </button>
      {scoreList.length > 0 && (
        <div className="text-left text-xs">
          <div className="font-semibold">Top Scores</div>
          <ol className="mt-1 space-y-1">
            {scoreList.slice(0, 5).map((entry, index) => (
              <li key={`${entry.name}-${index}`}>
                {entry.name}: {entry.score}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );

  const lives = uiState.lives;
  const score = uiState.score;
  const pellets = uiState.pellets;
  const mode = uiState.mode;

  return (
    <GameLayout
      gameId="pacman"
      stage={customLevel ? undefined : activeLevelIndex + 1}
      lives={lives}
      score={score}
      highScore={highScore}
      onPauseChange={setPaused}
      onRestart={resetGame}
      pauseHotkeys={['Escape', 'p']}
      restartHotkeys={['r']}
      settingsPanel={settingsPanel}
      isFocused={isFocused}
      editor={
        showEditor ? (
          <div className="rounded bg-slate-900/80 p-2 text-xs text-slate-100 shadow-lg">
            <MazeEditor onPlay={handlePlayMaze} />
          </div>
        ) : null
      }
    >
      <div className="relative h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4">
        <div className="relative flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={activeLevel.maze[0].length * TILE_SIZE}
            height={activeLevel.maze.length * TILE_SIZE}
            className="bg-black rounded-md shadow-inner"
            role="img"
            aria-label="Pacman playfield"
          />
          {!started && renderStartScreen()}
          {uiState.status === 'gameover' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white gap-2">
              <div className="text-lg font-semibold">Game Over</div>
              <button
                type="button"
                onClick={resetGame}
                className="rounded bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900"
              >
                Restart
              </button>
            </div>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-200">
          <div className="rounded bg-slate-900/70 px-2 py-1">
            Mode: {mode === 'fright' ? 'Frightened' : mode}
          </div>
          <div className="rounded bg-slate-900/70 px-2 py-1">
            Pellets: {pellets}
          </div>
          <div className="rounded bg-slate-900/70 px-2 py-1">
            Level: {activeLevel.name || `Level ${activeLevelIndex + 1}`}
          </div>
          {statusMessage && (
            <div className="rounded bg-amber-500/80 px-2 py-1 text-slate-900">
              {statusMessage}
            </div>
          )}
        </div>
        {isTouch && (
          <div className="mt-4">
            <VirtualPad onDirection={setBufferedDirection} />
          </div>
        )}
        {paused && (
          <div className="mt-3 text-xs text-slate-300">
            Paused - press Escape to resume
          </div>
        )}
        <div className="sr-only" aria-live="polite">
          {announcement}
        </div>
      </div>
      <Modal isOpen={showNameModal} onClose={() => setShowNameModal(false)}>
        <div className="rounded bg-slate-900 p-4 text-sm text-slate-100 shadow-lg">
          <h3 className="text-base font-semibold">Save your score</h3>
          <p className="mt-1 text-xs text-slate-300">
            Enter a name for the leaderboard.
          </p>
          <input
            type="text"
            aria-label="Player name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="mt-3 w-full rounded bg-slate-800 px-2 py-1"
            maxLength={16}
            placeholder="Player"
          />
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowNameModal(false)}
              className="rounded bg-slate-700 px-3 py-1"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={finalizeScore}
              className="rounded bg-emerald-500 px-3 py-1 text-slate-900"
            >
              Save
            </button>
          </div>
        </div>
      </Modal>
    </GameLayout>
  );
};

export default Pacman;
