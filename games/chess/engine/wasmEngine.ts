import { Chess } from "chess.js";

const pieceValues: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

const centerControlBonus: Record<string, number[][]> = {
  p: [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [5, 5, 10, 25, 25, 10, 5, 5],
    [0, 0, 0, 20, 20, 0, 0, 0],
    [5, -5, -10, 0, 0, -10, -5, 5],
    [5, 10, 10, -20, -20, 10, 10, 5],
    [0, 0, 0, 0, 0, 0, 0, 0],
  ],
  n: [
    [-50, -40, -30, -30, -30, -30, -40, -50],
    [-40, -20, 0, 0, 0, 0, -20, -40],
    [-30, 0, 10, 15, 15, 10, 0, -30],
    [-30, 5, 15, 20, 20, 15, 5, -30],
    [-30, 0, 15, 20, 20, 15, 0, -30],
    [-30, 5, 10, 15, 15, 10, 5, -30],
    [-40, -20, 0, 5, 5, 0, -20, -40],
    [-50, -40, -30, -30, -30, -30, -40, -50],
  ],
  b: [
    [-20, -10, -10, -10, -10, -10, -10, -20],
    [-10, 0, 0, 0, 0, 0, 0, -10],
    [-10, 0, 5, 10, 10, 5, 0, -10],
    [-10, 5, 5, 10, 10, 5, 5, -10],
    [-10, 0, 10, 10, 10, 10, 0, -10],
    [-10, 10, 10, 10, 10, 10, 10, -10],
    [-10, 5, 0, 0, 0, 0, 5, -10],
    [-20, -10, -10, -10, -10, -10, -10, -20],
  ],
  r: [
    [0, 0, 0, 5, 5, 0, 0, 0],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [5, 10, 10, 10, 10, 10, 10, 5],
    [0, 0, 0, 0, 0, 0, 0, 0],
  ],
  q: [
    [-20, -10, -10, -5, -5, -10, -10, -20],
    [-10, 0, 0, 0, 0, 0, 0, -10],
    [-10, 0, 5, 5, 5, 5, 0, -10],
    [-5, 0, 5, 5, 5, 5, 0, -5],
    [0, 0, 5, 5, 5, 5, 0, -5],
    [-10, 5, 5, 5, 5, 5, 0, -10],
    [-10, 0, 5, 0, 0, 0, 0, -10],
    [-20, -10, -10, -5, -5, -10, -10, -20],
  ],
  k: [
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-20, -30, -30, -40, -40, -30, -30, -20],
    [-10, -20, -20, -20, -20, -20, -20, -10],
    [20, 20, 0, 0, 0, 0, 20, 20],
    [20, 30, 10, 0, 0, 10, 30, 20],
  ],
};

export type DifficultyLevel = "beginner" | "intermediate" | "expert";

export type SuggestedMove = {
  from: string;
  to: string;
  san: string;
  evaluation: number;
};

const evaluateBoard = (game: Chess): number => {
  if (game.isCheckmate()) {
    return game.turn() === "w" ? -Infinity : Infinity;
  }
  if (game.isDraw()) {
    return 0;
  }

  const board = game.board();
  let score = 0;

  for (let row = 0; row < board.length; row += 1) {
    for (let col = 0; col < board[row].length; col += 1) {
      const piece = board[row][col];
      if (!piece) continue;
      const baseValue = pieceValues[piece.type] || 0;
      const table = centerControlBonus[piece.type] || [];
      const rowIndex = piece.color === "w" ? row : 7 - row;
      const positional = table[rowIndex]?.[col] || 0;
      const signed = baseValue + positional;
      score += piece.color === "w" ? signed : -signed;
    }
  }

  return score;
};

const scoreMoveOrdering = (move: { captured?: string; promotion?: string }): number => {
  const captureScore = move.captured ? (pieceValues[move.captured] || 0) : 0;
  const promotionScore = move.promotion ? (pieceValues[move.promotion] || 0) : 0;
  return captureScore * 10 + promotionScore;
};

const minimax = (
  game: Chess,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
): number => {
  if (depth === 0 || game.isGameOver()) return evaluateBoard(game);

  const moves = game
    .moves({ verbose: true })
    .slice()
    .sort((a, b) => scoreMoveOrdering(b) - scoreMoveOrdering(a));

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

const openingBook: Record<string, SuggestedMove[]> = {
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1": [
    { from: "e2", to: "e4", san: "e4", evaluation: 0 },
    { from: "d2", to: "d4", san: "d4", evaluation: 0 },
    { from: "c2", to: "c4", san: "c4", evaluation: 0 },
    { from: "g1", to: "f3", san: "Nf3", evaluation: 0 },
  ],
  "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1": [
    { from: "c7", to: "c5", san: "c5", evaluation: 0 },
    { from: "e7", to: "e5", san: "e5", evaluation: 0 },
    { from: "e7", to: "e6", san: "e6", evaluation: 0 },
    { from: "c7", to: "c6", san: "c6", evaluation: 0 },
  ],
  "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1": [
    { from: "d7", to: "d5", san: "d5", evaluation: 0 },
    { from: "g8", to: "f6", san: "Nf6", evaluation: 0 },
    { from: "e7", to: "e6", san: "e6", evaluation: 0 },
    { from: "g8", to: "h6", san: "Nh6", evaluation: 0 },
  ],
};

type SuggestOptions = {
  difficulty?: DifficultyLevel;
};

export const suggestMoves = (
  fen: string,
  depth = 2,
  maxSuggestions = 3,
  options: SuggestOptions = {},
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
    const score = minimax(game, depth - 1, -Infinity, Infinity, game.turn() === "w");
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

  if (options.difficulty === "beginner") {
    return suggestions.slice(0, Math.max(2, maxSuggestions));
  }

  if (options.difficulty === "intermediate") {
    return suggestions.slice(0, Math.max(3, maxSuggestions));
  }

  return suggestions.slice(0, maxSuggestions);
};
