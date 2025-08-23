import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 3001 });

wss.on('connection', (ws: any) => {
  ws.on('message', (data: any) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'attack') {
        wss.clients.forEach((client: any) => {
          if (client !== ws && client.readyState === 1) {
            client.send(JSON.stringify({ type: 'garbage', lines: msg.lines }));
          }
        });
      }
    } catch {
      // ignore
    }
  });
});
