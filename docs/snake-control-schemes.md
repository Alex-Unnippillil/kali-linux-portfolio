# Snake Control Schemes

This guide summarizes every input path the Snake app exposes so testers can
exercise the game across desktop, mobile, and gamepad setups.

## Keyboard

- **Movement** – Arrow keys trigger the movement queue through the shared game
  controls hook. Opposite directions are ignored to prevent 180° turns that
  would instantly collide with the snake's body.
- **Pause / Resume** – Use the Pause button or focus behavior in `GameLayout`.
  Resume now uses a short 3-2-1 countdown unless reduced motion is enabled.
- **Restart** – Press `R` or click Restart. Restart also uses the same countdown
  for predictable re-entry.

## Touch

- **Movement** – Swipe on the game canvas; the dominant axis determines the
  direction. A swipe must travel ~30px before it registers to avoid accidental
  turns, and the gesture is scoped to the board so other apps do not receive it.
- **D-pad** – Optional on-screen controls are still available and now trigger a
  light haptic pulse when haptics are enabled.

## Replay Management

- **Play/Delete** – Use the Replay selector in Settings.
- **Rename** – Enter a custom replay name and click **Rename**.
- **Export JSON** – Copies JSON to clipboard when possible, otherwise downloads
  a `.json` file.
- **Import JSON** – Paste replay JSON and click **Import JSON**. Invalid payloads
  show a safe inline message and never crash the app.

## Audio & Accessibility

- **Sound toggle** – Mutes or restores synthesized beeps for collisions and
  scoring.
- **Reduced motion** – Respecting OS-level reduced motion keeps the game paused
  until the player explicitly resumes.

## Persistence

- **High score** – `snake:highScore`.
- **Settings** – Wrap, skin, colorblind assist, sound, base speed, touch
  controls, obstacle preferences, and speed-application mode persist in
  `snake:*` keys.
