# Faker utilities

The `utils/faker` directory contains deterministic helpers for generating demo
content when real data is not available. Each generator accepts an optional
`seed` argument so tests, Storybook stories, and apps can reproduce the same
output on every run.

## Available generators

### `generateLogs` / `createLogGenerator`

* **Purpose:** Produce Ettercap-style log lines with timestamps and severity
  levels.
* **Default seed:** `ettercap-demo`.
* **Usage:**

  ```ts
  import { createLogGenerator, formatLogEntry } from '@/utils/faker/logs';

  const generator = createLogGenerator({ seed: 'my-demo-seed' });
  const next = generator();
  console.log(formatLogEntry(next));
  ```

### `generateServiceReport`

* **Purpose:** Build a collection of hosts, open services, and associated script
  output for Nmap-style UIs.
* **Default seed:** `service-report-demo`. The Nmap app pins the seed to
  `nmap-nse-demo` so Storybook, tests, and runtime all match.
* **Usage:**

  ```ts
  import { generateServiceReport } from '@/utils/faker/services';

  const report = generateServiceReport({ seed: 'lab-report', hostCount: 4 });
  console.log(report.hosts[0].ports[0].scripts);
  ```

### `generateSerialFrames`

* **Purpose:** Emit serial console frames that look like sensor telemetry.
* **Default seed:** `serial-terminal-demo`.
* **Helpers:** `formatSerialFrame(frame)` creates the combined ASCII + hex line
  used by the Serial Terminal fallback.

## Reproducible tests

* `__tests__/faker.generators.test.ts` checks structure and sanitisation for all
  generators.
* `__tests__/nmapNse.test.tsx` exercises the Nmap fallback path using the
  `nmap-nse-demo` seed.
* `__tests__/serialTerminal.test.tsx` verifies that the Serial Terminal renders
  seeded frames when Web Serial is unavailable.

## Storybook

The stories under `stories/faker/` use the same faker helpers so designers and
reviewers can see consistent demo data without wiring real services.
