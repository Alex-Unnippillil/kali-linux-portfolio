# Tower Defense upgrade and pacing reference

This document captures the shared systems that power the Tower Defense simulator after the scheduler and overlay QA pass.

## Upgrade trees

The upgrade UI surfaces the stats declared in `TOWER_TYPES`. Each node adds either range or damage, with the charts reflecting `getTowerDPS` for the active level. The canvas overlay renders concentric range rings for the selected tower so designers can validate spacing when new upgrade tiers are added.

## Wave scheduler

`createWaveRuntime`, `armWaveCountdown`, and `stepWaveRuntime` centralize the countdown, spawn cadence, and inter-wave delays. The state machine is deterministic and testable, and exposes spawn batches so the React layer can hydrate enemy pools without bespoke timers. When all waves are cleared, the runtime signals completion so the overlay can pause automatically.

## Shared controls & audio

The game now consumes the shared `<Overlay>` controls for pause/resume, reset, and muting, ensuring consistency with other arcade titles. Tower fire events emit a lightweight Web Audio cue unless the shared mute flag is active. High scores persist through `updateHighScore`, keyed per game via `localStorage`, so QA can verify persistence across reloads.
