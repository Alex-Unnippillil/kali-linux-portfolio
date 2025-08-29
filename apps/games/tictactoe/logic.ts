export type Player = 'X' | 'O';
export type Cell = Player | null;
export type Board = Cell[];

const generateLines = (size: number): number[][] => {
  const lines: number[][] = [];
  // rows
  for (let r = 0; r < size; r++) {
    const start = r * size;
    lines.push(Array.from({ length: size }, (_, c) => start + c));
  }
  // columns
  for (let c = 0; c < size; c++) {
    lines.push(Array.from({ length: size }, (_, r) => r * size + c));
  }
  // diagonals
  lines.push(Array.from({ length: size }, (_, i) => i * size + i));
  lines.push(Array.from({ length: size }, (_, i) => i * size + (size - 1 - i)));
  return lines;
};

export const checkWinner = (
  board: Board,
  size = Math.sqrt(board.length),
  misere = false,
): { winner: Player | 'draw' | null; line: number[] } => {
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

export const createBoard = (size: number): Board =>
  Array(size * size).fill(null);

export { minimax } from './ai';
