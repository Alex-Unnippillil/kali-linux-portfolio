# Connect Four AI notes

- **Easy**: tactical-first. It takes immediate wins, blocks immediate losses, then chooses among top-ranked moves with light randomness.
- **Normal**: deterministic minimax at a stable medium depth.
- **Hard**: iterative deepening minimax with alpha-beta pruning and a per-match transposition table for stronger and smoother play.

The worker validates payloads and returns structured errors so the UI can safely fall back to local move calculation.
