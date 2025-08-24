export const SIZE = 15;
export const WIN = 5;

export enum Player {
  Black = 1,
  White = -1,
}

export enum OpeningRule {
  FreeStyle = 'freestyle',
  Standard = 'standard',
}

export type Board = Int8Array;

export interface Move {
  x: number;
  y: number;
}

export const index = (x: number, y: number) => y * SIZE + x;

export const createBoard = (): Board => new Int8Array(SIZE * SIZE);

const cloneBoard = (board: Board): Board => Int8Array.from(board);

const inBounds = (x: number, y: number) => x >= 0 && x < SIZE && y >= 0 && y < SIZE;

export const applyMove = (
  board: Board,
  move: Move,
  player: Player,
  capture = false,
): { board: Board; captured: number } => {
  const b = cloneBoard(board);
  const idx = index(move.x, move.y);
  b[idx] = player;
  let captured = 0;
  if (capture) {
    const dirs = [
      [1, 0],
      [0, 1],
      [1, 1],
      [1, -1],
    ];
    for (const [dx, dy] of dirs) {
      const x1 = move.x + dx;
      const y1 = move.y + dy;
      const x2 = move.x + 2 * dx;
      const y2 = move.y + 2 * dy;
      const x3 = move.x + 3 * dx;
      const y3 = move.y + 3 * dy;
      if (inBounds(x3, y3)) {
        const i1 = index(x1, y1);
        const i2 = index(x2, y2);
        const i3 = index(x3, y3);
        if (b[i1] === -player && b[i2] === -player && b[i3] === player) {
          b[i1] = 0;
          b[i2] = 0;
          captured += 2;
        }
      }
      const xm1 = move.x - dx;
      const ym1 = move.y - dy;
      const xm2 = move.x - 2 * dx;
      const ym2 = move.y - 2 * dy;
      const xm3 = move.x - 3 * dx;
      const ym3 = move.y - 3 * dy;
      if (inBounds(xm3, ym3)) {
        const j1 = index(xm1, ym1);
        const j2 = index(xm2, ym2);
        const j3 = index(xm3, ym3);
        if (b[j1] === -player && b[j2] === -player && b[j3] === player) {
          b[j1] = 0;
          b[j2] = 0;
          captured += 2;
        }
      }
    }
  }
  return { board: b, captured };
};

export const checkWin = (board: Board, player: Player): boolean => {
  const dirs = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ];
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      if (board[index(x, y)] !== player) continue;
      for (const [dx, dy] of dirs) {
        let count = 1;
        let cx = x + dx;
        let cy = y + dy;
        while (inBounds(cx, cy) && board[index(cx, cy)] === player) {
          count += 1;
          cx += dx;
          cy += dy;
        }
        if (count >= WIN) return true;
      }
    }
  }
  return false;
};

export const checkWinFast = (board: Board, move: Move, player: Player): boolean => {
  const dirs = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ];
  for (const [dx, dy] of dirs) {
    let count = 1;
    let cx = move.x + dx;
    let cy = move.y + dy;
    while (inBounds(cx, cy) && board[index(cx, cy)] === player) {
      count += 1;
      cx += dx;
      cy += dy;
    }
    cx = move.x - dx;
    cy = move.y - dy;
    while (inBounds(cx, cy) && board[index(cx, cy)] === player) {
      count += 1;
      cx -= dx;
      cy -= dy;
    }
    if (count >= WIN) return true;
  }
  return false;
};

function evaluateLine(line: Int8Array, player: Player): number {
  let score = 0;
  const opp = -player;
  let i = 0;
  const len = line.length;
  while (i < len) {
    if (line[i] === player) {
      let cnt = 1;
      let j = i + 1;
      while (j < len && line[j] === player) {
        cnt += 1;
        j += 1;
      }
      const left = i - 1 >= 0 ? line[i - 1] : opp;
      const right = j < len ? line[j] : opp;
      if (cnt >= 5) score += 100000;
      else if (cnt === 4) {
        if (left === 0 && right === 0) score += 10000; // open four
        else if (left === 0 || right === 0) score += 1000; // closed four
      } else if (cnt === 3) {
        if (left === 0 && right === 0) score += 100; // open three
        else if (left === 0 || right === 0) score += 10; // closed three
      }
      i = j;
    } else {
      i += 1;
    }
  }
  return score;
}

