import { Board, Player, checkWinner } from './logic';

const boardKey = (board: Board): string => board.map((c) => c || '-').join('');

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

export default minimax;

