import type { Action, GameState, Mode, PieceState, Rotation, Settings } from './types';
import { computeLineClearScore } from './scoring';
import { createRandomState, nextPiece } from './random';
import {
  BOARD_WIDTH,
  HIDDEN_ROWS,
  SPAWN_X,
  SPAWN_Y,
  TOTAL_HEIGHT,
  VISIBLE_HEIGHT,
  getKickOffsets,
  getPieceCells,
  isInsideBoard,
  toRotation,
} from './rules';

const DEFAULT_SETTINGS: Settings = {
  width: BOARD_WIDTH,
  visibleHeight: VISIBLE_HEIGHT,
  totalHeight: TOTAL_HEIGHT,
  gravityMs: 1000,
  lockDelayMs: 500,
  lockResetLimit: 15,
  dasMs: 150,
  arrMs: 50,
  softDropFactor: 10,
  randomMode: 'seven-bag',
};

const createEmptyBoard = (width: number, height: number) => new Uint8Array(width * height);

export const idx = (width: number, x: number, y: number) => y * width + x;

export const getCell = (board: Uint8Array, width: number, x: number, y: number) =>
  board[idx(width, x, y)];

export const setCell = (board: Uint8Array, width: number, x: number, y: number, value: number) => {
  board[idx(width, x, y)] = value;
};

const pieceValue = (type: PieceState['type']) => {
  const mapping = { I: 1, J: 2, L: 3, O: 4, S: 5, T: 6, Z: 7 } as const;
  return mapping[type];
};

const canPlace = (state: GameState, piece: PieceState, x = piece.x, y = piece.y, rotation = piece.rotation) => {
  const cells = getPieceCells(piece.type, rotation);
  return cells.every(([cx, cy]) => {
    const nx = x + cx;
    const ny = y + cy;
    if (nx < 0 || nx >= state.width) return false;
    if (ny >= state.totalHeight) return false;
    if (ny < 0) return true;
    return getCell(state.board, state.width, nx, ny) === 0;
  });
};

const isGrounded = (state: GameState) =>
  !canPlace(state, state.active, state.active.x, state.active.y + 1, state.active.rotation);

const cloneBoard = (board: Uint8Array) => new Uint8Array(board);

const applyLockReset = (state: GameState, grounded: boolean) => {
  if (!grounded) {
    return { ...state, lockElapsedMs: 0, lockResetsUsed: 0 };
  }
  if (state.lockResetsUsed >= state.settings.lockResetLimit) return state;
  return {
    ...state,
    lockElapsedMs: 0,
    lockResetsUsed: state.lockResetsUsed + 1,
  };
};

const movePiece = (state: GameState, dx: number, dy: number) => {
  const next: PieceState = { ...state.active, x: state.active.x + dx, y: state.active.y + dy };
  if (!canPlace(state, next, next.x, next.y, next.rotation)) return state;
  const grounded = isGrounded({ ...state, active: next });
  const nextState = { ...state, active: next, lastRotation: false };
  return applyLockReset(nextState, grounded);
};

const rotatePiece = (state: GameState, dir: 'cw' | 'ccw' | '180') => {
  const delta = dir === 'cw' ? 1 : dir === 'ccw' ? -1 : 2;
  const from = state.active.rotation;
  const to = toRotation(from + delta);
  const kicks = dir === '180' ? [[0, 0]] : getKickOffsets(state.active.type, from, to);
  for (const [dx, dy] of kicks) {
    const candidate: PieceState = {
      ...state.active,
      rotation: to,
      x: state.active.x + dx,
      y: state.active.y + dy,
    };
    if (canPlace(state, candidate, candidate.x, candidate.y, candidate.rotation)) {
      const grounded = isGrounded({ ...state, active: candidate });
      const nextState = { ...state, active: candidate, lastRotation: true };
      return applyLockReset(nextState, grounded);
    }
  }
  return state;
};

const getGravityInterval = (state: GameState) => {
  const levelInterval = Math.max(100, state.settings.gravityMs - (state.level - 1) * 100);
  return state.input.softDrop ? levelInterval / state.settings.softDropFactor : levelInterval;
};

export const getGhostY = (state: GameState) => {
  let y = state.active.y;
  while (canPlace(state, state.active, state.active.x, y + 1, state.active.rotation)) {
    y += 1;
  }
  return y;
};

const isTSpin = (state: GameState, lockPosition: PieceState) => {
  if (lockPosition.type !== 'T' || !state.lastRotation) return false;
  const corners = [
    [lockPosition.x, lockPosition.y],
    [lockPosition.x + 2, lockPosition.y],
    [lockPosition.x, lockPosition.y + 2],
    [lockPosition.x + 2, lockPosition.y + 2],
  ];
  let filled = 0;
  corners.forEach(([cx, cy]) => {
    if (cy < 0 || cy >= state.totalHeight || cx < 0 || cx >= state.width) {
      filled += 1;
      return;
    }
    if (getCell(state.board, state.width, cx, cy)) filled += 1;
  });
  return filled >= 3;
};

