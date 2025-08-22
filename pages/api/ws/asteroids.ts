import { WebSocketServer } from 'ws';
import type { NextApiRequest, NextApiResponse } from 'next';

const leaderboard: { name: string; score: number }[] = [];
const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (ws) => {
  const id = Math.random().toString(36).slice(2);
  ws.send(JSON.stringify({ type: 'welcome', id, leaderboard }));
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.type === 'state') {
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === client.OPEN) {
            client.send(message.toString());
          }
        });
      } else if (data.type === 'score') {
        leaderboard.push({ name: data.name, score: data.score });
        leaderboard.sort((a, b) => b.score - a.score);
        leaderboard.splice(10);
        const lb = JSON.stringify({ type: 'leaderboard', leaderboard });
        wss.clients.forEach((client) => {
          if (client.readyState === client.OPEN) client.send(lb);
        });
      }
    } catch (e) {
      // ignore malformed messages
    }
  });
});

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!res.socket.server.asteroidsWSS) {
    res.socket.server.asteroidsWSS = wss;
    res.socket.server.on('upgrade', (req, socket, head) => {
      if (req.url === '/api/ws/asteroids') {
        wss.handleUpgrade(req, socket as any, head, (ws) => {
          wss.emit('connection', ws, req);
        });
      }
    });
  }
  res.end();
}

export const config = {
  api: {
    bodyParser: false,
  },
};
