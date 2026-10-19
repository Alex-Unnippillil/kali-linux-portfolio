# Shared games contract freeze

**Lane:** `games-shared`  
**Source SHA:** `dd264b1a8c0f0ae6292ec209504a8d8caa510058`

## Frozen lifecycle contract

- `isFocused={false}` means a game window is unfocused **or minimized**. `GameLayout` pauses it and does not automatically resume when focus returns. The player must choose Resume.
- Game loops consume the existing `onPauseChange` callback and must suspend animation, timers, audio, and simulation work while paused. Unmount/close must clean up listeners, animation frames, workers, and timers.
- Shared keyboard hooks accept `isFocused` and the additive `enabled` option. They ignore hidden documents, editable targets, and composition events. A game may retain cooperating shared listeners, while desktop focus ensures only the active game receives input.
- Held advanced-control state is cleared when disabled, unfocused, blurred, or hidden so controls cannot stick across lifecycle changes.
- Reduced motion disables shared score/high-score pulses and the shared performance animation. Individual games must use the existing reduced-motion preference for their own nonessential animation.

## Frozen control and result contract

The stable high-level actions remain `up`, `down`, `left`, `right`, `action`, and `pause`, exported as `GAME_INPUT_ACTIONS`. Existing storage keys and callback payloads are unchanged. `Space` bindings accept both the browser `key` value (`" "`) and `code` value (`"Space"`).

`VirtualPad` is the common pointer/touch/keyboard equivalent. Its native buttons have names, use click activation (therefore Enter/Space work), and support an additive `disabled` prop. Per-game workers should connect the same actions to keyboard and virtual controls rather than implementing document-global listeners.

Games provide their final human-readable outcome through the additive `GameLayout.result` prop. It is exposed in an assertive, atomic live region. Scores and progress remain supplied through the existing props and existing per-game persistence keys; this lane changes no storage key or saved shape.

## Representative fixtures

`__tests__/ux/games-shared/sharedLifecycle.test.tsx` proves:

1. focused ownership and disabled/unmounted cleanup;
2. editable/composition exclusions;
3. focus/minimize pause with explicit resume; and
4. accessible, keyboard-clickable virtual controls and result announcements.

## Worker handoff

Per-game work may now adopt the contract above without changing the common action names, input payload, persistence keys, or `onPauseChange` signature. No individual game implementation was edited in this lane.

## Compatibility and dependencies

- Storage/API compatibility: no keys, formats, routes, app IDs, or existing exported interfaces changed; all new props/options are optional.
- Feature flags: none.
- Network behavior: none; all behavior remains local and deterministic.
- Dependency requests: none.
- Remaining integration risk: games that do not currently wire `onPauseChange` cannot have their private loop suspended by shared layout alone. Their assigned workers must wire that existing callback and verify RAF/timer cleanup without altering this contract.

## Validation recorded

- `corepack yarn lint` — passed (changed-code ESLint).
- `corepack yarn typecheck` — passed.
- `corepack yarn jest __tests__/game2048.test.tsx __tests__/ux/games-shared/sharedLifecycle.test.tsx --runInBand` — passed: 12 tests, with the existing single skipped case.
- `corepack yarn playwright test --list tests/portfolio/ux-games-shared.spec.ts` — passed; one Chromium test discovered by the governance-owned configuration.
- `corepack yarn playwright test tests/portfolio/ux-games-shared.spec.ts` — not executed because the environment has no installed Chromium executable. This also prevented capturing the requested browser screenshot; the test contains the screenshot step for an equipped integration runner.
- `corepack yarn build` — passed; PWA reported the existing 2.88 MB chunk precache-size warning.
- `corepack yarn export` — passed; Next.js reported the expected warning that static export disables API routes and middleware.

Browser coverage is therefore written and discovered but remains to be executed on Chromium. Touch semantics are exercised through native click activation in Jest, not on a real touch device.
