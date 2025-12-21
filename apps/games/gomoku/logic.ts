export type Player = 'black' | 'white';
export type Cell = Player | null;
export type Board = Cell[][];

export type GameMode = 'ai' | 'local';
export type GameResult = Player | 'draw';

export const BOARD_SIZE = 15;

export type RuleSet = 'freestyle' | 'exactFive';

export type Rules = { ruleSet: RuleSet; winLength: number };

export const DEFAULT_RULES: Rules = { ruleSet: 'freestyle', winLength: 5 };

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
  rules: Rules = DEFAULT_RULES,
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
    const meetsWinCondition =
      rules.ruleSet === 'freestyle'
        ? line.length >= rules.winLength
        : line.length === rules.winLength;
    if (meetsWinCondition) {
      const index = line.findIndex((pos) => pos.row === row && pos.col === col);
      const start = Math.max(0, Math.min(index - 2, line.length - rules.winLength));
      const segment = line.slice(start, start + rules.winLength);
      return { winner: player, line: segment };
    }
  }
  return null;
};

export const isBoardFull = (board: Board) =>
  board.every((row) => row.every((cell) => cell !== null));

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

export type Difficulty = 'casual' | 'balanced' | 'advanced';
export const DIFFICULTIES: Difficulty[] = ['casual', 'balanced', 'advanced'];

const PATTERN_SCORES: Array<{ pattern: RegExp; score: number }> = [
  { pattern: /XXXXX/, score: 1_000_000 },
  { pattern: /_XXXX_/, score: 120_000 },
  { pattern: /XXXX_/, score: 40_000 },
  { pattern: /_XXXX/, score: 40_000 },
  { pattern: /_XXX_/, score: 12_000 },
  { pattern: /XX_XX/, score: 10_000 },
  { pattern: /XXX_X/, score: 10_000 },
  { pattern: /_XX_/, score: 3_000 },
];

export interface EvaluatedMove {
  row: number;
  col: number;
  attack: number;
  defense: number;
  heuristic: number;
}

export const getCandidateMoves = (board: Board, radius: number): Array<{ row: number; col: number }> => {
  const size = board.length;
  const occupied: Array<{ row: number; col: number }> = [];
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      if (board[r][c] !== null) occupied.push({ row: r, col: c });
    }
  }

  if (occupied.length === 0) {
    const mid = Math.floor(size / 2);
    return [{ row: mid, col: mid }];
  }

  const candidates = new Set<string>();
  for (const { row, col } of occupied) {
    for (let dr = -radius; dr <= radius; dr += 1) {
      for (let dc = -radius; dc <= radius; dc += 1) {
        const r = row + dr;
        const c = col + dc;
        if (!inBounds(size, r, c) || board[r][c] !== null) continue;
        candidates.add(`${r}-${c}`);
      }
    }
  }

  return Array.from(candidates)
    .map((key) => {
      const [r, c] = key.split('-').map(Number);
      return { row: r, col: c };
    })
    .sort((a, b) => (a.row === b.row ? a.col - b.col : a.row - b.row));
};

const buildLineString = (
  board: Board,
  row: number,
  col: number,
  player: Player,
  dr: number,
  dc: number,
): string => {
  const size = board.length;
  const chars: string[] = [];
  for (let offset = -4; offset <= 4; offset += 1) {
    const r = row + dr * offset;
    const c = col + dc * offset;
    if (offset === 0) {
      chars.push('X');
    } else if (!inBounds(size, r, c)) {
      chars.push('#');
    } else if (board[r][c] === player) {
      chars.push('X');
    } else if (board[r][c] === null) {
      chars.push('_');
    } else {
      chars.push('O');
    }
  }
  return chars.join('');
};

export const scoreLineString = (line: string): number => {
  let best = 0;
  for (const { pattern, score } of PATTERN_SCORES) {
    if (pattern.test(line)) best = Math.max(best, score);
  }
  return best;
};

const evaluateHeuristic = (
  board: Board,
  row: number,
  col: number,
  player: Player,
  opponent: Player,
  difficulty: Difficulty,
): EvaluatedMove => {
  const attackScores = DIRECTIONS.map((dir) =>
    scoreLineString(buildLineString(board, row, col, player, dir[0], dir[1])),
  );
  const defenseScores = DIRECTIONS.map((dir) =>
    scoreLineString(buildLineString(board, row, col, opponent, dir[0], dir[1])),
  );
  const attack = Math.max(...attackScores);
  const defense = Math.max(...defenseScores);
  const center = (board.length - 1) / 2;
  const distance = Math.max(Math.abs(row - center), Math.abs(col - center));
  const centerBias = Math.max(0, 6 - distance) * 50;
  const adjacency = neighborBonus(board, row, col, 2) * 25;

  const weights: Record<Difficulty, { attack: number; defense: number }> = {
    casual: { attack: 1, defense: 0.6 },
    balanced: { attack: 1, defense: 0.9 },
    advanced: { attack: 1, defense: 1.2 },
  };

  const heuristic =
    attack * weights[difficulty].attack +
    defense * weights[difficulty].defense +
    centerBias +
    adjacency;

  return { row, col, attack, defense, heuristic };
};

