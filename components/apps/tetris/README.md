# Tetris App (v2 engine)

## Architecture

- `engine/`: pure deterministic logic, no React/DOM. Contains board math, SRS rotation + kicks, 7-bag randomizer, scoring, lock-delay handling, hold queue rules, and the fixed-step simulation contract.
- `input/`: keyboard mapping and DAS/ARR repeat handling with focus-gated key consumption.
- `ui/`: canvas renderer, HUD, overlays, settings panel, and local error boundary.
- `utils/`: small helpers for storage, clamps, and development assertions.

## Controls (default)

- Move left/right: `ArrowLeft` / `ArrowRight`
- Soft drop: `ArrowDown`
- Hard drop: `Space`
- Rotate CW / CCW: `ArrowUp` / `Z`
- Rotate 180°: `A` (enabled only when setting toggle is on)
- Hold: `Shift`
- Pause: `P`
- Restart: `R`
- Help: `?`
- Settings: `O`

All keybinds are remappable in the in-app settings panel and persisted in localStorage (`tetris:v2:settings`).

## Rules implemented

- 10×20 visible matrix + 4 hidden spawn rows.
- Canonical tetromino set `I O T S Z J L`.
- 7-bag randomizer.
- SRS wall kicks (I-table and JLSTZ-table split).
- Level-based gravity and time-based soft drop.
- Lock delay + lock reset cap (prevents infinite spin).
- Hold with one hold-use per active piece until lock.
- Next queue preview of 5 pieces.
- Line clear scoring (single/double/triple/tetris), combo bonus, and back-to-back tetris bonus.
- Hard drop scoring (+2 per cell).

### Not implemented yet

- T-spin detection/scoring (intentionally omitted for consistency until full move-classification is added).
- Touch controls.
- Audio synthesis hooks (toggle is present and persisted).

## Testing

Run targeted tests:

```bash
yarn test __tests__/tetris-engine.test.ts
```

Optional E2E (if Playwright environment is available):

```bash
npx playwright test playwright/tetris.spec.ts
```

## Future enhancements

- Full T-spin detection (mini/full), plus guideline scoring model.
- Garbage/versus mode hooks.
- Optional lock-down modes (infinity/move reset/step reset presets).
