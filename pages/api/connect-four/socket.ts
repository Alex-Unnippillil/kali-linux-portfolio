import type { NextApiRequest, NextApiResponse } from 'next';
import { Server } from 'ws';

export const config = { api: { bodyParser: false } };

type ExtWebSocket = WebSocket & { room?: string };

let wss: Server | null = null;
const rooms = new Map<string, Set<ExtWebSocket>>();

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!wss) {
    const server = res.socket.server as any;
    wss = new Server({ noServer: true });
    server.on('upgrade', (request, socket, head) => {
      if (request.url === '/api/connect-four/socket') {
        wss!.handleUpgrade(request, socket, head, (ws) => {
          wss!.emit('connection', ws, request);
        });
      }
    });

    wss.on('connection', (ws: ExtWebSocket) => {
      ws.on('message', (msg: any) => {
        try {
          const data = JSON.parse(msg.toString());
          if (data.type === 'join') {
            ws.room = data.room;
            if (!rooms.has(data.room)) rooms.set(data.room, new Set());
            rooms.get(data.room)!.add(ws);
          } else if (data.type === 'move') {
            const set = ws.room ? rooms.get(ws.room) : null;
            set?.forEach((client) => {
              if (client !== ws && client.readyState === 1) {
                client.send(JSON.stringify({ type: 'move', col: data.col }));
              }
            });
          } else if (data.type === 'reset') {
            const set = ws.room ? rooms.get(ws.room) : null;
            set?.forEach((client) => {
              if (client.readyState === 1) client.send(JSON.stringify({ type: 'reset' }));
            });
          }
        } catch {
          // ignore
        }
      });

      ws.on('close', () => {
        const set = ws.room ? rooms.get(ws.room) : null;
        set?.delete(ws);
        if (set && set.size === 0 && ws.room) rooms.delete(ws.room);
      });
    });
  }
  res.end();
}

