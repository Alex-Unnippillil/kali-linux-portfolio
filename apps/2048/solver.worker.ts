import { moveBoard, isGameOver, Direction } from './engine';

const dirs: Direction[] = ['up', 'down', 'left', 'right'];

const heuristic = (board: number[]): number => {
  const size = Math.sqrt(board.length);
  let empty = 0;
  let smooth = 0;
  let mono = 0;
  let max = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const v = board[r * size + c];
      if (v === 0) empty++;
      if (v > max) max = v;
      if (c < size - 1) smooth -= Math.abs(v - board[r * size + c + 1]);
      if (r < size - 1) smooth -= Math.abs(v - board[(r + 1) * size + c]);
    }
  }
  // monotonicity
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size - 1; c++) {
      if (board[r * size + c] >= board[r * size + c + 1]) mono += 1;
    }
  }
  for (let c = 0; c < size; c++) {
    for (let r = 0; r < size - 1; r++) {
      if (board[r * size + c] >= board[(r + 1) * size + c]) mono += 1;
    }
  }
  return empty * 100 + mono * 1 + smooth * 0.1 + Math.log2(max) * 10;
};

const expectimax = (board: number[], depth: number, player: boolean): number => {
  if (depth === 0 || isGameOver(board)) return heuristic(board);
  if (player) {
    let maxScore = -Infinity;
    for (const dir of dirs) {
      const { board: b } = moveBoard(board, dir);
      if (b.every((v, i) => v === board[i])) continue;
      const score = expectimax(b, depth - 1, false);
      if (score > maxScore) maxScore = score;
    }
    return maxScore === -Infinity ? heuristic(board) : maxScore;
  }
  const empty: number[] = [];
  board.forEach((v, i) => v === 0 && empty.push(i));
  let total = 0;
  for (const idx of empty) {
    const b2 = board.slice();
    b2[idx] = 2;
    total += 0.9 / empty.length * expectimax(b2, depth - 1, true);
    const b4 = board.slice();
    b4[idx] = 4;
    total += 0.1 / empty.length * expectimax(b4, depth - 1, true);
  }
  return total;
};

const bestMove = (board: number[], depth: number, timeout: number): Direction => {
  const start = Date.now();
  let bestDir: Direction = 'up';
  let best = -Infinity;
  for (const dir of dirs) {
    const { board: b } = moveBoard(board, dir);
    if (b.every((v, i) => v === board[i])) continue;
    const score = expectimax(b, depth - 1, false);
    if (score > best) {
      best = score;
      bestDir = dir;
    }
    if (Date.now() - start > timeout) break;
  }
  return bestDir;
};

self.onmessage = (e: MessageEvent) => {
  const { board, depth = 4, timeout = 200 } = e.data as {
    board: number[];
    depth: number;
    timeout: number;
  };
  const dir = bestMove(board, depth, timeout);
  (self as unknown as Worker).postMessage(dir);
};
