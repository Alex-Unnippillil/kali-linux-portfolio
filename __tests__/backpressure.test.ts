import {
  cancelJob,
  enqueueJob,
  registerJobType,
  resetBackpressureForTests,
  resumeJob,
} from '../utils/backpressure';

beforeEach(() => {
  resetBackpressureForTests();
  registerJobType('test:job', { label: 'Test job', concurrency: 1 });
});

afterEach(() => {
  resetBackpressureForTests();
});

describe('backpressure limiter', () => {
  test('queues jobs beyond configured concurrency', async () => {
    let releaseFirst: () => void = () => {};
    const first = enqueueJob(
      'test:job',
      {
        run: () =>
          new Promise<void>((resolve) => {
            releaseFirst = resolve;
          }),
      },
      { id: 'job:first' },
    );

    let secondStarted = false;
    const second = enqueueJob(
      'test:job',
      {
        run: () => {
          secondStarted = true;
        },
      },
      { id: 'job:second' },
    );

    expect(secondStarted).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 0));
    releaseFirst();
    await first.done;
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(secondStarted).toBe(true);
    await second.done;
  });

  test('supports cancellation and resume for queued work', async () => {
    let releaseFirst: () => void = () => {};
    const first = enqueueJob(
      'test:job',
      {
        run: () =>
          new Promise<void>((resolve) => {
            releaseFirst = resolve;
          }),
      },
      { id: 'job:first' },
    );

    const secondState = { started: false };
    const second = enqueueJob(
      'test:job',
      {
        run: () => {
          secondState.started = true;
        },
      },
      { id: 'job:second' },
    );

    expect(cancelJob(second.id)).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(secondState.started).toBe(false);

    expect(resumeJob(second.id)).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(secondState.started).toBe(false);

    releaseFirst();
    await first.done;
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(secondState.started).toBe(true);
    await second.done;
  });
});
