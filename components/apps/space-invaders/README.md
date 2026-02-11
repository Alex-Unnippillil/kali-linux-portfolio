# Space Invaders (Desktop App)

Space Invaders is a canvas-driven arcade app that runs inside the desktop window shell.
It uses a fixed-timestep simulation for deterministic gameplay and a decoupled render loop via `requestAnimationFrame`.

## Controls

### Keyboard
- `A / D` or `← / →`: Move
- `Space`: Fire
- `P`: Pause / resume
- `R`: Restart (from app shell hotkey)

### Touch
The app currently focuses on desktop keyboard controls. Touch controls can be added in `ui/` without changing engine systems.

## Settings
- **Sound** toggle
- **Allow multi-shot** (classic mode remains one active player bullet)
- **Debug overlay** for profiling bullets/invader count
- **Reduced motion** follows `prefers-reduced-motion`

## Architecture

- `index.tsx`: React wrapper, overlays, lifecycle and fixed-step loop wiring
- `engine/engine.ts`: testable engine API (`createEngine`, `step`, `reset`, `getState`)
- `engine/state.ts`: initial state and wave generation
- `engine/systems.ts`: pure gameplay systems (movement, shooting, collisions, progression)
- `engine/renderer.ts`: Canvas 2D draw routines only
- `ui/Overlays.tsx`: start/pause/game-over overlays

## Determinism and testing

The engine is deterministic when given:
1. initial state
2. an input snapshot stream
3. a seed (`siSeed` query parameter in browser or `setSeed` in tests)

Test hooks:
- `NODE_ENV=test` enables stable test-oriented behavior.
- Query param `?siSeed=<number>` overrides random seed for E2E reproducibility.

## Running tests

- Unit + component tests:
  - `yarn test __tests__/spaceInvadersGame.test.ts __tests__/spaceInvaders.test.tsx`

## Extending invader types or level rules

1. Add score/value logic in `engine/state.ts` (`invaderPoints`).
2. Expand movement/fire behaviors in `engine/systems.ts`.
3. Update render color/shape in `engine/renderer.ts`.
4. Add test coverage in `__tests__/spaceInvadersGame.test.ts`.

## Known limitations

- Audio is currently toggle-only scaffolding; full Web Audio cues can be layered on top of engine events.
- Touch controls are not yet implemented in this version.
