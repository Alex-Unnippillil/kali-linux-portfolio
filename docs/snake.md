# Snake Technical Notes

## Persisted settings

Snake stores settings under `localStorage` using `snake:*` keys:

- `snake:wrap`
- `snake:skin`
- `snake:colorblind`
- `snake:sound`
- `snake:baseSpeed`
- `snake:highScore`
- `snake:touchControls`
- `snake:obstacles`
- `snake:obstaclesEnabled`
- `snake:applySpeedImmediately`

Legacy `snake_*` keys are still migrated in the UI boot flow.

## Replay format

Replay slots use the `snake-replay` namespace via `useSaveSlots`.

- Legacy compatible shape: `{ frames: [...] }`
- Deterministic shape: `{ seed, settings, inputs, metadata }`

Metadata is optional but now includes score/date/wrap/obstacle/speed/skin and
engine version when available.

## Engine options and determinism

The core engine (`apps/snake/index.ts`) now supports optional behavior flags:

- `ensureReachableFood?: boolean`
- `obstaclePlacementSafety?: 'off' | 'basic'`

With deterministic RNG injection (`options.random`) and input-by-step replays,
Snake simulation remains deterministic and frame-rate independent.
