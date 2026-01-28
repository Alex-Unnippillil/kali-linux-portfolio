import {
  Board,
  Move,
  Color,
  createBoard,
  getPieceMoves,
  getAllMoves,
  applyMove,
  evaluateBoard,
  serializePosition,
} from '../../components/apps/checkers/engine';

export type RuleMode = 'forced' | 'relaxed';

export type TurnState = {
  turn: Color;
  pendingCaptureFrom: [number, number] | null;
  turnHadCapture: boolean;
  turnHadKinging: boolean;
};

export type GameState = {
  board: Board;
  rules: { mode: RuleMode; crownEndsTurn: boolean };
  turnState: TurnState;
  noCaptureMoves: number;
  positionCounts: Map<string, number>;
};

export type SerializedGameState = Omit<GameState, 'positionCounts'> & {
  positionCounts: [string, number][];
};

const otherColor = (color: Color): Color => (color === 'red' ? 'black' : 'red');

export const serializeGameState = (state: GameState): SerializedGameState => ({
  ...state,
  positionCounts: Array.from(state.positionCounts.entries()),
});

export const hydrateGameState = (state: SerializedGameState): GameState => ({
  ...state,
  positionCounts: new Map(state.positionCounts),
});

export const createGameState = (mode: RuleMode): GameState => {
  const board = createBoard();
  const turnState: TurnState = {
    turn: 'red',
    pendingCaptureFrom: null,
    turnHadCapture: false,
    turnHadKinging: false,
  };
  const key = serializePosition(board, turnState.turn, turnState.pendingCaptureFrom, mode);
  return {
    board,
    rules: { mode, crownEndsTurn: true },
    turnState,
    noCaptureMoves: 0,
    positionCounts: new Map([[key, 1]]),
  };
};

export const getLegalMoves = (state: GameState): Move[] => {
  const { board, rules, turnState } = state;
  if (turnState.pendingCaptureFrom) {
    const [r, c] = turnState.pendingCaptureFrom;
    return getPieceMoves(board, r, c, true).filter((m) => m.captured);
  }

  if (rules.mode === 'forced') {
    return getAllMoves(board, turnState.turn, true);
  }

  return getAllMoves(board, turnState.turn, false);
};

export const getForcedFromSquares = (state: GameState): Set<string> => {
  const { board, rules, turnState } = state;
  if (turnState.pendingCaptureFrom) {
    return new Set([`${turnState.pendingCaptureFrom[0]}-${turnState.pendingCaptureFrom[1]}`]);
  }

  if (rules.mode === 'forced') {
    const all = getAllMoves(board, turnState.turn, false);
    const captures = all.filter((m) => m.captured);
    if (captures.length) {
      return new Set(captures.map((m) => `${m.from[0]}-${m.from[1]}`));
    }
  }

  return new Set();
};

const updateRepetition = (state: GameState) => {
  const key = serializePosition(
    state.board,
    state.turnState.turn,
    state.turnState.pendingCaptureFrom,
    state.rules.mode,
  );
  const current = state.positionCounts.get(key) ?? 0;
  state.positionCounts.set(key, current + 1);
};

const isDrawState = (state: GameState): boolean => {
  if (state.noCaptureMoves >= 40) return true;
  return Array.from(state.positionCounts.values()).some((count) => count >= 3);
};

export const getWinnerIfNoMoves = (state: GameState): Color | null => {
  const legal = getLegalMoves(state);
  if (legal.length) return null;
  return otherColor(state.turnState.turn);
};

export const applyStep = (
  state: GameState,
  move: Move,
): {
  next: GameState;
  events: {
    capture: boolean;
    kinged: boolean;
    turnEnded: boolean;
    winner: Color | null;
    draw: boolean;
  };
} => {
  const legalMoves = getLegalMoves(state);
  const matched = legalMoves.find(
    (m) =>
      m.from[0] === move.from[0] &&
      m.from[1] === move.from[1] &&
      m.to[0] === move.to[0] &&
      m.to[1] === move.to[1] &&
      (!!m.captured === !!move.captured) &&
      (!m.captured ||
        (move.captured && m.captured[0] === move.captured[0] && m.captured[1] === move.captured[1])),
  );

  if (!matched) {
    throw new Error('Illegal move');
  }

  const { board: newBoard, capture, king } = applyMove(state.board, matched);

  const nextState: GameState = {
    board: newBoard,
    rules: state.rules,
    turnState: {
      ...state.turnState,
      turnHadCapture: state.turnState.turnHadCapture || capture,
      turnHadKinging: state.turnState.turnHadKinging || king,
    },
    noCaptureMoves: state.noCaptureMoves,
    positionCounts: new Map(state.positionCounts),
  };

  let turnEnded = false;
  let winner: Color | null = null;

  if (capture) {
    const [toR, toC] = matched.to;
    const furtherCaps = getPieceMoves(newBoard, toR, toC, true).filter((m) => m.captured);
    if (king && state.rules.crownEndsTurn) {
      turnEnded = true;
    } else if (furtherCaps.length) {
      nextState.turnState.pendingCaptureFrom = [toR, toC];
    } else {
      turnEnded = true;
    }
  } else {
    turnEnded = true;
  }

  if (turnEnded) {
    nextState.turnState = {
      turn: otherColor(state.turnState.turn),
      pendingCaptureFrom: null,
      turnHadCapture: false,
      turnHadKinging: false,
    };
    nextState.noCaptureMoves =
      state.turnState.turnHadCapture || state.turnState.turnHadKinging || capture || king
        ? 0
        : state.noCaptureMoves + 1;
    winner = getWinnerIfNoMoves(nextState);
  }

  updateRepetition(nextState);
  const draw = isDrawState(nextState);

  return {
    next: nextState,
    events: {
      capture,
      kinged: king,
      turnEnded,
      winner,
      draw,
    },
  };
};

const evaluateFor = (board: Board, perspective: Color) => {
  const score = evaluateBoard(board);
  return perspective === 'red' ? score : -score;
};

const negamax = (
  state: GameState,
  depth: number,
  alpha: number,
  beta: number,
  rootTurn: Color,
): { score: number; move: Move | null } => {
  const key = serializePosition(
    state.board,
    state.turnState.turn,
    state.turnState.pendingCaptureFrom,
    state.rules.mode,
  );
  const repCount = state.positionCounts.get(key) ?? 0;
  if (repCount >= 3 || state.noCaptureMoves >= 40) return { score: 0, move: null };

  const legal = getLegalMoves(state);
  if (!legal.length) {
    const score = state.turnState.turn === rootTurn ? -Infinity : Infinity;
    return { score, move: null };
  }

  if (depth === 0) {
    return { score: evaluateFor(state.board, rootTurn), move: legal[0] };
  }

  let bestMove: Move | null = null;
  let bestScore = -Infinity;
  for (const move of legal) {
    const { next, events } = applyStep(state, move);
    const nextDepth = events.turnEnded ? depth - 1 : depth;
    const child = negamax(next, nextDepth, -beta, -alpha, rootTurn);
    const score = -child.score;
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
    alpha = Math.max(alpha, score);
    if (alpha >= beta) break;
  }

  return { score: bestScore, move: bestMove };
};

export const chooseMove = (state: GameState, depth: number): Move | null => {
  const { move } = negamax(state, depth, -Infinity, Infinity, state.turnState.turn);
  return move ?? null;
};
