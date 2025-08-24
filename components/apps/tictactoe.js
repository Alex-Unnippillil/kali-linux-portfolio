import TicTacToe, {
  checkWinner as rawCheckWinner,
  negamax,
} from '../../apps/tic-tac-toe';

const inferSize = (board) => Math.sqrt(board.length);

const minimax = (board, player) =>
  negamax(board.slice(), player, inferSize(board));

const checkWinner = (board) => rawCheckWinner(board, inferSize(board));

export default TicTacToe;
export { checkWinner, minimax, negamax };

