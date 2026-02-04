# Kali Crush Booster Guide

The Kali Crush desktop app now runs on the shared game loop with pause, mute, and reset controls exposed through the overlay. Two boosters help clear stubborn boards without breaking the match-three pacing.

## Booster Inventory

| Booster | Charges per reset | Effect | Notes |
| --- | --- | --- | --- |
| Shuffle | 2 | Randomizes every gem on the board. | Counts as a move, keeps streak bonuses if the shuffle creates a match. |
| Color Bomb | 1 | Removes every gem of the most common color and drops new pieces in. | Awards 12 bonus points per gem removed and can trigger cascades for additional scoring. |

Boosters are refreshed whenever the board is reset. Their counts persist only for the current play session.

## Using Boosters

1. Open the Kali Crush app and match gems normally. Pause or mute at any time from the overlay in the top-right corner.
2. Use quick shortcuts for boosters: `1` triggers Shuffle, `2` triggers Color Bomb, and `H` shows a hint.
3. When you get stuck, press **Shuffle** to reroll the board. The move increments your counter and maintains your streak if a match appears.
4. Use **Color Bomb** when you want to force progress. It vaporizes the most common color, scores an immediate bonus, and lets gravity trigger new cascades.
5. Watch the status panel beneath the boosters for real-time updates on chains, score gains, and remaining inventory.

## Persistent Stats

High scores, best streaks, and the mute preference are saved in `localStorage` (`candy-crush:best-score`, `candy-crush:best-streak`, `candy-crush:muted`). Resetting the board does not wipe these values—only the current score, streak, move count, and booster charges reset.

## Accessibility & Audio

- Every tile can be activated with a click in addition to drag-and-drop swaps.
- Status updates announce when boosts fire, matches resolve, or no matches are found.
- Audio cues use Web Audio sine tones and can be toggled off via the overlay.
