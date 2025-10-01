# Worker pool migration guide

The desktop apps that perform heavy parsing or hashing now share a common worker
pool located at `workers/pool/WorkerPool.ts`. Instead of creating ad-hoc
`new Worker(...)` instances inside React components, register the worker once
and enqueue jobs through the pool.

## Registering a worker

```ts
import { workerPool } from '../workers/pool/WorkerPool';

if (typeof window !== 'undefined') {
  workerPool.registerWorker({
    name: 'my-worker',
    create: () => new Worker(new URL('../workers/my-worker.ts', import.meta.url)),
    maxConcurrency: 2,
  });
}
```

`name` must be unique. The `create` callback is invoked whenever the pool needs
an idle worker instance. Adjust `maxConcurrency` to control the number of
parallel executions.

## Worker message contract

Workers use the helper in `workers/pool/messages.ts`:

```ts
import { registerWorkerHandler } from '../workers/pool/messages';

registerWorkerHandler<MyPayload, MyResult, MyProgress>(async (payload, ctx) => {
  // Long running work happens here.
  ctx.reportProgress({ percent: 50 });
  if (ctx.isCancelled()) throw new DOMException('cancelled', 'AbortError');
  return { value: 42 } satisfies MyResult;
});
```

The handler receives:

- `payload` – the typed payload supplied when the job was enqueued.
- `ctx.reportProgress(progress)` – pushes progress snapshots to listeners.
- `ctx.isCancelled()` – returns `true` if the job was cancelled.

Return values are posted back to the pool automatically. Throwing abort errors
prevents stale results from updating React state after cancellation.

## Enqueuing work from React

Use the `useWorkerPool` hook to bind job lifecycle to React state:

```ts
const { enqueueJob, cancelJob } = useWorkerPool<MyPayload, MyResult, MyProgress>('my-worker');

const start = () => {
  const job = enqueueJob({
    payload: { file },
    onProgress: ({ percent }) => setPercent(percent),
  });

  job.promise
    .then(({ value }) => setValue(value))
    .catch((err) => err?.name !== 'AbortError' && console.error(err));
};
```

Always cancel outstanding jobs when unmounting or when starting a replacement
job to keep ≥95% of long running work off the UI thread.
