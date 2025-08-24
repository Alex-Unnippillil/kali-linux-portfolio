import { Board, Color, Config, findBestMove, Move } from './engine';

self.onmessage = (
  e: MessageEvent<{
    board: Board;
    color: Color;
    config: Config;
    maxDepth: number;
    timeLimit: number;
  }>
) => {
  const { board, color, config, maxDepth, timeLimit } = e.data;
  const move: Move | null = findBestMove(board, color, config, {
    maxDepth,
    timeLimit,
  });
  (self as unknown as Worker).postMessage(move);
};
