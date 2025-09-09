import { minimax, Board, Player } from '../apps/games/tictactoe/logic';

type Request = {
  board: Board;
  player: Player;
  size: number;
  misere: boolean;
};

self.onmessage = (e: MessageEvent<Request>) => {
  const { board, player, size, misere } = e.data;
  const { index } = minimax(board.slice(), player, size, misere);
  (self as any).postMessage({ index });
};

export {};