const clearLines = (state: GameState, lines: number[]) => {
  if (lines.length === 0) return state;
  const remaining: number[] = [];
  for (let y = 0; y < state.totalHeight; y += 1) {
    if (!lines.includes(y)) {
      for (let x = 0; x < state.width; x += 1) {
        remaining.push(getCell(state.board, state.width, x, y));
      }
    }
  }
  const newBoard = new Uint8Array(state.width * state.totalHeight);
  const missing = state.totalHeight - remaining.length / state.width;
  let offset = 0;
  for (let y = 0; y < missing; y += 1) {
    for (let x = 0; x < state.width; x += 1) {
      newBoard[idx(state.width, x, y)] = 0;
    }
  }
  offset = missing * state.width;
  remaining.forEach((value, index) => {
    newBoard[offset + index] = value;
  });
  return { ...state, board: newBoard };
};

const spawnPiece = (state: GameState) => {
  let nextQueue = [...state.nextQueue];
  let randomState = state.randomState;
  if (nextQueue.length < 5) {
    const needed = 5 - nextQueue.length;
    for (let i = 0; i < needed; i += 1) {
      const next = nextPiece(randomState);
      randomState = next.state;
      nextQueue.push(next.piece);
    }
  }
  const [nextType, ...rest] = nextQueue;
  const active: PieceState = { type: nextType, rotation: 0, x: SPAWN_X, y: SPAWN_Y };
  const spawnBlocked = !canPlace(state, active, active.x, active.y, active.rotation);
  return {
    ...state,
    active,
    nextQueue: rest,
    randomState,
    canHold: true,
    spawnBlocked,
  };
};

const lockPiece = (state: GameState) => {
  const boardBefore = cloneBoard(state.board);
  const newBoard = cloneBoard(state.board);
  const { active } = state;
  getPieceCells(active.type, active.rotation).forEach(([cx, cy]) => {
    const nx = active.x + cx;
    const ny = active.y + cy;
    if (ny < 0 || ny >= state.totalHeight) return;
    if (!isInsideBoard(nx, ny)) return;
    setCell(newBoard, state.width, nx, ny, pieceValue(active.type));
  });

  const filled: number[] = [];
  for (let y = 0; y < state.totalHeight; y += 1) {
    let full = true;
    for (let x = 0; x < state.width; x += 1) {
      if (getCell(newBoard, state.width, x, y) === 0) {
        full = false;
        break;
      }
    }
    if (full) filled.push(y);
  }

  const tSpin = filled.length > 0 && isTSpin({ ...state, board: newBoard }, active);
  const isTetris = filled.length === 4 && !tSpin;
  const b2bEligible = tSpin || isTetris;
  const isB2B = b2bEligible && state.b2b > 0;
  const combo = filled.length > 0 ? state.combo + 1 : 0;
  let nextState: GameState = {
    ...state,
    board: newBoard,
    combo,
    b2b: b2bEligible ? state.b2b + 1 : 0,
    stats: {
      ...state.stats,
      piecesPlaced: state.stats.piecesPlaced + 1,
      tetrises: state.stats.tetrises + (isTetris ? 1 : 0),
      tspins: state.stats.tspins + (tSpin ? 1 : 0),
      maxB2B: Math.max(state.stats.maxB2B, b2bEligible ? state.b2b + 1 : 0),
      maxCombo: Math.max(state.stats.maxCombo, combo),
    },
    lastRotation: false,
    lockElapsedMs: 0,
    lockResetsUsed: 0,
    gravityElapsedMs: 0,
    spawnBlocked: false,
  };

  if (filled.length > 0) {
    nextState = clearLines(nextState, filled);
  }

  const perfectClear = nextState.board.every((cell) => cell === 0);
  const scoreBreakdown = computeLineClearScore({
    linesCleared: filled.length,
    level: nextState.level,
    isTSpin: tSpin,
    isB2B,
    combo,
    perfectClear,
  });

  nextState = {
    ...nextState,
    score: nextState.score + scoreBreakdown.total,
    lines: nextState.lines + filled.length,
    level: Math.floor((nextState.lines + filled.length) / 10) + 1,
    lastClear: filled.length
      ? {
          id: nextState.clearId + 1,
          lines: filled,
          isTSpin: tSpin,
          isTetris,
          isB2B,
          combo,
          perfectClear,
          score: scoreBreakdown,
          boardBefore,
        }
      : null,
    clearId: nextState.clearId + (filled.length ? 1 : 0),
  };

  if (nextState.mode === 'sprint' && nextState.lines >= 40) {
    nextState = {
      ...nextState,
      sprintComplete: true,
      paused: true,
    };
  }

  nextState = spawnPiece(nextState);

  const hasHiddenOverflow = (() => {
    for (let y = 0; y < HIDDEN_ROWS; y += 1) {
      for (let x = 0; x < nextState.width; x += 1) {
        if (getCell(nextState.board, nextState.width, x, y)) return true;
      }
    }
    return false;
  })();

  if (hasHiddenOverflow) {
    nextState = { ...nextState, gameOver: true, paused: true };
  }

  return nextState;
};

