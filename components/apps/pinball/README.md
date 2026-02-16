# Pinball app

Modernized pinball table for the desktop-style Kali portfolio shell.

## Features
- Fixed-step engine (60Hz) with decoupled canvas renderer.
- Flippers, plunger hold/release launch, drain, ball save, 3-ball game flow.
- Bumpers, slingshots, standup targets, combo multiplier, end-ball bonus.
- Tilt + nudge logic and debug metrics overlay.
- Local persistence for settings and high-score table.

## Controls
- Left flipper: `Z` or `Left Shift`
- Right flipper: `/` or `Right Shift`
- Plunger: hold `Space`, release to launch
- Pause: `Esc`
- Nudge: `ArrowLeft`, `ArrowRight`, `ArrowUp`, or `N`

## Local run
Use project-standard scripts:
- `yarn dev`
- `yarn test`
- `yarn lint`

## Extension guide
- Add bumpers/slings/targets in `engine/GameEngine.ts` arrays.
- Add new scoring behavior in `rules/scoring.ts`.
- Extend HUD/menu components under `ui/`.

## Known limitations
- Single-table geometry currently hardcoded.
- Audio uses fallback-safe UI settings only; sample-based sound bank is not included yet.
- Pointer/touch zones are not yet fully mapped for mobile play.
