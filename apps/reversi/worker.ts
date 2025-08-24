import { getMoves, makeMove, negamax, bitIndex } from './engine';

self.onmessage = (e: MessageEvent<{ player: bigint; opponent: bigint; depth: number }>) => {
  const { player, opponent, depth } = e.data;
  const moves = getMoves(player, opponent);
  const scores: Record<number, number> = {};
  let bestMove = 0n;
  let bestScore = -Infinity;
  let m = moves;
  while (m) {
    const move = m & -m;
    const { player: np, opponent: no } = makeMove(player, opponent, move);
    const { score } = negamax(no, np, depth - 1);
    const val = -score;
    const idx = bitIndex(move);
    scores[idx] = val;
    if (val > bestScore) {
      bestScore = val;
      bestMove = move;
    }
    m ^= move;
  }
  (self as unknown as Worker).postMessage({ scores, bestMove });
};
