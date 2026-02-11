# Snake Control Schemes

This guide summarizes every input path the Snake app exposes so testers can
exercise the game across desktop, mobile, and gamepad setups.

## Keyboard

- **Movement** – Arrow keys trigger the movement queue through the shared game
  controls hook. Opposite directions are ignored to prevent 180° turns that
  would instantly collide with the snake's body.
- **Pause / Resume** – The in-game Pause button or window blur pauses the loop.
  Resume the game via the same button or by refocusing the window.
- **Restart** – Press `R` at any time to immediately reset the run, or use the
  in-overlay **Restart now** button after a collision.

## Touch

- **Movement** – Swipe on the game canvas; the dominant axis determines the
  direction. A swipe must travel ~30px before it registers to avoid accidental
  turns, and the gesture is scoped to the board so other apps do not receive it.
- **Pause / Resume** – Tap the Pause button below the canvas.

## Gamepad

- **Movement** – The left analog stick or D-pad maps through the game control
  abstraction. A magnitude threshold prevents micro-movements from issuing
  rapid direction changes.
- **Pause / Resume** – Use the on-screen Pause button; gamepad focus follows
  the desktop UI, so press the confirm button (`A`/`Cross`) while the Pause
  button is focused.

## Audio & Accessibility

- **Sound toggle** – The Sound button mutes or restores the synthesized beeps
  that play on collisions and scoring.
- **Reduced motion** – Respecting the OS-level reduce motion setting pauses the
  automatic loop until the player explicitly resumes via the on-screen Resume
  button.

## Progression & scoring

- **Food counter** – The food count tracks apples consumed in the current run.
- **Points** – Food grants 10 points and power-ups add bonus points depending on
  type.
- **High score** – The high score tracks the best points total and persists
  across sessions.
- **Shield charges** – Shield power-ups store a charge that will cancel one
  fatal collision.

## Power-ups

- **Bonus (`B`)** – Grants a large point boost.
- **Slow (`S`)** – Temporarily lowers game speed to help recover from tight
  paths.
- **Shield (`⛨`)** – Adds one collision protection charge.
- Power-ups despawn after a limited number of ticks if ignored.

## Persistence

- **High score** – Points persist in `localStorage` under
  `snake:highScorePoints` (with migration from older keys) so testers can
  confirm high-score saves survive reloads.
- **Settings** – Wrap, skin, colorblind assist, sound, base speed, and touch
  controls use `snake:*` keys (for example `snake:wrap` and `snake:baseSpeed`)
  to keep preferences consistent across sessions.
