import { DEFAULT_ENGINE_CONFIG, SCORE_TABLE } from './constants';
import { clearLines, collides, createBoard, getGhostY, mergePiece, spawnPiece } from './board';
import { getKickTests } from './pieces';
import { refillQueue } from './randomizer';
import { ActivePiece, EngineAction, EngineConfig, GameState, PieceType } from './types';

const clampLevel = (lines: number) => Math.max(1, Math.floor(lines / 10) + 1);

const gravityCellsPerSecond = (level: number) => Math.min(20, 1 * 1.18 ** (level - 1));

const shift = (state: GameState, dx: number, config: EngineConfig): GameState => {
  if (!state.active) return state;
  const moved = { ...state.active, x: state.active.x + dx };
  if (collides(state.board, moved, config)) return state;

  const resetLock = state.runtime.lockTimerMs > 0 && state.runtime.lockResets < config.lockResetLimit;
  return {
    ...state,
    active: moved,
    runtime: {
      ...state.runtime,
      lockTimerMs: resetLock ? 0 : state.runtime.lockTimerMs,
      lockResets: resetLock ? state.runtime.lockResets + 1 : state.runtime.lockResets,
    },
  };
};

const rotate = (state: GameState, direction: 1 | -1 | 2, config: EngineConfig): GameState => {
  if (!state.active) return state;
  if (direction === 2 && !config.allowRotate180) return state;

  const from = state.active.rotation;
  const targetRotation = (((from + direction) % 4) + 4) % 4 as 0 | 1 | 2 | 3;
  const kicks = direction === 2
    ? [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }]
    : getKickTests(state.active.type, from, targetRotation);

  for (const kick of kicks) {
    const candidate: ActivePiece = {
      ...state.active,
      rotation: targetRotation,
      x: state.active.x + kick.x,
      y: state.active.y - kick.y,
    };
    if (!collides(state.board, candidate, config)) {
      const resetLock = state.runtime.lockTimerMs > 0 && state.runtime.lockResets < config.lockResetLimit;
      return {
        ...state,
        active: candidate,
        runtime: {
          ...state.runtime,
          lockTimerMs: resetLock ? 0 : state.runtime.lockTimerMs,
          lockResets: resetLock ? state.runtime.lockResets + 1 : state.runtime.lockResets,
        },
      };
    }
  }

  return state;
};

const pullNextPiece = (state: GameState, config: EngineConfig): { state: GameState; piece: PieceType } => {
  const seeded = refillQueue(state.queue, state.rngState, config.nextCount + 2);
  const [piece, ...rest] = seeded.queue;
  return {
    piece,
    state: {
      ...state,
      queue: rest,
      rngState: seeded.rngState,
    },
  };
};

const lockActivePiece = (state: GameState, config: EngineConfig, hardDropDistance = 0): GameState => {
  if (!state.active) return state;
  const merged = mergePiece(state.board, state.active);
  const { board: nextBoard, linesCleared } = clearLines(merged, config);
  const level = state.scoring.level;

  let scoreDelta = (SCORE_TABLE[linesCleared] ?? 0) * level;
  if (linesCleared > 0 && state.scoring.combo >= 0) {
    scoreDelta += state.scoring.combo * 50 * level;
  }
  if (linesCleared === 4 && state.scoring.backToBack) {
    scoreDelta += Math.floor((SCORE_TABLE[4] * level) / 2);
  }
  scoreDelta += hardDropDistance * 2;

  const combo = linesCleared > 0 ? state.scoring.combo + 1 : -1;
  const lines = state.scoring.lines + linesCleared;

  const seededState = pullNextPiece({
    ...state,
    board: nextBoard,
    scoring: {
      score: state.scoring.score + scoreDelta,
      lines,
      level: clampLevel(lines),
      combo,
      backToBack: linesCleared === 4 ? true : linesCleared > 0 ? false : state.scoring.backToBack,
    },
    canHold: true,
    runtime: {
      gravityAccumulator: 0,
      lockTimerMs: 0,
      lockResets: 0,
    },
  }, config);

  const spawned = spawnPiece(seededState.piece, config);
  if (collides(seededState.state.board, spawned, config)) {
    return {
      ...seededState.state,
      active: null,
      status: 'gameover',
    };
  }

  return {
    ...seededState.state,
    active: spawned,
  };
};

