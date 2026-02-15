# Frogger architecture notes

## Game loop
- `index.tsx` owns the `requestAnimationFrame` loop and keeps simulation state in refs.
- React state is only used for HUD/status updates, avoiding per-frame React renders.
- Input is processed as one hop at a time with a single queued move while mid-hop.

## State model
- `frogRef`, lane refs, timer refs, and home-bay refs are the authoritative runtime state.
- `homes` stores bay occupancy and temporary hazards (`fly`, `gatorHead`).
- `bestYRef` tracks highest progress in a run so step scoring cannot be farmed.

## Lane definition system
- `apps/games/frogger/config.ts` defines lane archetypes (`car`, `log`, `turtle`, `gator`).
- `generateLaneConfig` ramps speed and spawn cadence by level/difficulty.
- `engine.ts` initializes each lane with deterministic lane-local RNG.

## Scoring rules
- Forward progress: +10 only when reaching a new highest row for that life.
- Home entry: +50, plus fly (+200), plus lady escort (+200), plus time bonus.
- Level clear: +1000 when all five homes are filled.
- Extra life threshold defaults to 20,000 points.

## Adding hazards
1. Add a `LaneKind` (or a home hazard field) in `types.ts`.
2. Extend lane config definitions in `config.ts`/`levels.ts`.
3. Add collision/death logic in `updateLogs`/`resolveHomeEntry`.
4. Render visuals in `render.ts`.
5. Add deterministic tests in `__tests__/frogger.test.ts`.

## Testing notes
- Unit tests focus on deterministic engine behavior and scoring/death edge-cases.
- UI tests verify start, pause, restart controls and persisted settings behavior.
