export type Player = 'black' | 'white';
export type Cell = Player | null;
export type Board = Cell[][];

export type GameMode = 'ai' | 'local';
export type GameResult = Player | 'draw';

export const BOARD_SIZE = 15;

export const DIRECTIONS: Array<[number, number]> = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

export const createEmptyBoard = (size = BOARD_SIZE): Board =>
  Array.from({ length: size }, () => Array<Cell>(size).fill(null));

export const cloneBoard = (board: Board): Board =>
  board.map((row) => row.slice() as Cell[]);

const inBounds = (size: number, row: number, col: number) =>
  row >= 0 && row < size && col >= 0 && col < size;

export interface WinResult {
  winner: Player;
  line: Array<{ row: number; col: number }>;
}

export const checkWinner = (
  board: Board,
  row: number,
  col: number,
  player: Player,
): WinResult | null => {
  const size = board.length;
  for (const [dr, dc] of DIRECTIONS) {
    const line: Array<{ row: number; col: number }> = [{ row, col }];
    let r = row + dr;
    let c = col + dc;
    while (inBounds(size, r, c) && board[r][c] === player) {
      line.push({ row: r, col: c });
      r += dr;
      c += dc;
    }
    r = row - dr;
    c = col - dc;
    while (inBounds(size, r, c) && board[r][c] === player) {
      line.unshift({ row: r, col: c });
      r -= dr;
      c -= dc;
    }
    if (line.length >= 5) {
      return { winner: player, line };
    }
  }
  return null;
};

export const isBoardFull = (board: Board) =>
  board.every((row) => row.every((cell) => cell !== null));

interface LineStats {
  count: number;
  openEnds: number;
}

const SCORE_FIVE = 1_000_000;
const SCORE_OPEN_FOUR = 50_000;
const SCORE_CLOSED_FOUR = 10_000;
const SCORE_OPEN_THREE = 2_000;
const SCORE_CLOSED_THREE = 400;
const SCORE_OPEN_TWO = 120;
const SCORE_DEFAULT = 10;

const evaluateDirection = (
  board: Board,
  row: number,
  col: number,
  player: Player,
  dr: number,
  dc: number,
): LineStats => {
  const size = board.length;
  let count = 1;
  let openEnds = 0;
  let r = row + dr;
  let c = col + dc;
  while (inBounds(size, r, c) && board[r][c] === player) {
    count += 1;
    r += dr;
    c += dc;
  }
  if (inBounds(size, r, c) && board[r][c] === null) openEnds += 1;
  r = row - dr;
  c = col - dc;
  while (inBounds(size, r, c) && board[r][c] === player) {
    count += 1;
    r -= dr;
    c -= dc;
  }
  if (inBounds(size, r, c) && board[r][c] === null) openEnds += 1;
  return { count, openEnds };
};

const scoreLine = ({ count, openEnds }: LineStats) => {
  if (count >= 5) return SCORE_FIVE;
  if (count === 4) return openEnds === 2 ? SCORE_OPEN_FOUR : SCORE_CLOSED_FOUR;
  if (count === 3) return openEnds === 2 ? SCORE_OPEN_THREE : SCORE_CLOSED_THREE;
  if (count === 2) return openEnds === 2 ? SCORE_OPEN_TWO : SCORE_DEFAULT;
  return SCORE_DEFAULT;
};

const neighborBonus = (
  board: Board,
  row: number,
  col: number,
  radius = 1,
): number => {
  const size = board.length;
  let total = 0;
  for (let r = row - radius; r <= row + radius; r += 1) {
    for (let c = col - radius; c <= col + radius; c += 1) {
      if (!inBounds(size, r, c) || (r === row && c === col)) continue;
      if (board[r][c] !== null) total += 1;
    }
  }
  return total;
};

export interface EvaluatedMove {
  row: number;
  col: number;
  attack: number;
  defense: number;
  heuristic: number;
}

export const evaluateMove = (
  board: Board,
  row: number,
  col: number,
  player: Player,
  opponent: Player,
): EvaluatedMove => {
  const attackScores = DIRECTIONS.map((dir) =>
    scoreLine(evaluateDirection(board, row, col, player, dir[0], dir[1])),
  );
  const defenseScores = DIRECTIONS.map((dir) =>
    scoreLine(evaluateDirection(board, row, col, opponent, dir[0], dir[1])),
  );
  const attack = Math.max(...attackScores);
  const defense = Math.max(...defenseScores);
  const adjacency = neighborBonus(board, row, col, 2);
  return {
    row,
    col,
    attack,
    defense,
    heuristic: attack * 2 + defense * 1.6 + adjacency * 15,
  };
};

export type Difficulty = 'casual' | 'balanced' | 'advanced';
export const DIFFICULTIES: Difficulty[] = ['casual', 'balanced', 'advanced'];

