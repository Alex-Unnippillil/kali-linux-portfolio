export type Cell = 'red' | 'yellow' | null;
export type Board = Cell[][];
export type WinningCell = { r: number; c: number };
export type Token = Exclude<Cell, null>;

export type Difficulty = 'easy' | 'normal' | 'hard';

type TableEntry = { depth: number; score: number; column?: number };
export type TranspositionTable = Map<string, TableEntry>;

export const ROWS = 6;
export const COLS = 7;
const WIN_SCORE = 1_000_000;

const DIRECTIONS = [
  { dr: 0, dc: 1 },
  { dr: 1, dc: 0 },
  { dr: 1, dc: 1 },
  { dr: 1, dc: -1 },
];

export const createEmptyBoard = (): Board =>
  Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(null));

export const getValidRow = (board: Board, col: number): number => {
  if (col < 0 || col >= COLS) return -1;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (!board[r][col]) return r;
  }
  return -1;
};

export const getWinningCells = (board: Board, player: Token): WinningCell[] | null => {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] !== player) continue;
      for (const { dr, dc } of DIRECTIONS) {
        const cells: WinningCell[] = [];
        for (let i = 0; i < 4; i++) {
          const rr = r + dr * i;
          const cc = c + dc * i;
          if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) break;
          if (board[rr][cc] !== player) break;
          cells.push({ r: rr, c: cc });
        }
        if (cells.length === 4) return cells;
      }
    }
  }

  return null;
};

export const checkWinner = (board: Board, player: Token): boolean =>
  Boolean(getWinningCells(board, player));

export const isBoardFull = (board: Board): boolean => board[0].every(Boolean);

const opponentOf = (player: Token): Token => (player === 'red' ? 'yellow' : 'red');

const evaluateWindow = (window: Cell[], player: Token): number => {
  const opp = opponentOf(player);
  let score = 0;
  const playerCount = window.filter((v) => v === player).length;
  const oppCount = window.filter((v) => v === opp).length;
  const empty = window.filter((v) => v === null).length;
  if (playerCount === 4) score += 100;
  else if (playerCount === 3 && empty === 1) score += 5;
  else if (playerCount === 2 && empty === 2) score += 2;
  if (oppCount === 3 && empty === 1) score -= 6;
  return score;
};

const scorePosition = (board: Board, player: Token): number => {
  let score = 0;
  const center = Math.floor(COLS / 2);
  const centerArray = board.map((row) => row[center]);
  score += centerArray.filter((v) => v === player).length * 3;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      score += evaluateWindow(board[r].slice(c, c + 4), player);
    }
  }
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS - 3; r++) {
      score += evaluateWindow([board[r][c], board[r + 1][c], board[r + 2][c], board[r + 3][c]], player);
    }
  }
  for (let r = 0; r < ROWS - 3; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      score += evaluateWindow([board[r][c], board[r + 1][c + 1], board[r + 2][c + 2], board[r + 3][c + 3]], player);
    }
  }
  for (let r = 3; r < ROWS; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      score += evaluateWindow([board[r][c], board[r - 1][c + 1], board[r - 2][c + 2], board[r - 3][c + 3]], player);
    }
  }

  return score;
};

const getValidLocations = (board: Board): number[] => {
  const locations: number[] = [];
  for (let c = 0; c < COLS; c++) {
    if (!board[0][c]) locations.push(c);
  }
  return locations;
};

const orderColumns = (cols: number[]): number[] => {
  const center = Math.floor(COLS / 2);
  return [...cols].sort((a, b) => Math.abs(a - center) - Math.abs(b - center) || a - b);
};

const hashBoard = (board: Board): string =>
  board
    .map((row) =>
      row
        .map((cell) => {
          if (cell === 'red') return 'r';
          if (cell === 'yellow') return 'y';
          return '_';
        })
        .join(''),
    )
    .join('|');

const evaluateForRoot = (board: Board, rootPlayer: Token): number => {
  if (checkWinner(board, rootPlayer)) return WIN_SCORE;
  if (checkWinner(board, opponentOf(rootPlayer))) return -WIN_SCORE;
  return scorePosition(board, rootPlayer) - scorePosition(board, opponentOf(rootPlayer));
};

const immediateTacticalMove = (board: Board, player: Token): number | null => {
  const ordered = orderColumns(getValidLocations(board));
  for (const col of ordered) {
    const row = getValidRow(board, col);
    if (row === -1) continue;
    board[row][col] = player;
    const wins = checkWinner(board, player);
    board[row][col] = null;
    if (wins) return col;
  }

  const opponent = opponentOf(player);
  for (const col of ordered) {
    const row = getValidRow(board, col);
    if (row === -1) continue;
    board[row][col] = opponent;
    const oppWins = checkWinner(board, opponent);
    board[row][col] = null;
    if (oppWins) return col;
  }

  return null;
};

