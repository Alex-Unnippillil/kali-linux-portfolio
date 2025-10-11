# Breakout Controls and Session Flow

The Breakout app now follows the shared arcade scaffolding. Players can rely on
these interactions across desktop and touch devices:

## Core Controls

- **Mouse / Trackpad**
  - Move the paddle by pointing anywhere on the canvas.
  - Click to launch or relaunch the ball when it is docked on the paddle.
- **Keyboard**
  - `←` and `→` move the paddle in coarse steps.
  - `Space` or `↑` launches the ball while it is attached to the paddle.
  - `R` resets the current stage while keeping the selected layout.
  - `M` toggles sound without leaving the window.
- **Touch**
  - Drag anywhere on the canvas to steer the paddle.
  - Tap to launch the ball.

## Session Management

- The Pause control in the window chrome pauses the simulation using the shared
  canvas loop helper.
- The **Reset Stage** button in the lower-right corner restores lives and score
  for the current stage and reinitializes bricks.
- The **Sound** toggle persists across sessions via `usePersistentState`.
- Exiting to the level picker automatically pauses the loop and displays the
  current progress summary.

## Persistence

- Built-in campaigns save the latest stage, lives, and score to localStorage
  (`breakout:progress`).
- Custom layouts can be imported or created in the editor; they run in a
  non-persistent session so players can experiment without affecting campaign
  progress.
- High scores persist separately under `breakout:high-score` and update whenever
  a run exceeds the stored value.

Refer to `games/breakout/progress.ts` for the state helpers that power these
flows and the accompanying tests in `__tests__/breakoutProgress.test.ts`.
