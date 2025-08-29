import { Chess } from "chess.js";

const pieceValues: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

const evaluateBoard = (game: Chess): number => {
  const board = game.board();
  let score = 0;
  for (const row of board) {
    for (const piece of row) {
      if (piece) {
        const value = pieceValues[piece.type];
        score += piece.color === "w" ? value : -value;
      }
    }
  }
  return score;
};

const minimax = (
  game: Chess,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
): number => {
  if (depth === 0 || game.isGameOver()) return evaluateBoard(game);

  const moves = game.moves({ verbose: true });

  if (maximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      game.move(move);
      const score = minimax(game, depth - 1, alpha, beta, false);
      game.undo();
      maxEval = Math.max(maxEval, score);
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break;
    }
    return maxEval;
  }

  let minEval = Infinity;
  for (const move of moves) {
    game.move(move);
    const score = minimax(game, depth - 1, alpha, beta, true);
    game.undo();
    minEval = Math.min(minEval, score);
    beta = Math.min(beta, score);
    if (beta <= alpha) break;
  }
  return minEval;
};

export type SuggestedMove = {
  from: string;
  to: string;
  san: string;
  evaluation: number;
};

const openingBook: Record<string, SuggestedMove[]> = {
  // Starting position
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1": [
    { from: "e2", to: "e4", san: "e4", evaluation: 0 },
    { from: "d2", to: "d4", san: "d4", evaluation: 0 },
    { from: "c2", to: "c4", san: "c4", evaluation: 0 },
    { from: "g1", to: "f3", san: "Nf3", evaluation: 0 },
  ],
  // After 1.e4
  "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1": [
    { from: "c7", to: "c5", san: "c5", evaluation: 0 },
    { from: "e7", to: "e5", san: "e5", evaluation: 0 },
    { from: "e7", to: "e6", san: "e6", evaluation: 0 },
    { from: "c7", to: "c6", san: "c6", evaluation: 0 },
  ],
  // After 1.d4
  "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1": [
    { from: "d7", to: "d5", san: "d5", evaluation: 0 },
    { from: "g8", to: "f6", san: "Nf6", evaluation: 0 },
    { from: "e7", to: "e6", san: "e6", evaluation: 0 },
    { from: "g8", to: "h6", san: "Nh6", evaluation: 0 },
  ],
};

export const suggestMoves = (
  fen: string,
  depth = 2,
  maxSuggestions = 3,
): SuggestedMove[] => {
  const game = new Chess(fen);
  const fenKey = game.fen();
  if (openingBook[fenKey]) {
    return openingBook[fenKey].slice(0, maxSuggestions);
  }
  const maximizing = game.turn() === "w";
  const moves = game.moves({ verbose: true });
  const suggestions: SuggestedMove[] = [];

  for (const move of moves) {
    game.move(move);
    const score = minimax(
      game,
      depth - 1,
      -Infinity,
      Infinity,
      game.turn() === "w",
    );
    game.undo();
    const evaluation = maximizing ? score : -score;
    suggestions.push({
      from: move.from,
      to: move.to,
      san: move.san,
      evaluation,
    });
  }

  suggestions.sort((a, b) => b.evaluation - a.evaluation);
  return suggestions.slice(0, maxSuggestions);
};
