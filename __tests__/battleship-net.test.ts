/**
 * @jest-environment node
 */

import WebSocket from 'ws';
import { once } from 'events';
import { createMatchmakingServer } from '../apps/games/battleship/net/server';

describe('battleship matchmaking server', () => {
  test.skip('pairs players and relays moves', async () => {
    const server = createMatchmakingServer(0);
    await once(server, 'listening');
    const { port } = server.address() as any;
    const url = `ws://localhost:${port}`;

    const a = new WebSocket(url);
    const b = new WebSocket(url);

    await Promise.all([once(a, 'open'), once(b, 'open')]);
    const startA = JSON.parse((await once(a, 'message'))[0].toString());
    const startB = JSON.parse((await once(b, 'message'))[0].toString());
    expect(startA.type).toBe('start');
    expect(startB.type).toBe('start');

    a.send(JSON.stringify({ type: 'move', index: 5 }));
    const moveForB = JSON.parse((await once(b, 'message'))[0].toString());
    expect(moveForB).toEqual({ type: 'move', index: 5 });

    b.send(JSON.stringify({ type: 'move', index: 7 }));
    const moveForA = JSON.parse((await once(a, 'message'))[0].toString());
    expect(moveForA).toEqual({ type: 'move', index: 7 });

    a.close();
    b.close();
    server.close();
    await Promise.all([
      once(a, 'close'),
      once(b, 'close'),
      once(server, 'close'),
    ]);
  }, 10000);
});
