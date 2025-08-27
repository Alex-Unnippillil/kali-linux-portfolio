export const WIDTH = 10;
export const HEIGHT = 20;

export const createBoard = () =>
  Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(0));

export const merge = (board: any[][], shape: number[][], x: number, y: number, type: any = 1) => {
  const newBoard = board.map((row) => row.slice());
  for (let r = 0; r < shape.length; r += 1) {
    for (let c = 0; c < shape[r].length; c += 1) {
      if (shape[r][c]) newBoard[y + r][x + c] = type;
    }
  }
  return newBoard;
};

export const clearLines = (board: any[][]) => {
  const filled: number[] = [];
  for (let r = 0; r < HEIGHT; r += 1) {
    if (board[r].every((c) => c)) filled.push(r);
  }
  if (!filled.length) return { board: board.map((r) => r.slice()), lines: 0 };
  const compact = board.filter((_, r) => !filled.includes(r));
  while (compact.length < HEIGHT) compact.unshift(Array(WIDTH).fill(0));
  return { board: compact, lines: filled.length };
};

export const checkTSpin = (
  board: any[][],
  piece: { type: string },
  pos: { x: number; y: number },
  rotated: boolean
) => {
  if (!rotated || piece.type !== 'T') return false;
  const px = pos.x + 1;
  const py = pos.y + 1;
  const corners = [
    [px - 1, py - 1],
    [px + 1, py - 1],
    [px - 1, py + 1],
    [px + 1, py + 1],
  ];
  let filled = 0;
  for (const [cx, cy] of corners) {
    if (cy < 0 || cy >= HEIGHT || cx < 0 || cx >= WIDTH || board[cy][cx]) filled += 1;
  }
  return filled >= 3;
};

export const attemptHold = (
  piece: any,
  hold: any,
  next: any,
  canHold: boolean
) => {
  if (!canHold) return { piece, hold, next, canHold };
  if (hold) return { piece: hold, hold: piece, next, canHold: false };
  return { piece: next, hold: piece, next: null, canHold: false };
};
