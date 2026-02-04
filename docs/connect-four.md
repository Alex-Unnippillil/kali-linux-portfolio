# Connect Four

## Overview
Connect Four is a fully playable desktop-style game with local and CPU modes, match play, accessibility settings, and persistent stats.

## Controls

**Keyboard**
- Arrow Left / Arrow Right: select column
- Home / End: jump to first/last column
- Enter / Space: drop disc
- U: undo
- R: restart

**Mouse / Touch**
- Tap/click anywhere in a column to select/drop a disc.
- When "Confirm move" is enabled, tap/click once to select a column and tap again to drop.

## Modes
- **Single game**: one-off matches.
- **Best of 3**: first to 2 wins takes the match (draws do not count toward the win total).

## Settings
- **Difficulty**: Easy / Normal / Hard (affects CPU depth).
- **Assists**: show per-column evaluation hints.
- **Palette**: alternate color schemes for better colorblind support.
- **Contrast**: boosts borders, focus rings, and win highlights.
- **Quality**: reduces visual effects or disables drop animation at low quality.
- **Token patterns**: overlay dots/stripes so color is not the only signal.
- **Confirm move**: optional two-tap confirm for accessibility/touch.

## Stats
Stats are persisted locally:
- CPU wins/losses/draws per difficulty plus current win streak.
- Local 2P win counts per player color and draws.
