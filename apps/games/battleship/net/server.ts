import { WebSocketServer, WebSocket } from 'ws';

export interface StartMessage {
  type: 'start';
  player: 1 | 2;
}

export interface MoveMessage {
  type: 'move';
  index: number;
}

export interface EndMessage {
  type: 'end';
}

export type Message = StartMessage | MoveMessage | EndMessage;

/**
 * Creates a simple matchmaking WebSocket server for Battleship.
 * Players connect and are paired in the order they arrive. Moves sent by one
 * player are forwarded to their opponent to keep both boards in sync.
 */
export function createMatchmakingServer(port = 0) {
  const wss = new WebSocketServer({ port });

  let waiting: WebSocket | null = null;
  const pairs = new Map<WebSocket, WebSocket>();

  wss.on('connection', (ws: WebSocket) => {
    // Pair with a waiting player or wait for an opponent.
    if (waiting) {
      const opp = waiting;
      waiting = null;
      pairs.set(ws, opp);
      pairs.set(opp, ws);
      opp.send(JSON.stringify({ type: 'start', player: 1 } as StartMessage));
      ws.send(JSON.stringify({ type: 'start', player: 2 } as StartMessage));
    } else {
      waiting = ws;
    }

    ws.on('message', (data) => {
      let msg: Message;
      try {
        msg = JSON.parse(data.toString());
      } catch {
        return;
      }
      if (msg.type === 'move') {
        const opp = pairs.get(ws);
        if (opp && opp.readyState === WebSocket.OPEN) {
          opp.send(JSON.stringify({ type: 'move', index: msg.index } as MoveMessage));
        }
      }
    });

    const cleanup = () => {
      const opp = pairs.get(ws);
      pairs.delete(ws);
      if (opp) {
        pairs.delete(opp);
        if (opp.readyState === WebSocket.OPEN) {
          opp.send(JSON.stringify({ type: 'end' } as EndMessage));
        }
      } else if (waiting === ws) {
        waiting = null;
      }
    };

    ws.on('close', cleanup);
    ws.on('error', cleanup);
  });

  return wss;
}
