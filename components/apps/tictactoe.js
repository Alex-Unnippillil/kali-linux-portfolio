import TicTacToe, {
  checkWinner as rawCheckWinner,
  minimax as baseMinimax,
} from '../../apps/tic-tac-toe';

const inferSize = (board) => Math.sqrt(board.length);

const minimax = (board, player) =>
  baseMinimax(board.slice(), player, inferSize(board));

const checkWinner = (board) => rawCheckWinner(board, inferSize(board));

export default TicTacToe;
export { checkWinner, minimax };

