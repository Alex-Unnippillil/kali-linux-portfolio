import type { NextApiRequest } from 'next';
import { Server } from 'socket.io';
import {
  applyMove,
  getAllMoves,
  createConfig,
  createBoard,
  Move,
  Board,
  Config,
  Color,
} from '../../../apps/checkers/engine';

type GameState = { board: Board; turn: Color; config: Config };
const games: Record<string, GameState> = {};

export default function handler(req: NextApiRequest, res: any) {
  if (!res.socket.server.io) {
    const io = new Server(res.socket.server, { path: '/api/checkers/socket' });
    res.socket.server.io = io;

    io.on('connection', (socket) => {
      socket.on('join', ({ gameId, variant }) => {
        const config = createConfig(variant || 'standard');
        if (!games[gameId]) {
          games[gameId] = {
            board: createBoard(config),
            turn: 'red',
            config,
          };
        }
        socket.join(gameId);
        socket.emit('state', games[gameId]);
      });

      socket.on('move', ({ gameId, move }) => {
        const game = games[gameId];
        if (!game) return;
        const moves = getAllMoves(game.board, game.turn, game.config);
        const valid = moves.find(
          (m) =>
            m.from[0] === move.from[0] &&
            m.from[1] === move.from[1] &&
            m.to[0] === move.to[0] &&
            m.to[1] === move.to[1]
        );
        if (!valid) return;
        const { board } = applyMove(game.board, move, game.config);
        game.board = board;
        game.turn = game.turn === 'red' ? 'black' : 'red';
        io.to(gameId).emit('state', { board: game.board, turn: game.turn });
      });

      socket.on('undo', ({ gameId }) => {
        const game = games[gameId];
        if (!game) return;
        games[gameId] = {
          board: createBoard(game.config),
          turn: 'red',
          config: game.config,
        };
        io.to(gameId).emit('state', games[gameId]);
      });
    });
  }
  res.end();
}

export const config = {
  api: {
    bodyParser: false,
  },
};
