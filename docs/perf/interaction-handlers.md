# Interaction handler priorities

This project now treats every user event handler as either **user-blocking** or a
**transition** so the UI remains responsive while background work continues.
The utilities in `utils/perf/` coordinate interaction marks and bridge them to
React’s scheduling primitives.

## Priorities in use

| Component | Handler | Priority | Notes |
| --- | --- | --- | --- |
| `components/ubuntu.js` | `lockScreen`, `unLockScreen`, `shutDown` | User blocking | Locks, unlocks, and power controls must respond immediately while still recording perf marks. |
| | `hideBootScreen`, `changeBackgroundImage`, `turnOn` | Transition | Visual-only updates run through `runTransitionUpdate` to avoid blocking pointer input. |
| `components/screen/navbar.js` | Workspace event handlers | Mixed | Workspace selection is user blocking; taskbar synchronization and reordering run as transitions so background work does not stall clicks. |
| `components/ui/QuickSettings.tsx` | Toggle + slider callbacks | Transition | Each control uses `useTransition` plus perf marks to batch storage updates without delaying the pointer thread. |

## Utilities

* `runUserBlockingUpdate(label, task)` — executes `task` synchronously while
  measuring interaction duration.
* `runTransitionUpdate(label, task)` — schedules `task` in a React transition
  and measures the interaction.
* `beginInteractionMark` / `endInteractionMark` — wrap work that already owns
  its scheduling strategy (see Quick Settings).
* `recordINPMetric(value, detail)` — stores the latest Interaction to Next Paint
  measurement and emits console warnings when it exceeds the 200 ms target.

Each helper accepts a `label` string that appears in the perf console warning so
slow interactions are easy to trace.

## Adding new handlers

1. Decide whether the work must block user feedback. Anything that animates UI,
   updates local storage, or coordinates background state is usually a
   transition. Actions that must be felt immediately (window focus, menu
   dismissal, keyboard shortcuts) stay user blocking.
2. Wrap the state change with the matching helper. For class components this is
   typically `runUserBlockingUpdate` or `runTransitionUpdate`. Functional
   components can either call those helpers or wire their own
   `useTransition`+`beginInteractionMark` pair if they need an `isPending` flag.
3. Use descriptive labels such as `"desktop:open-folder"` so metrics identify the
   source quickly.
4. Add tests when the handler introduces a new interaction label or modifies
   budgets. See `__tests__/utils/perf/marks.test.ts` for examples.

## Budget targets

User-blocking work must complete within **200 ms**. Transition work has a looser
**500 ms** budget, but should finish faster whenever possible. Any interaction or
INP reading beyond the threshold emits a console warning during development and
preview builds.

