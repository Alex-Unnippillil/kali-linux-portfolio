export type Cell = 'red' | 'yellow' | null;
export type Board = Cell[][];
export type WinningCell = { r: number; c: number };

export const ROWS = 6;
export const COLS = 7;

export const createEmptyBoard = (): Board =>
  Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(null));

export const getValidRow = (board: Board, col: number): number => {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (!board[r][col]) return r;
  }
  return -1;
};

export const getWinningCells = (
  board: Board,
  player: Exclude<Cell, null>,
): WinningCell[] | null => {
  const dirs = [
    { dr: 0, dc: 1 },
    { dr: 1, dc: 0 },
    { dr: 1, dc: 1 },
    { dr: 1, dc: -1 },
  ];

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] !== player) continue;
      for (const { dr, dc } of dirs) {
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

export const checkWinner = (
  board: Board,
  player: Exclude<Cell, null>,
): boolean => {
  const dirs = [
    { dr: 0, dc: 1 },
    { dr: 1, dc: 0 },
    { dr: 1, dc: 1 },
    { dr: 1, dc: -1 },
  ];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] !== player) continue;
      for (const { dr, dc } of dirs) {
        let count = 0;
        for (let i = 0; i < 4; i++) {
          const rr = r + dr * i;
          const cc = c + dc * i;
          if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) break;
          if (board[rr][cc] !== player) break;
          count++;
        }
        if (count === 4) return true;
      }
    }
  }
  return false;
};

export const isBoardFull = (board: Board): boolean => board[0].every(Boolean);

const evaluateWindow = (window: Cell[], player: Exclude<Cell, null>): number => {
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

const scorePosition = (board: Board, player: Exclude<Cell, null>): number => {
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
      score += evaluateWindow(
        [board[r][c], board[r + 1][c], board[r + 2][c], board[r + 3][c]],
        player,
      );
    }
  }
  for (let r = 0; r < ROWS - 3; r++) {
    for (let c = 0; c < COLS - 3; c++) {
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
  for (let r = 3; r < ROWS; r++) {
    for (let c = 0; c < COLS - 3; c++) {
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

const getValidLocations = (board: Board): number[] => {
  const locations: number[] = [];
  for (let c = 0; c < COLS; c++) {
    if (!board[0][c]) locations.push(c);
  }
  return locations;
};

const orderColumns = (cols: number[]): number[] => {
  const center = Math.floor(COLS / 2);
  return [...cols].sort(
    (a, b) => Math.abs(a - center) - Math.abs(b - center) || a - b,
  );
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

export const minimax = (
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  table: Map<string, { depth: number; score: number; column?: number }> = new Map(),
): { column?: number; score: number } => {
  const key = `${maximizing ? 'M' : 'm'}:${depth}:${hashBoard(board)}`;
  const cached = table.get(key);
  if (cached && cached.depth >= depth) {
    return { column: cached.column, score: cached.score };
  }

  const validLocations = getValidLocations(board);
  const isTerminal =
    checkWinner(board, 'red') ||
    checkWinner(board, 'yellow') ||
    validLocations.length === 0;
  if (depth === 0 || isTerminal) {
    let score = scorePosition(board, 'red');
    if (checkWinner(board, 'red')) score = 1000000;
    if (checkWinner(board, 'yellow')) score = -1000000;
    table.set(key, { depth, score });
    return { score };
  }
  if (maximizing) {
    let value = -Infinity;
    let column = validLocations[0];
    for (const col of orderColumns(validLocations)) {
      const row = getValidRow(board, col);
      const newBoard = board.map((r) => [...r]);
      newBoard[row][col] = 'red';
      const score = minimax(
        newBoard,
        depth - 1,
        alpha,
        beta,
        false,
        table,
      ).score;
      if (score > value) {
        value = score;
        column = col;
      }
      alpha = Math.max(alpha, value);
      if (alpha >= beta) break;
    }
    const result = { column, score: value };
    table.set(key, { depth, score: value, column });
    return result;
  }
  let value = Infinity;
  let column = validLocations[0];
  for (const col of orderColumns(validLocations)) {
    const row = getValidRow(board, col);
    const newBoard = board.map((r) => [...r]);
    newBoard[row][col] = 'yellow';
    const score = minimax(
      newBoard,
      depth - 1,
      alpha,
      beta,
      true,
      table,
    ).score;
    if (score < value) {
      value = score;
      column = col;
    }
    beta = Math.min(beta, value);
    if (alpha >= beta) break;
  }
  const result = { column, score: value };
  table.set(key, { depth, score: value, column });
  return result;
};

export const getBestMove = (
  board: Board,
  depth: number,
  player: 'red' | 'yellow',
): { column: number; scores: (number | null)[] } => {
  const valid = orderColumns(getValidLocations(board));
  const scores: (number | null)[] = Array(COLS).fill(null);
  let bestColumn = valid[0] ?? 0;
  let bestScore = player === 'red' ? -Infinity : Infinity;
  const table = new Map<string, { depth: number; score: number; column?: number }>();
  for (const col of valid) {
    const row = getValidRow(board, col);
    const newBoard = board.map((r) => [...r]);
    newBoard[row][col] = player;
    const score = minimax(
      newBoard,
      depth - 1,
      -Infinity,
      Infinity,
      player === 'yellow',
      table,
    ).score;
    scores[col] = score;
    if (player === 'red') {
      if (score > bestScore) {
        bestScore = score;
        bestColumn = col;
      }
    } else if (score < bestScore) {
      bestScore = score;
      bestColumn = col;
    }
  }
  return { column: bestColumn, scores };
};

export const evaluateColumns = (
  board: Board,
  player: 'red' | 'yellow',
): (number | null)[] => {
  const base = scorePosition(board, player);
  const scores: (number | null)[] = Array(COLS).fill(null);
  for (let c = 0; c < COLS; c++) {
    const row = getValidRow(board, c);
    if (row === -1) continue;
    const newBoard = board.map((r) => [...r]);
    newBoard[row][c] = player;
    scores[c] = scorePosition(newBoard, player) - base;
  }
  return scores;
};
