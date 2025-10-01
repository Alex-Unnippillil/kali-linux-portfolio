# Cooperative Scheduler Guidelines

The desktop shell now exposes a cooperative scheduler in `utils/scheduler.ts`. It provides
prioritised task queues backed by microtasks and `requestIdleCallback` so heavy work can
progress without stalling user input. Feature teams should follow these patterns when
queuing background work or marshalling data to workers.

## Core concepts

- **Priorities** – choose from `TaskPriority.UserBlocking`, `UserVisible`, `Background`, and
  `Idle`. User-facing work runs in a microtask, while background and idle priorities wait for
  idle periods so they never steal interaction time.
- **Task controls** – callbacks receive a `{ shouldYield, yield }` helper. Call
  `shouldYield()` inside loops and `await yield()` when the idle budget is gone to chunk long
  tasks.
- **Cancellation** – `scheduleTask` returns a handle with `cancel()`. Always cancel queued
  work on component teardown to avoid leaks.

## Worker pools and dispatchers

- Schedule worker messages with `TaskPriority.Background` so parsing and simulation tasks do
  not fire while the main thread is processing input. See `FixturesLoader` and the simulator
  parser for reference.
- Upgrades that fan work across multiple workers should reuse a shared dispatch handle and
  cancel the pending job before queueing a new one. This keeps only the latest request alive
  when the user rapidly toggles controls.
- Use `TaskPriority.UserVisible` for cancellation or user-driven interrupts so they post to
  the worker immediately even when background jobs are pending.

## Heavy UI tasks

- Wrap charting, layout diffs, and expensive DOM writes in `scheduleTask` with a background
  priority. This lets animations and pointer events continue while large datasets are
  interpolated.
- Call `shouldYield()` in render loops and `await controls.yield()` to split work across
  multiple idle deadlines. The scheduler will re-enter the task once the browser grants time
  again.
- Store the scheduled handle in a `useRef` and cancel/requeue when incoming data updates or
  on unmount.

## Performance instrumentation

- INP samples are tracked automatically via `reportWebVitals`. When background work is
  active, the module logs the running P75 to the console and emits a GA event if the value
  exceeds 200 ms. Teams should watch for these alerts during development.
- For critical interactions, consider logging your own checkpoints alongside scheduler
  stats: `getSchedulerStats()` exposes the number of active background jobs and the last task
  duration.

## Testing checklist

- Jest tests can import `__resetSchedulerForTests()` to isolate queue state.
- Polyfill `requestIdleCallback` in tests when asserting idle behaviour. A helper is
  available in `__tests__/scheduler.test.ts` for reference.
- Add unit tests whenever you introduce new scheduled work to ensure ordering and
  cancellation behave as expected.

Following these practices keeps the desktop responsive while heavy simulations run in the
background.
