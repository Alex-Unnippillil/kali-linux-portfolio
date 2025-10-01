# Resource monitor simulation best practices

The resource monitor app now simulates CPU pressure and job orchestration to
illustrate how tooling should back off when hosts are saturated. Follow these
patterns when extending the simulation or building new demos:

## Scheduler hygiene

- Keep the scheduler educational. Each job is a mock task; never trigger real
  workloads or background scans. The queue should represent theoretical work.
- Respect the parallelism guard rail exposed to the learner. The job scheduler
  should never spin up more running jobs than the configured limit.
- Use backpressure to prevent runaway simulations. When CPU usage exceeds the
  threshold, pause starting new jobs and surface a clear explanation in the UI.
- Resume automatically only after metrics drop below the resume threshold. This
  mirrors production systems where hysteresis prevents thrashing.

## CPU metrics simulation

- Metrics are produced inside a dedicated worker so UI updates stay smooth. The
  worker accepts load hints (running jobs and limits) and returns smoothed usage
  samples.
- Keep the worker deterministic. Avoid API calls, and clamp values to a
  realistic range so the gauge does not jitter wildly.
- When adjusting worker logic, update the Jest worker mock in
  `__tests__/resourceMonitor.test.tsx` to keep the tests deterministic.

## UI responsibilities

- Expose control over the parallelism limit, plus explicit pause/resume buttons
  so visitors can experiment with resource policies.
- Surface job counters (queued, running, completed) alongside CPU usage to
  reinforce the relationship between work and system pressure.
- Use `aria-live` regions for alerts so assistive technology announces
  backpressure state changes.

These guidelines keep the app firmly in "safe simulation" territory while
teaching operational guard rails.
