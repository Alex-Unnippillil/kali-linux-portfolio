export type Player = 'X' | 'O';
export type Cell = Player | null;
export type Board = Cell[];

const boardKey = (board: Board): string => board.map((c) => c || '-').join('');

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

const memo = new Map<string, { score: number; index?: number }>();

export const minimax = (
  board: Board,
  player: Player,
  size = Math.sqrt(board.length),
  misere = false,
  depth = 0,
): { index: number; score: number } => {
  const winner = checkWinner(board, size, misere).winner;
  if (winner === 'O') return { score: 10 - depth, index: -1 };
  if (winner === 'X') return { score: depth - 10, index: -1 };
  if (winner === 'draw') return { score: 0, index: -1 };

  const key = player + (misere ? 'M' : 'N') + boardKey(board);
  const cached = memo.get(key);
  if (cached && cached.index !== undefined) return cached as any;

  let best: { index: number; score: number } = {
    index: -1,
    score: player === 'O' ? -Infinity : Infinity,
  };
  for (let i = 0; i < board.length; i++) {
    if (!board[i]) {
      board[i] = player;
      const result = minimax(
        board,
        player === 'O' ? 'X' : 'O',
        size,
        misere,
        depth + 1,
      );
      board[i] = null;
      if (player === 'O') {
        if (result.score > best.score) best = { index: i, score: result.score };
      } else if (result.score < best.score) {
        best = { index: i, score: result.score };
      }
    }
  }
  memo.set(key, best);
  return best;
};

export const createBoard = (size: number): Board =>
  Array(size * size).fill(null);
