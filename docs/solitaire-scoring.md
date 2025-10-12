# Solitaire Scoring Reference

The Kali Linux Portfolio build of Solitaire uses a Vegas-style scoring model so that wins and redeals impact a running bankroll. Use this reference when verifying gameplay tuning or updating UI copy.

## Starting bankroll
- Each new game withdraws **52 credits** from the player's bankroll. This matches the cost of buying a fresh deck in Vegas scoring.
- Daily deals also withdraw the same amount so that streaks remain comparable to standard runs.

## Incremental scoring
- Moving any card to a foundation pile awards **5 credits**. Because there are 52 cards total, a perfect game offsets the opening cost.
- The internal engine also tracks a traditional score (`GameState.score`) that increments by 10 for every foundation move. The UI exposes the bankroll-oriented total (`vegasScore`) for players and stats.

## Redeal penalties
- Recycling the waste into the stock reduces the score by **100 credits**. Unlimited pass games represent an ongoing cost while limited pass games stop penalising once redeals are exhausted.
- Redeal counts persist in the saved snapshot. When the stored redeal value is `null` (after JSON serialisation) it is restored to `Infinity`, ensuring unlimited games remain consistent across sessions.

## Persistence notes
- Every move updates a snapshot containing the deck layout, timer, move counter, bankroll, and streak statistics. This snapshot is stored via `useGamePersistence('solitaire')` under the `snapshot:solitaire` key.
- High scores are kept separately in `localStorage` using the shared game persistence hook. The visible "High Score" counter reflects the greater of the session best and the saved record.

## Testing checklist
- Confirm that starting a new game reduces the bankroll by 52.
- Verify that each foundation move increases the bankroll by 5.
- Redealing should subtract 100 credits and persist after reload.
- Winning a game should update both the best score/time statistics and the shared high score entry.