export const createInitialState = (
  settings: Partial<Settings> = {},
  mode: Mode = 'marathon',
  seed?: string,
): GameState => {
  const mergedSettings = { ...DEFAULT_SETTINGS, ...settings };
  let randomState = createRandomState({ mode: mergedSettings.randomMode, seed });
  const nextQueue: PieceState['type'][] = [];
  for (let i = 0; i < 5; i += 1) {
    const next = nextPiece(randomState);
    randomState = next.state;
    nextQueue.push(next.piece);
  }
  const baseState: GameState = {
    board: createEmptyBoard(mergedSettings.width, mergedSettings.totalHeight),
    width: mergedSettings.width,
    visibleHeight: mergedSettings.visibleHeight,
    totalHeight: mergedSettings.totalHeight,
    active: { type: nextQueue[0], rotation: 0, x: SPAWN_X, y: SPAWN_Y },
    nextQueue: nextQueue.slice(1),
    hold: null,
    canHold: true,
    score: 0,
    level: 1,
    lines: 0,
    combo: 0,
    b2b: 0,
    stats: {
      piecesPlaced: 0,
      tetrises: 0,
      tspins: 0,
      maxB2B: 0,
      maxCombo: 0,
    },
    mode,
    paused: false,
    settingsOpen: false,
    isFocused: true,
    gameOver: false,
    lockElapsedMs: 0,
    lockResetsUsed: 0,
    gravityElapsedMs: 0,
    input: {
      leftHeld: false,
      rightHeld: false,
      leftHeldMs: 0,
      rightHeldMs: 0,
      leftArrMs: 0,
      rightArrMs: 0,
      softDrop: false,
    },
    lastRotation: false,
    spawnBlocked: false,
    lastClear: null,
    clearId: 0,
    softDropCells: 0,
    sprintTimeMs: 0,
    sprintComplete: false,
    settings: mergedSettings,
    randomState,
  };

  return { ...baseState, spawnBlocked: !canPlace(baseState, baseState.active) };
};

const updateDAS = (state: GameState, dt: number) => {
  let nextState = { ...state };
  const handleDir = (dir: -1 | 1) => {
    const key = dir === -1 ? 'left' : 'right';
    const held = key === 'left' ? state.input.leftHeld : state.input.rightHeld;
    if (!held) return;
    const heldMsKey = key === 'left' ? 'leftHeldMs' : 'rightHeldMs';
    const arrMsKey = key === 'left' ? 'leftArrMs' : 'rightArrMs';
    const heldMs = nextState.input[heldMsKey] + dt;
    let arrMs = nextState.input[arrMsKey];
    nextState = {
      ...nextState,
      input: { ...nextState.input, [heldMsKey]: heldMs },
    };
    if (heldMs < nextState.settings.dasMs) return;
    arrMs += dt;
    while (arrMs >= nextState.settings.arrMs) {
      const moved = movePiece(nextState, dir, 0);
      nextState = moved;
      arrMs -= nextState.settings.arrMs;
    }
    nextState = {
      ...nextState,
      input: { ...nextState.input, [arrMsKey]: arrMs },
    };
  };
  handleDir(-1);
  handleDir(1);
  return nextState;
};

export const step = (state: GameState, dtMs: number): GameState => {
  if (state.paused || state.settingsOpen || !state.isFocused || state.gameOver) return state;
  let nextState = { ...state, lastClear: state.lastClear };
  if (nextState.mode === 'sprint' && !nextState.sprintComplete) {
    nextState = { ...nextState, sprintTimeMs: nextState.sprintTimeMs + dtMs };
  }

  nextState = updateDAS(nextState, dtMs);

  const interval = getGravityInterval(nextState);
  let gravityElapsedMs = nextState.gravityElapsedMs + dtMs;
  while (gravityElapsedMs >= interval) {
    gravityElapsedMs -= interval;
    const moved = movePiece(nextState, 0, 1);
    if (moved === nextState) {
      break;
    }
    if (nextState.input.softDrop) {
      nextState = { ...moved, score: moved.score + 1, softDropCells: moved.softDropCells + 1 };
    } else {
      nextState = moved;
    }
  }
  nextState = { ...nextState, gravityElapsedMs };

  const grounded = isGrounded(nextState);
  if (grounded) {
    const lockElapsedMs = nextState.lockElapsedMs + dtMs;
    if (lockElapsedMs >= nextState.settings.lockDelayMs) {
      return lockPiece(nextState);
    }
    nextState = { ...nextState, lockElapsedMs };
  } else {
    nextState = { ...nextState, lockElapsedMs: 0, lockResetsUsed: 0 };
  }

  return nextState;
};

