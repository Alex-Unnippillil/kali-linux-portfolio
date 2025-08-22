import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    // broadcast state to all other clients
    for (const client of wss.clients) {
      if (client !== ws && client.readyState === 1) {
        client.send(data.toString());
      }
    }
  });
});

console.log('Pong WebSocket server running on :8080');
