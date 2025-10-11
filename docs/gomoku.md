# Gomoku

## Overview

The Gomoku app simulates a 15×15 board where players place black and white stones on the intersections. The goal is to be the first to form an unbroken line of five stones horizontally, vertically, or diagonally.

## Rules of Play

- Players alternate turns placing a single stone on an empty intersection.
- Black moves first by default. When playing against the AI you can choose to play first or second from the toolbar.
- The first player to align five stones in a straight line wins the round.
- If the board fills without a winning line the round is declared a draw.
- The app enforces standard freestyle Gomoku rules—overlines (six or more in a row) still count as a win.

## Modes

The toolbar supports two play styles:

- **AI Match** – Battle an adaptive AI with three difficulty presets (Casual, Balanced, Advanced). You can toggle whether you play as Black (first move) or White (second move).
- **Local (2 players)** – Two people can share the board, alternating moves on the same device with the app enforcing turn order.

Switching modes or difficulty resets the current round so the new settings take effect immediately.

## Shared Game Features

Gomoku now plugs into the shared game scaffolding:

- **Pause overlay** – The GameLayout pause control freezes input and displays a resume dialog when the window loses focus or you click the Pause button.
- **Reset & stats** – Use *Reset Board* to clear the grid without wiping history, or *Clear Stats* to reset stored results.
- **Audio toggle** – The toolbar exposes a Sound switch so you can enable or disable placement feedback.
- **High score integration** – The GameLayout HUD displays your current streak and best streak when playing against the AI. Stats persist in localStorage (`gomoku:stats`).

## Persistence

Each completed round updates the stored statistics:

- AI matches track player wins, AI wins, draws, current streak, and longest streak.
- Local games track Black wins, White wins, and draws separately.
- The total number of recorded rounds is shown beneath the scoreboard.

You can clear the stored stats at any time using the toolbar button; this also resets the HUD counters.

## Testing Notes

Unit tests cover:

- Win detection for horizontal, vertical, and diagonal lines.
- AI defensive heuristics for blocking imminent wins.
- Persistence helpers that update streaks and per-mode results.

Run `yarn test gomoku --runInBand` to execute the dedicated suite.
