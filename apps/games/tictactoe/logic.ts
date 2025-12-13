export type Player = 'X' | 'O';
export type Cell = Player | null;
export type Board = Cell[];

export type GameMode = 'classic' | 'misere';
export type Winner = Player | 'draw' | null;
export type WinnerResult = { winner: Winner; line: number[] };

export type Difficulty = 'easy' | 'medium' | 'hard';
export type AiOptions = {
  size: number;
  mode: GameMode;
  difficulty: Difficulty;
  rng?: () => number;
};

const linesCache = new Map<number, number[][]>();
const boardKey = (board: Board): string => board.map((c) => c || '-').join('');

const generateLines = (size: number): number[][] => {
  if (linesCache.has(size)) return linesCache.get(size)!;
  const lines: number[][] = [];
  for (let r = 0; r < size; r++) {
    const start = r * size;
    lines.push(Array.from({ length: size }, (_, c) => start + c));
  }
  for (let c = 0; c < size; c++) {
    lines.push(Array.from({ length: size }, (_, r) => r * size + c));
  }
  lines.push(Array.from({ length: size }, (_, i) => i * size + i));
  lines.push(Array.from({ length: size }, (_, i) => i * size + (size - 1 - i)));
  linesCache.set(size, lines);
  return lines;
};

export const createBoard = (size: number): Board => Array(size * size).fill(null);

export const checkWinner = (
  board: Board,
  size = Math.sqrt(board.length),
  misere = false,
): WinnerResult => {
  const lines = generateLines(size);
  for (const line of lines) {
    const [first, ...rest] = line;
    const val = board[first];
    if (val && rest.every((idx) => board[idx] === val)) {
      const winner = misere ? (val === 'X' ? 'O' : 'X') : val;
      return { winner, line };
    }
  }
  if (board.every(Boolean)) return { winner: 'draw', line: [] };
  return { winner: null, line: [] };
};

export const getTurn = (board: Board, starting: Player = 'X'): Player => {
  const countX = board.filter((c) => c === 'X').length;
  const countO = board.filter((c) => c === 'O').length;
  if (starting === 'X') {
    if (countX === countO) return 'X';
    if (countX === countO + 1) return 'O';
  } else {
    if (countO === countX) return 'O';
    if (countO === countX + 1) return 'X';
  }
  return starting;
};

export const getLegalMoves = (board: Board): number[] =>
  board.reduce<number[]>((acc, cell, idx) => {
    if (!cell) acc.push(idx);
    return acc;
  }, []);

export const applyMove = (board: Board, index: number, player: Player): Board => {
  if (index < 0 || index >= board.length) throw new Error('Illegal move');
  if (board[index]) throw new Error('Cell occupied');
  const next = board.slice();
  next[index] = player;
  return next;
};

const isCorner = (idx: number, size: number): boolean => {
  const last = size - 1;
  const row = Math.floor(idx / size);
  const col = idx % size;
  return (row === 0 || row === last) && (col === 0 || col === last);
};

const isEdge = (idx: number, size: number): boolean => {
  const last = size - 1;
  const row = Math.floor(idx / size);
  const col = idx % size;
  return row === 0 || col === 0 || row === last || col === last;
};

export const getPreferredMoveOrder = (size: number): number[] => {
  const center = (size - 1) / 2;
  const minDistance = size % 2 === 0 ? 1 : 0;
  return Array.from({ length: size * size }, (_, idx) => idx).sort((a, b) => {
    const ax = Math.floor(a / size);
    const ay = a % size;
    const bx = Math.floor(b / size);
    const by = b % size;
    const distA = Math.abs(ax - center) + Math.abs(ay - center);
    const distB = Math.abs(bx - center) + Math.abs(by - center);
    const category = (index: number, distance: number) => {
      if (distance === minDistance) return 0;
      if (isCorner(index, size)) return 1;
      if (isEdge(index, size)) return 2;
      return 3;
    };
    const catA = category(a, distA);
    const catB = category(b, distB);
    if (catA !== catB) return catA - catB;
    if (distA !== distB) return distA - distB;
    return a - b;
  });
};

type MinimaxOptions = {
  size: number;
  mode: GameMode;
  maximizeFor: Player;
  depthLeft?: number;
  alpha?: number;
  beta?: number;
};

const heuristicScore = (board: Board, size: number, maximizeFor: Player, mode: GameMode): number => {
  const opponent: Player = maximizeFor === 'X' ? 'O' : 'X';
  let score = 0;
  for (const line of generateLines(size)) {
    const counts = line.reduce(
      (acc, idx) => {
        const cell = board[idx];
        if (cell === maximizeFor) acc[0] += 1;
        else if (cell === opponent) acc[1] += 1;
        return acc;
      },
      [0, 0],
    );
    const [selfCount, oppCount] = counts;
    if (selfCount && oppCount) continue;
    const weight = (count: number) => count * count;
    if (mode === 'classic') score += weight(selfCount) - weight(oppCount);
    else score += weight(oppCount) - weight(selfCount);
  }
  return score;
};

const minimaxCache = new Map<string, { score: number; index?: number }>();