export const evaluate = (board: Board, player: Player): number => {
  const opp = -player;
  let score = 0;
  for (let y = 0; y < SIZE; y += 1) {
    const row = board.subarray(y * SIZE, y * SIZE + SIZE);
    score += evaluateLine(row, player);
    score -= evaluateLine(row, opp);
  }
  for (let x = 0; x < SIZE; x += 1) {
    const col = new Int8Array(SIZE);
    for (let y = 0; y < SIZE; y += 1) col[y] = board[index(x, y)];
    score += evaluateLine(col, player);
    score -= evaluateLine(col, opp);
  }
  for (let k = 0; k <= 2 * (SIZE - 1); k += 1) {
    const diag: number[] = [];
    for (let y = 0; y < SIZE; y += 1) {
      const x = k - y;
      if (x >= 0 && x < SIZE) diag.push(board[index(x, y)]);
    }
    if (diag.length >= 5) {
      const arr = Int8Array.from(diag);
      score += evaluateLine(arr, player);
      score -= evaluateLine(arr, opp);
    }
  }
  for (let k = -(SIZE - 1); k <= SIZE - 1; k += 1) {
    const diag: number[] = [];
    for (let y = 0; y < SIZE; y += 1) {
      const x = y + k;
      if (x >= 0 && x < SIZE) diag.push(board[index(x, y)]);
    }
    if (diag.length >= 5) {
      const arr = Int8Array.from(diag);
      score += evaluateLine(arr, player);
      score -= evaluateLine(arr, opp);
    }
  }
  return score;
};

export const generateMoves = (
  board: Board,
  player: Player,
  rule: OpeningRule = OpeningRule.FreeStyle,
): Move[] => {
  const moves: Move[] = [];
  let filled = false;
  let stones = 0;
  for (let i = 0; i < board.length; i += 1) {
    if (board[i] !== 0) {
      filled = true;
      stones += 1;
    }
  }
  const c = Math.floor(SIZE / 2);
  if (!filled) {
    return [{ x: c, y: c }];
  }
  const seen = new Set<number>();
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      if (board[index(x, y)] !== 0) {
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            const nx = x + dx;
            const ny = y + dy;
            if (!inBounds(nx, ny)) continue;
            const idx = index(nx, ny);
            if (board[idx] === 0 && !seen.has(idx)) {
              seen.add(idx);
              moves.push({ x: nx, y: ny });
            }
          }
        }
      }
    }
  }
  if (rule === OpeningRule.Standard && stones === 1) {
    return moves.filter(
      (m) => Math.max(Math.abs(m.x - c), Math.abs(m.y - c)) > 2,
    );
  }
  const scored = moves.map((m) => {
    const { board: nb } = applyMove(board, m, player);
    const score = evaluate(nb, player);
    return { m, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.m);
};

interface SearchResult {
  score: number;
  move?: Move;
}

interface TTEntry {
  score: number;
  depth: number;
  move?: Move;
}

export const minimax = (
  board: Board,
  depth: number,
  player: Player,
  alpha = -Infinity,
  beta = Infinity,
  capture = false,
  rule: OpeningRule = OpeningRule.FreeStyle,
  tt: Map<string, TTEntry> = new Map(),
  killer: Move[][] = [],
  ply = 0,
): SearchResult => {
  const key = board.toString();
  const ttEntry = tt.get(key);
  if (ttEntry && ttEntry.depth >= depth) return { score: ttEntry.score, move: ttEntry.move };
  if (depth === 0) {
    const sc = evaluate(board, player);
    tt.set(key, { score: sc, depth });
    return { score: sc };
  }
  const moves = generateMoves(board, player, rule);
  const killerMove = killer[ply]?.[0];
  moves.sort((a, b) => {
    if (killerMove && a.x === killerMove.x && a.y === killerMove.y) return -1;
    if (killerMove && b.x === killerMove.x && b.y === killerMove.y) return 1;
    return 0;
  });
  let bestScore = -Infinity;
  let bestMove: Move | undefined;
  for (const m of moves) {
    const { board: nb } = applyMove(board, m, player, capture);
    const { score } = minimax(
      nb,
      depth - 1,
      -player,
      -beta,
      -alpha,
      capture,
      rule,
      tt,
      killer,
      ply + 1,
    );
    const val = -score;
    if (val > bestScore) {
      bestScore = val;
      bestMove = m;
    }
    if (val > alpha) alpha = val;
    if (alpha >= beta) {
      if (!killer[ply]) killer[ply] = [];
      killer[ply][0] = m;
      break;
    }
  }
  tt.set(key, { score: bestScore, depth, move: bestMove });
  return { score: bestScore, move: bestMove };
};

export const iterativeDeepening = (
  board: Board,
  maxDepth: number,
  player: Player,
  capture = false,
  rule: OpeningRule = OpeningRule.FreeStyle,
): Move | null => {
  const killer: Move[][] = [];
  const tt = new Map<string, TTEntry>();
  let best: Move | null = null;
  for (let d = 1; d <= maxDepth; d += 1) {
    const { move } = minimax(
      board,
      d,
      player,
      -Infinity,
      Infinity,
      capture,
      rule,
      tt,
      killer,
      0,
    );
    if (move) best = move;
  }
  return best;
};