export const dispatch = (state: GameState, action: Action): GameState => {
  switch (action.type) {
    case 'startMove': {
      const nextInput = {
        ...state.input,
        leftHeld: action.dir === -1 ? true : state.input.leftHeld,
        rightHeld: action.dir === 1 ? true : state.input.rightHeld,
        leftHeldMs: action.dir === -1 ? 0 : state.input.leftHeldMs,
        rightHeldMs: action.dir === 1 ? 0 : state.input.rightHeldMs,
        leftArrMs: action.dir === -1 ? 0 : state.input.leftArrMs,
        rightArrMs: action.dir === 1 ? 0 : state.input.rightArrMs,
      };
      const moved = movePiece({ ...state, input: nextInput }, action.dir, 0);
      return moved;
    }
    case 'stopMove': {
      return {
        ...state,
        input: {
          ...state.input,
          leftHeld: action.dir === -1 ? false : state.input.leftHeld,
          rightHeld: action.dir === 1 ? false : state.input.rightHeld,
          leftHeldMs: action.dir === -1 ? 0 : state.input.leftHeldMs,
          rightHeldMs: action.dir === 1 ? 0 : state.input.rightHeldMs,
          leftArrMs: action.dir === -1 ? 0 : state.input.leftArrMs,
          rightArrMs: action.dir === 1 ? 0 : state.input.rightArrMs,
        },
      };
    }
    case 'softDrop':
      return { ...state, input: { ...state.input, softDrop: action.active } };
    case 'rotate':
      return rotatePiece(state, action.dir);
    case 'hardDrop': {
      const dropY = getGhostY(state);
      const distance = dropY - state.active.y;
      const nextState = {
        ...state,
        active: { ...state.active, y: dropY },
        score: state.score + distance * 2,
      };
      return lockPiece(nextState);
    }
    case 'hold': {
      if (!state.canHold) return state;
      let nextQueue = [...state.nextQueue];
      let randomState = state.randomState;
      let nextActive: PieceState;
      let nextHold: PieceState['type'] | null = state.hold;
      if (state.hold) {
        nextActive = { type: state.hold, rotation: 0, x: SPAWN_X, y: SPAWN_Y };
        nextHold = state.active.type;
      } else {
        const nextType = nextQueue[0];
        nextQueue = nextQueue.slice(1);
        if (!nextType) {
          const next = nextPiece(randomState);
          randomState = next.state;
          nextQueue = [next.piece];
        }
        nextActive = { type: nextType, rotation: 0, x: SPAWN_X, y: SPAWN_Y };
        nextHold = state.active.type;
      }
      const spawnBlocked = !canPlace(state, nextActive, nextActive.x, nextActive.y, nextActive.rotation);
      return {
        ...state,
        active: nextActive,
        hold: nextHold,
        canHold: false,
        nextQueue,
        randomState,
        spawnBlocked,
        lastRotation: false,
        lockElapsedMs: 0,
        lockResetsUsed: 0,
        gravityElapsedMs: 0,
      };
    }
    case 'togglePause':
      return state.gameOver ? state : { ...state, paused: !state.paused };
    case 'pause':
      return { ...state, paused: true };
    case 'resume':
      return state.gameOver ? state : { ...state, paused: false };
    case 'reset':
      return createInitialState(state.settings, action.mode ?? state.mode, state.randomState.seed ?? undefined);
    case 'setSettingsOpen':
      return { ...state, settingsOpen: action.open };
    case 'setFocused':
      return { ...state, isFocused: action.focused };
    case 'updateSettings':
      return { ...state, settings: { ...state.settings, ...action.settings } };
    default:
      return state;
  }
};

export const getVisibleRows = (state: GameState) => {
  const rows: number[][] = [];
  const start = state.totalHeight - state.visibleHeight;
  for (let y = start; y < state.totalHeight; y += 1) {
    const row: number[] = [];
    for (let x = 0; x < state.width; x += 1) {
      row.push(getCell(state.board, state.width, x, y));
    }
    rows.push(row);
  }
  return rows;
};

export const getVisibleOffset = (state: GameState) => state.totalHeight - state.visibleHeight;
