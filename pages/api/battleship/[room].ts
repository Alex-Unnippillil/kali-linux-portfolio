import type { NextApiRequest } from 'next';
import type { NextApiResponse } from 'next';
import { Server as IOServer } from 'socket.io';
import { randomizePlacement } from '../../../../components/apps/battleship/ai';

export const config = { api: { bodyParser: false } };

type NextApiResponseServerIO = NextApiResponse & {
  socket: NextApiResponse['socket'] & { server: { io?: IOServer } };
};

interface RoomState {
  ships: Set<number>;
}

const rooms: Record<string, RoomState> = {};

const getRoom = (room: string): RoomState => {
  if (!rooms[room]) {
    const layout = randomizePlacement();
    const ships = new Set<number>();
    layout.forEach((s: any) => s.cells.forEach((c: number) => ships.add(c)));
    rooms[room] = { ships };
  }
  return rooms[room];
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponseServerIO
) {
  if (!res.socket.server.io) {
    const io = new IOServer(res.socket.server, {
      path: '/api/battleship/socket.io',
    });

    io.on('connection', (socket) => {
      socket.on('join', (room: string) => {
        socket.join(room);
        getRoom(room);
      });

      socket.on(
        'salvo',
        ({ room, cells }: { room: string; cells: number[] }) => {
          const { ships } = getRoom(room);
          const results = cells.map((idx) => ({
            idx,
            hit: ships.has(idx),
          }));
          io.to(room).emit('update', { results });
        }
      );
    });

    res.socket.server.io = io;
  }
  res.end();
}
