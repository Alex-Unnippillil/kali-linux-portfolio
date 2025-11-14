# Connect Four Controls

Updated UI and loop scaffolding introduce a consistent control scheme for the Connect Four arcade app.

## Interaction

- **Mouse / Touch** – Hover or tap a column to preview the AI evaluation heatmap and drop a disc.
- **Undo** – Reverts the most recent turn before the match has been decided.

## Session Controls

- **Pause / Resume** – Freezes the animation loop and AI turns using the shared game loop helper.
- **Reset** – Clears the board, turn history, highlights, and resumes play from the human turn.
- **Sound On / Off** – Toggles synthesized chimes for drops, wins, losses, and draws. The selection persists per device.

## Persistence

- Player wins, AI wins, and draws are stored in `localStorage` so performance survives reloads.
- Statistics surface inside the game window and also feed the GameLayout scoreboard for sharing.