const sortMoves = (moves: EvaluatedMove[]) =>
  moves.sort((a, b) => b.heuristic - a.heuristic || a.row - b.row || a.col - b.col);

export const chooseAiMove = (
  board: Board,
  player: Player,
  opponent: Player,
  difficulty: Difficulty = 'balanced',
  rules: Rules = DEFAULT_RULES,
): { row: number; col: number } | null => {
  const radius =
    difficulty === 'advanced' ? 3 : difficulty === 'balanced' ? 2 : 1 + Math.floor(Math.random() * 2);
  const candidates = getCandidateMoves(board, radius);
  if (candidates.length === 0) return null;

  const evaluated = candidates.map(({ row, col }) =>
    evaluateHeuristic(board, row, col, player, opponent, difficulty),
  );
  sortMoves(evaluated);

  if (difficulty === 'advanced') {
    const TOP = 10;
    const REPLIES = 10;
    let bestMove = evaluated[0];
    let bestScore = -Infinity;

    for (const move of evaluated.slice(0, TOP)) {
      const nextBoard = cloneBoard(board);
      nextBoard[move.row][move.col] = player;
      const win = checkWinner(nextBoard, move.row, move.col, player, rules);
      if (win) return { row: move.row, col: move.col };

      const replyCandidates = getCandidateMoves(nextBoard, 3);
      const replies = replyCandidates
        .map(({ row, col }) => evaluateHeuristic(nextBoard, row, col, opponent, player, difficulty))
        .sort((a, b) => b.heuristic - a.heuristic)
        .slice(0, REPLIES);
      const opponentBest = replies[0]?.heuristic ?? 0;
      const score = move.heuristic - opponentBest;
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
    return { row: bestMove.row, col: bestMove.col };
  }

  const topMove = evaluated[0];
  if (difficulty === 'casual') {
    const span = Math.min(5, evaluated.length);
    const index = Math.random() < 0.2 ? Math.floor(Math.random() * span) : 0;
    const move = evaluated[index];
    return { row: move.row, col: move.col };
  }

  return { row: topMove.row, col: topMove.col };
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
  version: number;
  ai: AiStats;
  local: LocalStats;
  totalGames: number;
  lastWinner: GameResult | null;
}

export const GOMOKU_STATS_VERSION = 1;

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
  version: GOMOKU_STATS_VERSION,
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
  (value as GomokuStats).version === GOMOKU_STATS_VERSION &&
  isAiStats((value as GomokuStats).ai) &&
  isLocalStats((value as GomokuStats).local) &&
  isFiniteNumber((value as GomokuStats).totalGames) &&
  isResult((value as GomokuStats).lastWinner);

const clampNumber = (value: unknown) => {
  if (!isFiniteNumber(value)) return 0;
  return Math.max(0, value);
};

export const migrateGomokuStats = (raw: unknown): GomokuStats | null => {
  const defaults = createDefaultStats();
  if (isGomokuStats(raw)) return raw;
  if (!raw || typeof raw !== 'object') return null;

  const value = raw as Record<string, unknown>;
  const next: GomokuStats = {
    ...defaults,
    ai: { ...defaults.ai },
    local: { ...defaults.local },
  };

  const aiSource = (value.ai as Partial<AiStats>) || {};
  const localSource = (value.local as Partial<LocalStats>) || {};

  const legacyPlayerWins = clampNumber(value.playerWins);
  const legacyAiWins = clampNumber(value.aiWins);
  const legacyDraws = clampNumber(value.draws);

  next.ai.playerWins = clampNumber(aiSource.playerWins ?? legacyPlayerWins);
  next.ai.aiWins = clampNumber(aiSource.aiWins ?? legacyAiWins);
  next.ai.draws = clampNumber(aiSource.draws ?? legacyDraws);
  next.ai.streak = clampNumber(aiSource.streak);
  next.ai.bestStreak = clampNumber(aiSource.bestStreak);

  next.local.blackWins = clampNumber(localSource.blackWins ?? value.blackWins);
  next.local.whiteWins = clampNumber(localSource.whiteWins ?? value.whiteWins);
  next.local.draws = clampNumber(localSource.draws ?? value.localDraws ?? value.draws);

  const providedTotal = clampNumber(value.totalGames);
  const computedTotal =
    next.ai.playerWins +
    next.ai.aiWins +
    next.ai.draws +
    next.local.blackWins +
    next.local.whiteWins +
    next.local.draws;
  next.totalGames = providedTotal > 0 ? providedTotal : computedTotal;

  next.lastWinner = isResult(value.lastWinner) ? value.lastWinner : null;

  return next;
};

export const applyResultToStats = (
  stats: GomokuStats,
  mode: GameMode,
  winner: GameResult,
  humanColor: Player,
): GomokuStats => {
  const next: GomokuStats = {
    version: stats.version || GOMOKU_STATS_VERSION,
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
