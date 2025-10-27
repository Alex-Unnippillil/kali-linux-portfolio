# Checkers

The Checkers desktop app simulates a full game of American checkers on the
classic 8×8 board. It supports local play against an AI opponent inside the
portfolio shell and reuses the shared game services for pause handling, audio,
and persistent high scores.

## Core Rules

- **Pieces and movement.** Each side starts with twelve men on dark squares.
  Men move diagonally forward one square at a time. When a man reaches the
  farthest rank it is crowned and becomes a king that can move both forward and
  backward.
- **Captures.** If a jump is available the player must take it when the
  “Require capture” toggle is enabled (default). Multi-jumps are handled
  automatically—after each capture the app checks for follow-up jumps before
  switching turns.
- **Winning and drawing.** A player wins when the opponent has no legal moves.
  Draws are declared after forty moves without a capture or when the same board
  position repeats three times.
- **Undo & redo.** The move history keeps full board snapshots so the player can
  undo mistakes. The AI queue is re-evaluated when you step backward.
- **Hints.** The “Hint” button asks the engine for a suggested move using the
  same minimax search that powers the computer opponent.

## Shared Game Features

- **Pause integration.** The app opts into the shared `GameLayout` pause
  controls. The game auto-pauses when the window loses focus and stays in sync
  with the pause overlay in the desktop shell.
- **Reset & persistence.** Game state (board, turn, history, settings, wins) is
  saved through `useGamePersistence('checkers')`. Reloading the window restores
  the session, and the Reset button clears the board while keeping your record.
- **Audio toggle.** Move feedback uses the shared Web Audio context from
  `useGameAudio`, and the mute toggle persists across sessions.
- **High score.** The player’s net win margin is tracked via the shared high
  score helper. Achieving a better margin updates the leaderboard badge shown in
  the layout chrome.
- **Difficulty.** Easy mode plays random legal moves, Medium searches two ply,
  and Hard searches three ply with alpha-beta pruning and a transposition table.

## Accessibility & QA Notes

- All interaction zones (board squares, controls) are keyboard accessible.
- Canvas rendering pauses automatically when the tab is hidden to conserve
  resources.
- Tests cover move validation and persistence helpers so regressions in forced
  captures, multi-jumps, and saved games are caught during CI.