const minimaxInternal = (
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  currentPlayer: Token,
  rootPlayer: Token,
  table: TranspositionTable,
): { column?: number; score: number } => {
  const key = `${currentPlayer}:${depth}:${hashBoard(board)}:${rootPlayer}`;
  const cached = table.get(key);
  if (cached && cached.depth >= depth) return { column: cached.column, score: cached.score };

  const validLocations = orderColumns(getValidLocations(board));
  const terminal =
    validLocations.length === 0 || checkWinner(board, 'red') || checkWinner(board, 'yellow') || depth === 0;

  if (terminal) {
    const score = evaluateForRoot(board, rootPlayer);
    table.set(key, { depth, score });
    return { score };
  }

  const maximizing = currentPlayer === rootPlayer;
  let bestScore = maximizing ? -Infinity : Infinity;
  let bestColumn = validLocations[0];

  for (const col of validLocations) {
    const row = getValidRow(board, col);
    if (row === -1) continue;

    board[row][col] = currentPlayer;
    const score = minimaxInternal(
      board,
      depth - 1,
      alpha,
      beta,
      opponentOf(currentPlayer),
      rootPlayer,
      table,
    ).score;
    board[row][col] = null;

    if (maximizing ? score > bestScore : score < bestScore) {
      bestScore = score;
      bestColumn = col;
    }

    if (maximizing) {
      alpha = Math.max(alpha, bestScore);
    } else {
      beta = Math.min(beta, bestScore);
    }

    if (alpha >= beta) break;
  }

  table.set(key, { depth, score: bestScore, column: bestColumn });
  return { column: bestColumn, score: bestScore };
};

export const minimax = (
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  table: TranspositionTable = new Map(),
): { column?: number; score: number } =>
  minimaxInternal(board, depth, alpha, beta, maximizing ? 'red' : 'yellow', 'red', table);

export const getBestMove = (
  board: Board,
  depth: number,
  player: Token,
  table: TranspositionTable = new Map(),
): { column: number; scores: (number | null)[] } => {
  const valid = orderColumns(getValidLocations(board));
  const scores: (number | null)[] = Array(COLS).fill(null);
  let bestColumn = valid[0] ?? 0;
  let bestScore = -Infinity;

  for (const col of valid) {
    const row = getValidRow(board, col);
    if (row === -1) continue;

    board[row][col] = player;
    const score = minimaxInternal(
      board,
      Math.max(0, depth - 1),
      -Infinity,
      Infinity,
      opponentOf(player),
      player,
      table,
    ).score;
    board[row][col] = null;

    scores[col] = score;
    if (score > bestScore) {
      bestScore = score;
      bestColumn = col;
    }
  }

  return { column: bestColumn, scores };
};

export const getMoveForDifficulty = (
  board: Board,
  player: Token,
  difficulty: Difficulty,
  options: { random?: () => number; table?: TranspositionTable; hardTimeMs?: number } = {},
): { column: number; scores: (number | null)[]; depthReached: number } => {
  const random = options.random ?? Math.random;
  const table = options.table ?? new Map<string, TableEntry>();

  const tactical = immediateTacticalMove(board, player);
  if (tactical !== null) {
    const scores: (number | null)[] = Array(COLS).fill(null);
    scores[tactical] = WIN_SCORE;
    return { column: tactical, scores, depthReached: 1 };
  }

  if (difficulty === 'easy') {
    const { scores } = getBestMove(board, 2, player, table);
    const ranked = orderColumns(getValidLocations(board)).filter((c) => scores[c] !== null);
    const top = ranked
      .slice()
      .sort((a, b) => (scores[b] ?? -Infinity) - (scores[a] ?? -Infinity))
      .slice(0, 3);
    const pick = top[Math.floor(random() * top.length)] ?? ranked[0] ?? 0;
    return { column: pick, scores, depthReached: 2 };
  }

  if (difficulty === 'normal') {
    const result = getBestMove(board, 5, player, table);
    return { ...result, depthReached: 5 };
  }

  const start = Date.now();
  const budget = Math.max(150, Math.min(900, options.hardTimeMs ?? 500));
  let best = getBestMove(board, 4, player, table);
  let depthReached = 4;

  for (let depth = 5; depth <= 9; depth++) {
    if (Date.now() - start >= budget) break;
    best = getBestMove(board, depth, player, table);
    depthReached = depth;
  }

  return { ...best, depthReached };
};

export const evaluateColumns = (board: Board, player: Token): (number | null)[] => {
  const base = scorePosition(board, player);
  const scores: (number | null)[] = Array(COLS).fill(null);
  for (let c = 0; c < COLS; c++) {
    const row = getValidRow(board, c);
    if (row === -1) continue;
    board[row][c] = player;
    scores[c] = scorePosition(board, player) - base;
    board[row][c] = null;
  }
  return scores;
};
