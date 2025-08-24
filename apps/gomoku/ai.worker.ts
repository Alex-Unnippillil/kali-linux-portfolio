/* eslint-disable no-restricted-globals */
import {
  applyMove,
  checkWin,
  generateMoves,
  Board,
  Player,
  Move,
  OpeningRule,
} from './engine';

interface SearchRequest {
  board: Board;
  player: Player;
  maxDepth: number;
  capture: boolean;
  rule: OpeningRule;
}

interface PNResult {
  proof: number;
  disproof: number;
  move?: Move;
}

const pns = (
  board: Board,
  player: Player,
  depth: number,
  capture: boolean,
  rule: OpeningRule,
): PNResult => {
  const opponent = (player === Player.Black ? Player.White : Player.Black) as Player;
  if (checkWin(board, opponent)) return { proof: Infinity, disproof: 0 };
  if (checkWin(board, player)) return { proof: 0, disproof: Infinity };
  if (depth === 0) return { proof: 1, disproof: 1 };
  let bestMove: Move | undefined;
  let minDisproof = Infinity;
  let proofSum = 0;
  const moves = generateMoves(board, player, rule);
  for (const m of moves) {
    const { board: nb } = applyMove(board, m, player, capture);
    const { proof, disproof } = pns(nb, opponent, depth - 1, capture, rule);
    proofSum += proof;
    if (disproof < minDisproof) {
      minDisproof = disproof;
      bestMove = m;
    }
    if (minDisproof === 0) break;
  }
  return { proof: minDisproof, disproof: proofSum, move: bestMove };
};

const iterativeDeepeningPNS = (
  board: Board,
  maxDepth: number,
  player: Player,
  capture: boolean,
  rule: OpeningRule,
): Move | null => {
  let best: Move | null = null;
  for (let d = 1; d <= maxDepth; d += 1) {
    const { move } = pns(board, player, d, capture, rule);
    if (move) best = move;
  }
  return best;
};

self.onmessage = (e: MessageEvent<SearchRequest>) => {
  const { board, player, maxDepth, capture, rule } = e.data;
  const move = iterativeDeepeningPNS(board, maxDepth, player, capture, rule);
  (self as any).postMessage(move);
};
