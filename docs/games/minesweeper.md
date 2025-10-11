# Minesweeper Difficulty Reference

The desktop Minesweeper app ships with three tuned presets that mirror the classic Beginner/Intermediate/Expert flow while
keeping the square grid used across the portfolio.  The configuration also drives persistence keys for personal best times and
share codes.

## Difficulty presets

| Difficulty | Grid size | Mines | Description |
| --- | --- | --- | --- |
| Beginner | 8 × 8 | 10 | Fast introduction with generous safety margin around the first click. |
| Intermediate | 16 × 16 | 40 | Classic mid-tier board with enough bombs to reward flag discipline. |
| Expert | 22 × 22 | 99 | High-density field sized for the desktop canvas; retains the safe opening halo. |

Changing the difficulty inside the in-app settings resets the current run, seeds a fresh board, and updates the dashboard stats
to the new preset.

## Best time tracking

Best completion times are stored per difficulty using the keys `minesweeper-best-time:<difficulty>`.  The UI surfaces:

- The active difficulty label and its per-run timer.
- A "PBs" summary that lists every personal best across Beginner, Intermediate, and Expert.
- Shared state snapshots include the selected difficulty so saves resume with the correct layout.

## Share codes

Share codes now encode difficulty alongside the seed and starting cell.  The format is `seed-difficulty-x-y`, where `seed` is the
base-36 representation of the PRNG seed, `difficulty` is one of `beginner`, `intermediate`, or `expert`, and `x-y` describe the
first revealed cell.  Older two-part codes are still accepted and are converted to the current format when loaded.