const isWinningScore = (score: number) => score >= SCORE_FIVE;

export const chooseAiMove = (
  board: Board,
  player: Player,
  opponent: Player,
  difficulty: Difficulty = 'balanced',
): { row: number; col: number } | null => {
  const size = board.length;
  const moves: EvaluatedMove[] = [];
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (board[row][col] !== null) continue;
      moves.push(evaluateMove(board, row, col, player, opponent));
    }
  }
  if (moves.length === 0) return null;

  const winning = moves.filter((m) => isWinningScore(m.attack));
  if (winning.length > 0) {
    const move = winning[Math.floor(Math.random() * winning.length)];
    return { row: move.row, col: move.col };
  }
  const blocking = moves.filter((m) => isWinningScore(m.defense));
  if (blocking.length > 0) {
    blocking.sort((a, b) => b.defense - a.defense);
    const move = blocking[0];
    return { row: move.row, col: move.col };
  }

  moves.sort((a, b) => b.heuristic - a.heuristic);
  if (difficulty === 'advanced' || moves.length <= 2) {
    const top = moves[0];
    return { row: top.row, col: top.col };
  }
  if (difficulty === 'casual') {
    const span = Math.min(5, moves.length);
    const move = moves[Math.floor(Math.random() * span)];
    return { row: move.row, col: move.col };
  }
  const topSpan = Math.min(3, moves.length);
  const index = Math.random() < 0.75 ? 0 : Math.floor(Math.random() * topSpan);
  const move = moves[index];
  return { row: move.row, col: move.col };
};

export interface AiStats {
  playerWins: number;
  aiWins: number;
  draws: number;
  streak: number;
  bestStreak: number;
}

export interface LocalStats {
  blackWins: number;
  whiteWins: number;
  draws: number;
}

export interface GomokuStats {
  ai: AiStats;
  local: LocalStats;
  totalGames: number;
  lastWinner: GameResult | null;
}

const createAiStats = (): AiStats => ({
  playerWins: 0,
  aiWins: 0,
  draws: 0,
  streak: 0,
  bestStreak: 0,
});

const createLocalStats = (): LocalStats => ({
  blackWins: 0,
  whiteWins: 0,
  draws: 0,
});

export const createDefaultStats = (): GomokuStats => ({
  ai: createAiStats(),
  local: createLocalStats(),
  totalGames: 0,
  lastWinner: null,
});

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

const isAiStats = (value: unknown): value is AiStats =>
  !!value &&
  typeof value === 'object' &&
  isFiniteNumber((value as AiStats).playerWins) &&
  isFiniteNumber((value as AiStats).aiWins) &&
  isFiniteNumber((value as AiStats).draws) &&
  isFiniteNumber((value as AiStats).streak) &&
  isFiniteNumber((value as AiStats).bestStreak);

const isLocalStats = (value: unknown): value is LocalStats =>
  !!value &&
  typeof value === 'object' &&
  isFiniteNumber((value as LocalStats).blackWins) &&
  isFiniteNumber((value as LocalStats).whiteWins) &&
  isFiniteNumber((value as LocalStats).draws);

const isResult = (value: unknown): value is GameResult | null =>
  value === null || value === 'draw' || value === 'black' || value === 'white';

export const isGomokuStats = (value: unknown): value is GomokuStats =>
  !!value &&
  typeof value === 'object' &&
  isAiStats((value as GomokuStats).ai) &&
  isLocalStats((value as GomokuStats).local) &&
  isFiniteNumber((value as GomokuStats).totalGames) &&
  isResult((value as GomokuStats).lastWinner);

export const applyResultToStats = (
  stats: GomokuStats,
  mode: GameMode,
  winner: GameResult,
  humanColor: Player,
): GomokuStats => {
  const next: GomokuStats = {
    ai: { ...stats.ai },
    local: { ...stats.local },
    totalGames: stats.totalGames + 1,
    lastWinner: winner,
  };

  if (mode === 'ai') {
    if (winner === 'draw') {
      next.ai.draws += 1;
      next.ai.streak = 0;
    } else if (winner === humanColor) {
      next.ai.playerWins += 1;
      const streak = next.ai.streak + 1;
      next.ai.streak = streak;
      if (streak > next.ai.bestStreak) next.ai.bestStreak = streak;
    } else {
      next.ai.aiWins += 1;
      next.ai.streak = 0;
    }
  } else {
    if (winner === 'draw') {
      next.local.draws += 1;
    } else if (winner === 'black') {
      next.local.blackWins += 1;
    } else {
      next.local.whiteWins += 1;
    }
  }

  return next;
};

export const oppositePlayer = (player: Player): Player =>
  (player === 'black' ? 'white' : 'black');
