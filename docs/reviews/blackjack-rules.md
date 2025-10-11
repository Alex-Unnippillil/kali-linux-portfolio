# Blackjack App Rules and UX Notes

## Overview
The Blackjack simulator mirrors a six-deck shoe with configurable rules for hit/stand behavior, penetration, and dealer soft 17.
The engine implements multi-hand play with doubling, splitting, insurance settlement, and a history log so QA can replay round
outcomes when validating fixes.

## Gameplay Basics
- **Decks & Penetration:** Selectable from the control panel before a hand starts. Options are disabled while cards are in play.
- **Betting:** Chip buttons animate onto the table and respect the current bankroll. Bets cannot exceed available chips.
- **Actions:** Hit, Stand, Double, and Split queue contextual confirmation modals. Dealer logic follows the configured rules and
  settles hands with 3:2 blackjack payouts and push handling.
- **Counting Overlay:** Optional running/true count HUD that updates from the shoe state for testing card counting displays.

## Shared Game Features
- **Pause & Sound:** The shared game overlay handles pause/resume, mute, and FPS readout. Local toggles mirror the overlay state.
- **Reset:** The reset button reinitializes the shoe, clears history, and restores the default bankroll of 1000 chips.
- **High Score Persistence:** Bankroll and best-ever bankroll are stored under `blackjack:bankroll` and `blackjack:high` keys.
  Audio preferences persist in `blackjack:muted`.
- **Animation Loop:** Rendering runs through the shared `useGameLoop` helper so pause/resume stays in sync with the overlay.

## Accessibility & QA
- Canvas elements announce status updates through the live region below the controls.
- Buttons remain keyboard accessible and disable while the game is paused or when an action is invalid.
- Tests cover scoring resolution and persistence keys to guard against regressions in payouts or localStorage writes.
