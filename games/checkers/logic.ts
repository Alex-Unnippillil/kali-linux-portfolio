import {
  Board,
  Move,
  Color,
  getPieceMoves,
  getAllMoves,
  applyMove,
  evaluateBoard,
} from '@/components/apps/checkers/engine';

export const getSelectableMoves = (
  board: Board,
  r: number,
  c: number,
  enforceCapture = true,
): Move[] => {
  const piece = board[r][c];
  if (!piece) return [];
  const pieceMoves = getPieceMoves(board, r, c, enforceCapture);
  const allMoves = getAllMoves(board, piece.color, enforceCapture);
  const mustCapture = enforceCapture && allMoves.some((m) => m.captured);
  return mustCapture ? pieceMoves.filter((m) => m.captured) : pieceMoves;
};

export const getHintMove = (
  board: Board,
  color: Color,
  enforceCapture = true,
): Move | null => {
  const moves = getAllMoves(board, color, enforceCapture);
  if (!moves.length) return null;
  let best = moves[0];
  let bestScore = color === 'red' ? -Infinity : Infinity;
  for (const move of moves) {
    const { board: newBoard } = applyMove(board, move);
    const score = evaluateBoard(newBoard);
    if (color === 'red') {
      if (score > bestScore) {
        bestScore = score;
        best = move;
      }
    } else if (score < bestScore) {
      bestScore = score;
      best = move;
    }
  }
  return best;
};
