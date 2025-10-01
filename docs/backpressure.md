# Backpressure and Worker Pool Limiting

Heavy apps such as OpenVAS parsing, hash conversion, and fixtures imports share
CPU-bound Web Worker pipelines. To prevent the UI from scheduling more work than
browsers can handle, use the shared limiter defined in `utils/backpressure.ts`.

## Registering job types

Each job type needs a label and a concurrency cap. Defaults exist for common
apps (`hash:compute`, `openvas:scan`, `fixtures:parse`, `scanner:scheduled`),
but you can register new ones or override limits:

```ts
import { registerJobType } from '../utils/backpressure';

registerJobType('pcap:decode', {
  label: 'PCAP decoder',
  concurrency: 2,
});
```

Registration is idempotent and can run during module load.

## Enqueueing work

Wrap CPU-heavy tasks so they are routed through the limiter. Jobs are started
only when a slot is available; otherwise they are queued.

```ts
import { enqueueJob } from '../utils/backpressure';

const handle = enqueueJob(
  'pcap:decode',
  {
    run: () => decodePackets(blob),
    cancel: () => controller.abort(),
  },
  {
    label: `Decoding ${fileName}`,
    metadata: { fileName },
  },
);

handle.done.finally(() => console.log('Job finished'));
```

Cancel callbacks should tear down workers (terminate or post a cancel message),
reset progress state, and release any abort controllers.

## UI feedback

Use the shared `<BackpressureNotice />` component to inform users that their job
is queued or paused and expose cancel/resume controls:

```tsx
<BackpressureNotice
  jobId={jobId}
  description="PCAP decode queued behind existing jobs"
/>
```

The notice auto-subscribes to limiter state, so it updates when the queue moves
or when a user pauses/resumes a job.

## Scheduling with limits

`scheduleScan` now accepts an optional options object. Provide a `jobType` to run
scheduled callbacks through the limiter so recurring scans respect global
concurrency:

```ts
scheduleScan('daily', '0 */1 * * * *', () => runDailyScan(), {
  jobType: 'scanner:scheduled',
  metadata: { scope: 'daily' },
});
```

If you omit `jobType` the callback runs immediately, matching legacy behavior.
