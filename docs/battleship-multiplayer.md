# Battleship Multiplayer Rules

The Battleship app includes a lightweight WebSocket matchmaking server in
`apps/games/battleship/net/server.ts`. It pairs two browsers together, forwards
shots in real time, and notifies both players when a match ends. This document
summarizes the protocol and gameplay expectations so designers, engineers, and
QA testers share the same mental model when exercising or extending the
multiplayer mode.

## Matchmaking Flow

1. A browser connects to the matchmaking server. If another player is already
   waiting, the server pairs them immediately; otherwise it keeps the newcomer
   in a queue until an opponent arrives.
2. When a pair is formed the server sends a `start` message to both sockets:
   - The waiting player receives `{ "type": "start", "player": 1 }` and takes
     the first turn.
   - The newcomer receives `{ "type": "start", "player": 2 }` and acts second.
3. Players always remain connected to the same peer for the lifetime of the
   match. If either socket disconnects, the server sends `{ "type": "end" }` to
   the remaining player and returns to listening for new connections.

## Turn Structure

- Boards must follow the same placement rules enforced locally: ships cannot
  overlap, must remain on the 10×10 grid, and may not touch diagonally.
- Player 1 fires first. A move is communicated as `{ "type": "move", "index": n }`
  where `index` is a zero-based cell coordinate (0–99) in row-major order.
- Upon receiving a `move` message, a client applies the shot, updates its local
  board, and, if the salvo option is active, repeats the process for each
  allowed shot that turn.
- The desktop UI mirrors the local rules: salvo mode grants one shot per ship
  still afloat, fog of war hides the player board when enabled, and the pause
  overlay is purely client-side (it does not halt the opponent’s clock).

## Match Completion

- A game ends when all of a player’s ships are sunk. The winner should display
  the victory message locally and stop sending `move` messages.
- If a websocket closes unexpectedly the server forwards `{ "type": "end" }`
  to the remaining client so it can exit gracefully.
- The server does not persist match history; statistics stay client-side via the
  `battleship-stats` localStorage key introduced in this update.

## Testing Checklist

When validating multiplayer changes:

- Confirm both clients receive the correct `player` assignment in their `start`
  messages.
- Verify moves stay in sync across browsers, including rapid salvo sequences.
- Force-disconnect a client and ensure the opponent receives an `end` message
  and returns to the lobby without errors.
- Validate that local placement rules reject illegal layouts before the match
  starts; the server assumes clients enforce those constraints.

These notes should keep future enhancements (spectator mode, ranked ladders, or
AI substitution) aligned with the current server contract.
