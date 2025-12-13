export type Player = 'red' | 'yellow';
export type Cell = Player | null;
export type Coord = { r: number; c: number };
export type WinLine = { cells: Coord[]; dr: number; dc: number };
export type Board = Cell[][];

export const ROWS = 6;
export const COLS = 7;

export const createEmptyBoard = (): Board =>
  Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(null));

const cloneBoard = (board: Board): Board => board.map((row) => [...row]);

export const getValidRow = (board: Board, col: number): number => {
  for (let r = ROWS - 1; r >= 0; r -= 1) {
    if (!board[r][col]) return r;
  }
  return -1;
};

export const listValidColumns = (board: Board): number[] => {
  const valid: number[] = [];
  for (let c = 0; c < COLS; c += 1) {
    if (!board[0][c]) valid.push(c);
  }
  return valid;
};

export const applyMove = (
  board: Board,
  col: number,
  player: Player,
): { board: Board; row: number } | null => {
  if (col < 0 || col >= COLS) return null;
  const row = getValidRow(board, col);
  if (row === -1) return null;
  const newBoard = cloneBoard(board);
  newBoard[row][col] = player;
  return { board: newBoard, row };
};

export const isBoardFull = (board: Board): boolean => board[0].every(Boolean);

const directions: Array<{ dr: number; dc: number }> = [
  { dr: 0, dc: 1 },
  { dr: 1, dc: 0 },
  { dr: 1, dc: 1 },
  { dr: 1, dc: -1 },
];

export const getWinLineFromLastMove = (
  board: Board,
  row: number,
  col: number,
  player: Player,
): WinLine | null => {
  for (const { dr, dc } of directions) {
    const forward: Coord[] = [];
    for (let i = 1; i <= 3; i += 1) {
      const r = row + dr * i;
      const c = col + dc * i;
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) break;
      if (board[r][c] !== player) break;
      forward.push({ r, c });
    }

    const backward: Coord[] = [];
    for (let i = 1; i <= 3; i += 1) {
      const r = row - dr * i;
      const c = col - dc * i;
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) break;
      if (board[r][c] !== player) break;
      backward.push({ r, c });
    }

    const cells = [...backward.reverse(), { r: row, c: col }, ...forward];
    if (cells.length >= 4) return { cells, dr, dc };
  }
  return null;
};

export const getResultAfterMove = (
  board: Board,
  lastMove: { row: number; col: number; player: Player } | null,
): { status: 'win' | 'draw' | 'ongoing'; winner?: Player; line?: WinLine } => {
  const winLine = lastMove
    ? getWinLineFromLastMove(board, lastMove.row, lastMove.col, lastMove.player)
    : null;
  if (winLine) return { status: 'win', winner: lastMove!.player, line: winLine };
  if (isBoardFull(board)) return { status: 'draw' };
  return { status: 'ongoing' };
};

const evaluateWindow = (window: Cell[], player: Player): number => {
  const opp = player === 'red' ? 'yellow' : 'red';
  let score = 0;
  const playerCount = window.filter((v) => v === player).length;
  const oppCount = window.filter((v) => v === opp).length;
  const empty = window.filter((v) => v === null).length;
  if (playerCount === 4) score += 100;
  else if (playerCount === 3 && empty === 1) score += 5;
  else if (playerCount === 2 && empty === 2) score += 2;
  if (oppCount === 3 && empty === 1) score -= 4;
  return score;
};

const scorePosition = (board: Board, player: Player): number => {
  let score = 0;
  const center = Math.floor(COLS / 2);
  const centerArray = board.map((row) => row[center]);
  score += centerArray.filter((v) => v === player).length * 3;
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS - 3; c += 1) {
      score += evaluateWindow(board[r].slice(c, c + 4), player);
    }
  }
  for (let c = 0; c < COLS; c += 1) {
    for (let r = 0; r < ROWS - 3; r += 1) {
      score += evaluateWindow(
        [board[r][c], board[r + 1][c], board[r + 2][c], board[r + 3][c]],
        player,
      );
    }
  }
  for (let r = 0; r < ROWS - 3; r += 1) {
    for (let c = 0; c < COLS - 3; c += 1) {
      score += evaluateWindow(
        [
          board[r][c],
          board[r + 1][c + 1],
          board[r + 2][c + 2],
          board[r + 3][c + 3],
        ],
        player,
      );
    }
  }
  for (let r = 3; r < ROWS; r += 1) {
    for (let c = 0; c < COLS - 3; c += 1) {
      score += evaluateWindow(
        [
          board[r][c],
          board[r - 1][c + 1],
          board[r - 2][c + 2],
          board[r - 3][c + 3],
        ],
        player,
      );
    }
  }
  return score;
};

const score = (board: Board, maximizingPlayer: Player): number => {
  const opponent = maximizingPlayer === 'red' ? 'yellow' : 'red';
  return scorePosition(board, maximizingPlayer) - scorePosition(board, opponent);
};

const opponentOf = (player: Player): Player => (player === 'red' ? 'yellow' : 'red');

const MOVE_ORDER = [3, 2, 4, 1, 5, 0, 6];
const WIN_SCORE = 1_000_000;

