# Blackjack App

## Features
- Deterministic blackjack domain logic with seedable RNG.
- Rules: hit/stand/double/split, insurance, configurable soft-17 and blackjack payout.
- Reducer-driven phase machine (`BETTING`, `PLAYER_TURN`, `DEALER_TURN`, `SETTLEMENT`).
- Keyboard controls: `H`, `S`, `D`, `P`, `N`, `B`, `Shift+B`, `Esc`.
- Accessibility: semantic buttons, live announcements, focus-safe controls.
- Persisted bankroll/bet/stats/config with schema versioning and safe reset.

## Folder structure
- `domain/`: pure game logic (types, hand evaluation, shoe, rules, transitions).
- `state/`: reducer actions/selectors/persistence.
- `hooks/`: keyboard and ARIA announcements.
- `ui/`: table, hand, controls, settings, outcome components.
- `__tests__/`: unit + integration tests.

## Running tests for this app
```bash
yarn test components/apps/blackjack/__tests__
```

## Changing rules
Update `DEFAULT_CONFIG` in `state/reducer.ts`.
Runtime settings are changed in `ui/RulesModal.tsx`.

## Debugging tips
- Use a fixed seed by editing `createBlackjackState(seed)` in `BlackjackApp.tsx`.
- Check the event log panel for deterministic round trace.
- Shoe and running-state values are shown via `ShoeMeter`.

## Known limitations
- Single player hand is default in UI; split support exists in logic and control flow.
- Legacy `engine.js` remains only as compatibility for older helpers.
