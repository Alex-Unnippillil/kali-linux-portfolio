# Sudoku Game Notes

## Difficulty presets
- **Easy** – leaves roughly 35 cells empty per puzzle, favoring straightforward solves.
- **Medium** – removes about 45 cells to encourage moderate deduction chains.
- **Hard** – exposes approximately 55 blanks, pushing advanced techniques while preserving a unique solution.

These presets are enforced by the shared generator so desktop and standalone builds stay in sync.

## Daily versus random seeds
- The desktop app seeds a deterministic "daily" puzzle from the current date so every player sees the same challenge each day.
- Switching to random mode re-seeds the generator with the current timestamp for an ad-hoc board.

## Timekeeping and persistence
- Timers pause automatically when the HUD pause button is toggled or a puzzle is completed, keeping elapsed time honest.
- Best times persist per difficulty and mode (`daily` or `random`) in local storage so improvements survive reloads without overwriting slower runs.

## Assistance tools
- Pencil marks, hint calls, and the elimination helper all reuse the shared Sudoku utilities, giving consistent validation messaging and highlighting across experiences.