const minimax = (
  board: Board,
  depth: number,
  maximizingPlayer: Player,
  currentPlayer: Player,
  lastMove: { row: number; col: number; player: Player } | null,
  alpha: number,
  beta: number,
  cache?: Map<string, { depth: number; score: number }>,
): { column?: number; score: number } => {
  const key = cache
    ? `${board.flat().map((c) => c ?? '.').join('')}|${currentPlayer}|${depth}`
    : null;
  if (cache && key && cache.has(key)) {
    return { score: cache.get(key)!.score };
  }

  const result = getResultAfterMove(board, lastMove);
  if (result.status === 'win') {
    const winScore = result.winner === maximizingPlayer ? WIN_SCORE + depth : -WIN_SCORE - depth;
    if (cache && key) cache.set(key, { depth, score: winScore });
    return { score: winScore };
  }
  if (result.status === 'draw' || depth === 0) {
    const terminalScore = depth === 0 ? score(board, maximizingPlayer) : 0;
    if (cache && key) cache.set(key, { depth, score: terminalScore });
    return { score: terminalScore };
  }

  const validColumns = listValidColumns(board);
  if (validColumns.length === 0) return { score: 0 };
  const orderedColumns = MOVE_ORDER.filter((c) => validColumns.includes(c));
  let bestColumn = orderedColumns[0];

  if (currentPlayer === maximizingPlayer) {
    let value = -Infinity;
    for (const col of orderedColumns) {
      const move = applyMove(board, col, currentPlayer);
      if (!move) continue;
      const child = minimax(
        move.board,
        depth - 1,
        maximizingPlayer,
        opponentOf(currentPlayer),
        { row: move.row, col, player: currentPlayer },
        alpha,
        beta,
        cache,
      );
      const childScore = child.score;
      if (childScore > value) {
        value = childScore;
        bestColumn = col;
      }
      alpha = Math.max(alpha, value);
      if (alpha >= beta) break;
    }
    if (cache && key) cache.set(key, { depth, score: value });
    return { column: bestColumn, score: value };
  }

  let value = Infinity;
  for (const col of orderedColumns) {
    const move = applyMove(board, col, currentPlayer);
    if (!move) continue;
    const child = minimax(
      move.board,
      depth - 1,
      maximizingPlayer,
      opponentOf(currentPlayer),
      { row: move.row, col, player: currentPlayer },
      alpha,
      beta,
      cache,
    );
    const childScore = child.score;
    if (childScore < value) {
      value = childScore;
      bestColumn = col;
    }
    beta = Math.min(beta, value);
    if (alpha >= beta) break;
  }
  if (cache && key) cache.set(key, { depth, score: value });
  return { column: bestColumn, score: value };
};

export const evaluateColumns = (board: Board, player: Player): (number | null)[] => {
  const base = score(board, player);
  const scores: (number | null)[] = Array(COLS).fill(null);
  for (let c = 0; c < COLS; c += 1) {
    const move = applyMove(board, c, player);
    if (!move) continue;
    scores[c] = score(move.board, player) - base;
  }
  return scores;
};

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

const findImmediateWin = (board: Board, player: Player): number | null => {
  for (const col of MOVE_ORDER) {
    const move = applyMove(board, col, player);
    if (!move) continue;
    const line = getWinLineFromLastMove(move.board, move.row, col, player);
    if (line) return col;
  }
  return null;
};

const minimaxDepthByDifficulty: Record<Difficulty, number> = {
  easy: 2,
  medium: 4,
  hard: 5,
  expert: 7,
};

export const chooseAiMove = (
  board: Board,
  player: Player,
  difficulty: Difficulty,
  rng: () => number = Math.random,
): { column: number; scores: (number | null)[] } => {
  const validColumns = listValidColumns(board);
  const scores: (number | null)[] = Array(COLS).fill(null);
  if (!validColumns.length) return { column: 0, scores };

  const immediateWin = findImmediateWin(board, player);
  if (immediateWin !== null) return { column: immediateWin, scores };

  const opponent = opponentOf(player);
  const block = findImmediateWin(board, opponent);
  if (block !== null) return { column: block, scores };

  if (difficulty === 'easy') {
    const evaluations: Array<{ col: number; value: number }> = [];
    for (const col of MOVE_ORDER.filter((c) => validColumns.includes(c))) {
      const move = applyMove(board, col, player);
      if (!move) continue;
      const value = score(move.board, player);
      scores[col] = value;
      evaluations.push({ col, value });
    }
    evaluations.sort((a, b) => b.value - a.value);
    const top = evaluations.slice(0, 2);
    const pick = top[Math.floor(rng() * top.length)] ?? top[0];
    return { column: pick.col, scores };
  }

  const depth = minimaxDepthByDifficulty[difficulty];
  const useCache = difficulty === 'expert';
  const cache = useCache ? new Map<string, { depth: number; score: number }>() : undefined;
  let bestColumn = validColumns[0];
  let bestScore = -Infinity;

  for (const col of MOVE_ORDER.filter((c) => validColumns.includes(c))) {
    const move = applyMove(board, col, player);
    if (!move) continue;
    const { score: childScore } = minimax(
      move.board,
      depth - 1,
      player,
      opponent,
      { row: move.row, col, player },
      -Infinity,
      Infinity,
      cache,
    );
    scores[col] = childScore;
    if (childScore > bestScore) {
      bestScore = childScore;
      bestColumn = col;
    }
  }

  return { column: bestColumn, scores };
};