export const createInitialGameState = (
  config: EngineConfig = DEFAULT_ENGINE_CONFIG,
  seed = 1,
): GameState => {
  const seededQueue = refillQueue([], seed, config.nextCount + 1);
  const [first, ...queue] = seededQueue.queue;
  return {
    board: createBoard(config),
    active: spawnPiece(first, config),
    hold: null,
    canHold: true,
    queue,
    rngState: seededQueue.rngState,
    scoring: {
      score: 0,
      lines: 0,
      level: 1,
      combo: -1,
      backToBack: false,
    },
    status: 'idle',
    runtime: {
      gravityAccumulator: 0,
      lockTimerMs: 0,
      lockResets: 0,
    },
  };
};

const doHold = (state: GameState, config: EngineConfig): GameState => {
  if (!state.active || !state.canHold) return state;
  if (!state.hold) {
    const pulled = pullNextPiece(state, config);
    const nextActive = spawnPiece(pulled.piece, config);
    if (collides(state.board, nextActive, config)) {
      return { ...state, status: 'gameover', active: null };
    }
    return {
      ...pulled.state,
      active: nextActive,
      hold: state.active.type,
      canHold: false,
      runtime: { gravityAccumulator: 0, lockTimerMs: 0, lockResets: 0 },
    };
  }
  const swap = spawnPiece(state.hold, config);
  if (collides(state.board, swap, config)) {
    return { ...state, status: 'gameover', active: null };
  }
  return {
    ...state,
    active: swap,
    hold: state.active.type,
    canHold: false,
    runtime: { gravityAccumulator: 0, lockTimerMs: 0, lockResets: 0 },
  };
};

export const applyAction = (
  state: GameState,
  action: EngineAction,
  config: EngineConfig = DEFAULT_ENGINE_CONFIG,
): GameState => {
  if (action.type === 'restart') return createInitialGameState(config, state.rngState + 7);
  if (action.type === 'start' && state.status === 'idle') return { ...state, status: 'playing' };
  if (action.type === 'togglePause' && state.status !== 'gameover') {
    return { ...state, status: state.status === 'paused' ? 'playing' : 'paused' };
  }
  if (state.status !== 'playing') return state;

  switch (action.type) {
    case 'moveLeft':
      return shift(state, -1, config);
    case 'moveRight':
      return shift(state, 1, config);
    case 'rotateCW':
      return rotate(state, 1, config);
    case 'rotateCCW':
      return rotate(state, -1, config);
    case 'rotate180':
      return rotate(state, 2, config);
    case 'hold':
      return doHold(state, config);
    case 'hardDrop': {
      if (!state.active) return state;
      const ghostY = getGhostY(state.board, state.active, config);
      return lockActivePiece(
        { ...state, active: { ...state.active, y: ghostY } },
        config,
        ghostY - state.active.y,
      );
    }
    default:
      return state;
  }
};

export const stepGame = (
  prev: GameState,
  deltaMs: number,
  isSoftDropping: boolean,
  config: EngineConfig = DEFAULT_ENGINE_CONFIG,
): GameState => {
  if (prev.status !== 'playing' || !prev.active) return prev;

  const gravity = gravityCellsPerSecond(prev.scoring.level) * (isSoftDropping ? config.softDropFactor : 1);
  let state = {
    ...prev,
    runtime: {
      ...prev.runtime,
      gravityAccumulator: prev.runtime.gravityAccumulator + (deltaMs / 1000) * gravity,
    },
  };

  while (state.runtime.gravityAccumulator >= 1 && state.active) {
    const dropped = { ...state.active, y: state.active.y + 1 };
    if (collides(state.board, dropped, config)) {
      state = {
        ...state,
        runtime: {
          ...state.runtime,
          gravityAccumulator: state.runtime.gravityAccumulator - 1,
          lockTimerMs: state.runtime.lockTimerMs + deltaMs,
        },
      };
      break;
    }
    state = {
      ...state,
      active: dropped,
      runtime: {
        ...state.runtime,
        gravityAccumulator: state.runtime.gravityAccumulator - 1,
        lockTimerMs: 0,
        lockResets: 0,
      },
    };
  }

  const blockedBelow = state.active
    ? collides(state.board, { ...state.active, y: state.active.y + 1 }, config)
    : false;

  if (blockedBelow) {
    const lockTimerMs = state.runtime.lockTimerMs + deltaMs;
    if (lockTimerMs >= config.lockDelayMs) {
      return lockActivePiece(state, config);
    }
    return {
      ...state,
      runtime: {
        ...state.runtime,
        lockTimerMs,
      },
    };
  }

  return {
    ...state,
    runtime: {
      ...state.runtime,
      lockTimerMs: 0,
      lockResets: 0,
    },
  };
};