const fullSearch = (
  board: Board,
  toMove: Player,
  ai: Player,
  size: number,
  mode: GameMode,
): { index: number; score: number } => {
  const { winner } = checkWinner(board, size, mode === 'misere');
  if (winner) {
    if (winner === 'draw') return { index: -1, score: 0 };
    return { index: -1, score: winner === ai ? 1 : -1 };
  }

  const legalMoves = getLegalMoves(board);
  const preferred = getPreferredMoveOrder(size).filter((i) => legalMoves.includes(i));
  let best: { index: number; score: number } = {
    index: -1,
    score: toMove === ai ? -Infinity : Infinity,
  };

  for (const move of preferred) {
    const nextBoard = applyMove(board, move, toMove);
    const result = fullSearch(nextBoard, toMove === 'X' ? 'O' : 'X', ai, size, mode);
    if (toMove === ai) {
      if (result.score > best.score) best = { index: move, score: result.score };
    } else if (result.score < best.score) {
      best = { index: move, score: result.score };
    }
    if (best.score === (toMove === ai ? 1 : -1)) break;
  }

  return best;
};

export const minimax = (
  board: Board,
  toMove: Player,
  { size, mode, maximizeFor, depthLeft, alpha = -Infinity, beta = Infinity }: MinimaxOptions,
): { index: number; score: number } => {
  const { winner } = checkWinner(board, size, mode === 'misere');
  if (winner) {
    if (winner === 'draw') return { index: -1, score: 0 };
    const isWin = winner === maximizeFor;
    const terminalScore = 10 + (depthLeft ?? 0);
    return { index: -1, score: isWin ? terminalScore : -terminalScore };
  }

  if (depthLeft === 0) {
    return { index: -1, score: heuristicScore(board, size, maximizeFor, mode) };
  }

  const key = `${mode}|${size}|${toMove}|${maximizeFor}|${depthLeft ?? 'inf'}|${boardKey(board)}`;
  const cached = minimaxCache.get(key);
  if (cached && cached.index !== undefined) return cached as { index: number; score: number };

  const legalMoves = getLegalMoves(board);
  const preferred = getPreferredMoveOrder(size).filter((i) => legalMoves.includes(i));
  let best: { index: number; score: number } = {
    index: -1,
    score: toMove === maximizeFor ? -Infinity : Infinity,
  };
  let currentAlpha = alpha;
  let currentBeta = beta;

  for (const move of preferred) {
    const nextBoard = applyMove(board, move, toMove);
    const nextPlayer: Player = toMove === 'X' ? 'O' : 'X';
    const result = minimax(nextBoard, nextPlayer, {
      size,
      mode,
      maximizeFor,
      depthLeft: depthLeft !== undefined ? depthLeft - 1 : undefined,
      alpha: currentAlpha,
      beta: currentBeta,
    });
    if (toMove === maximizeFor) {
      if (result.score > best.score) best = { index: move, score: result.score };
      currentAlpha = Math.max(currentAlpha, result.score);
    } else {
      if (result.score < best.score) best = { index: move, score: result.score };
      currentBeta = Math.min(currentBeta, result.score);
    }
    if (currentBeta <= currentAlpha) break;
  }

  minimaxCache.set(key, best);
  return best;
};

export const chooseAiMove = (board: Board, ai: Player, opts: AiOptions): number => {
  const { size, mode, difficulty, rng = Math.random } = opts;
  const toMove = getTurn(board);
  if (toMove !== ai) return -1;

  const depthTable: Record<number, Record<Difficulty, number>> = {
    3: { hard: size * size, medium: 5, easy: 2 },
    4: { hard: 6, medium: 4, easy: 2 },
  };
  const defaultDepth: Record<Difficulty, number | undefined> = {
    hard: size === 3 ? undefined : size * size,
    medium: 4,
    easy: 2,
  };
  const maxDepth = depthTable[size]?.[difficulty] ?? defaultDepth[difficulty];

  const mistakeRates: Record<Difficulty, number> = { hard: 0, medium: 0.1, easy: 0.35 };
  const mistakeRate = mistakeRates[difficulty];

  const legalMoves = getLegalMoves(board);
  const preferredOrder = getPreferredMoveOrder(size);
  const ranks = new Map<number, number>();
  preferredOrder.forEach((move, idx) => ranks.set(move, idx));
  const evaluated = legalMoves.map((move) => {
    if (difficulty === 'hard' && size === 3) {
      const result = fullSearch(applyMove(board, move, ai), ai === 'X' ? 'O' : 'X', ai, size, mode);
      return { move, score: result.score };
    }
    const nextBoard = applyMove(board, move, ai);
    const nextPlayer: Player = ai === 'X' ? 'O' : 'X';
    const result = minimax(nextBoard, nextPlayer, {
      size,
      mode,
      maximizeFor: ai,
      depthLeft: maxDepth ? maxDepth - 1 : undefined,
    });
    return { move, score: result.score };
  });

  const sorted = evaluated.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (ranks.get(a.move) ?? 0) - (ranks.get(b.move) ?? 0);
  });
  const topChoices = sorted.slice(0, Math.min(3, sorted.length));
  const makeMistake = rng() < mistakeRate;
  const choice = makeMistake
    ? topChoices[Math.floor(rng() * topChoices.length)]
    : sorted[0];

  return choice?.move ?? -1;
};
