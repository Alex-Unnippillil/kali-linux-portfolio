# Pacman Engine Architecture

## State model
- `GameState` stores maze, actors, timers, mode schedule index, fruit scheduling, lives, and score.
- Ghosts include explicit behavior state markers: `active`, `frightened`, `eaten`, `inHouse`, and `leavingHouse`.
- Status flow uses `ready`, `playing`, `dead`, `gameover`, and `complete`.

## Update loop
- `step(state, input, dt, options)` is deterministic for a given RNG implementation.
- High-level update order:
  1. Handle status gates (`ready`, `dead`, terminal states).
  2. Apply buffered input to Pacman.
  3. Move Pacman with center-aligned turn checks.
  4. Consume pellets/energizers and update scoring/mode timers.
  5. Update global mode schedule.
  6. Update each ghost direction and movement.
  7. Resolve collisions.
  8. Process fruit spawn/collection and level completion.

## Ghost AI pipeline
- Candidate directions are generated at intersections only.
- Reverse filtering enforces arcade-style no-reverse behavior except allowed transitions.
- Target tile selection depends on ghost identity and active mode.
- Tie breaks use a stable direction priority list for deterministic behavior.

## Rules and configuration
- `EngineOptions` carries speed, tunnel multiplier, frightened duration, schedule, and timers.
- Level data can request fruit by time or pellet thresholds.
- Tests inject `options.random` for deterministic frightened behavior.
