# Pacman Arcade Rules Spec

## Grid, movement, turning, and tunnels
- The maze is tile based. Entities move in continuous space but can only choose a new direction at tile centers with a strict tolerance.
- Direction reversals are blocked during normal pathing. Reversal is only allowed on mode switches and frightened start.
- Tunnel exits wrap from one horizontal side to the other and apply speed reduction.

## Pellet and energizer scoring
- Pellet score: 10 points.
- Energizer score: 50 points.
- Energizers start frightened mode and reset the frightened ghost combo.

## Ghost modes and schedule
- Mode progression runs per level through scatter/chase phases.
- Frightened mode temporarily overrides chase/scatter and then returns to the active schedule slot.

## Frightened behavior and scoring multipliers
- Frightened ghosts use randomized direction choice with deterministic RNG support.
- Consecutive frightened captures score 200, 400, 800, 1600.
- Frightened visuals flash near timer end unless reduced motion is enabled.

## Targeting behavior by ghost
- Blinky targets Pacman tile directly.
- Pinky targets four tiles ahead, including the original upward quirk offset.
- Inky targets from a two tiles ahead anchor reflected from Blinky, with the same up quirk.
- Clyde chases when far and retreats to corner when near using tile distance.

## Lives, reset, and ready flow
- The game starts in a ready state. Input can buffer while actors are frozen.
- After death, a short dead phase runs, then positions reset into ready.
- Lives reaching zero transitions to game over.

## Fruit rules and scoring
- Classic fruit values scale by level.
- Fruit spawn supports pellet thresholds or time based triggers for custom maps.

## Level progression and difficulty
- Completing all pellets marks level complete and advances to next level in app layer.
- Difficulty presets tune speeds, frightened durations, and schedule values.
