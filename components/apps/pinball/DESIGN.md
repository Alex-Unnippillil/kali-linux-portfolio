# Pinball DESIGN

## Audit summary
- Rendering: previous implementation used Matter.js Render and imperative canvas drawing.
- Physics: Matter.js with static body angle flips; no fixed-step accumulator.
- Input: keyboard + gamepad polling in React effect.
- Mounting: windowed app loaded by `apps/pinball/index.tsx` and desktop app registry.
- Persistence: high score only through generic game persistence helper.

## Refactor plan
- Keep canvas-based 2D playfield approach.
- Replace monolithic React+physics integration with 3 layers:
  1. `GameEngine` fixed timestep simulation and state rules.
  2. `CanvasRenderer` for frame drawing only.
  3. `PinballApp` for menus/settings/help and low-rate HUD snapshots.
- Add local persistence module for settings/high scores.
- Add deterministic scoring logic in `rules/scoring.ts` with tests.

## Engine loop
- Host loop uses RAF with accumulator and clamps frame deltas.
- Physics runs at 60Hz (`FIXED_TIMESTEP`), UI snapshots update at 20Hz.
- Renderer can run every RAF without forcing React re-renders.

## Collision and gameplay model
- Ball integrates gravity + friction, then resolves:
  - outer walls and plunger lane wall,
  - circular bumpers,
  - rectangular slings,
  - standup targets,
  - flipper segment collision impulse.
- Drain checks bottom center lane with ball-save timer and 3-ball lifecycle.
- Nudge has warning window and tilt lockout to disable flipper power briefly.

## Performance notes
- Engine state is mutable and off-React.
- React state only stores sampled snapshots/settings/high scores.
- No timers/intervals retained on unmount; listeners and RAF are detached.

## Tradeoffs
- Custom lightweight physics chosen for deterministic behavior and maintainability in this app scope.
- No advanced rigid-body constraints or ramps in this iteration.
- Audio routing is intentionally minimal; future extension point can add WebAudio bus and samples.

## Future extensions
- Multiball modes and mission objectives.
- Multiple table definitions under `table/`.
- Rich audio mixer and haptics.
