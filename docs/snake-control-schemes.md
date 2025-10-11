# Snake Control Schemes

This guide summarizes every input path the Snake app exposes so testers can
exercise the game across desktop, mobile, and gamepad setups.

## Keyboard

- **Movement** – Arrow keys trigger the movement queue through the shared game
  controls hook. Opposite directions are ignored to prevent 180° turns that
  would instantly collide with the snake's body.
- **Pause / Resume** – The in-game Pause button or window blur pauses the loop.
  Resume the game via the same button or by refocusing the window.

## Touch

- **Movement** – Swipe anywhere on the canvas; the dominant axis determines the
  direction. A swipe must travel ~30px before it registers to avoid accidental
  turns.
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
  automatic loop until the player explicitly resumes.

## Persistence

- **High score** – Scores persist in `localStorage` under `snake_highscore` so
  testers can confirm high-score saves survive reloads.
