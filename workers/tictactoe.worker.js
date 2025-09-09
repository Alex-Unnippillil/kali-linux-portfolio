import { minimax } from '../apps/games/tictactoe/logic';

self.onmessage = (e) => {
  const { board, player, size, misere } = e.data;
  const { index } = minimax(board.slice(), player, size, misere);
  self.postMessage({ index });
};

export {};
