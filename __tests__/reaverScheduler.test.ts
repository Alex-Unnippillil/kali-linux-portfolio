import { BackoffController, AttemptOutcome } from '../apps/reaver/components/Scheduler';

describe('BackoffController', () => {
  it('applies exponential backoff with configurable cap', () => {
    const controller = new BackoffController({
      baseIntervalMs: 100,
      maxIntervalMs: 800,
      now: () => Date.now(),
    });

    expect(controller.currentDelayMs).toBe(100);

    controller.record({ status: 'retry' });
    expect(controller.currentDelayMs).toBe(200);

    controller.record({ status: 'retry' });
    expect(controller.currentDelayMs).toBe(400);

    const third = controller.record({ status: 'retry' });
    expect(controller.currentDelayMs).toBe(800);
    expect(third.nextDelayMs).toBe(800);

    const locked = controller.record({ status: 'locked', overrideDelayMs: 2000 });
    expect(controller.currentDelayMs).toBe(800);
    expect(locked.nextDelayMs).toBe(800);

    controller.record({ status: 'success' });
    expect(controller.currentDelayMs).toBe(100);
  });

  it('records timestamped attempt logs with statuses', () => {
    let callIndex = 0;
    const timestamps: number[] = [0, 1000, 2000];
    const controller = new BackoffController({
      baseIntervalMs: 150,
      maxIntervalMs: 1000,
      now: () => timestamps[callIndex++],
    });

    const outcomes: AttemptOutcome[] = [
      { status: 'retry', message: 'First retry' },
      { status: 'locked', message: 'Lock enforced', overrideDelayMs: 500 },
      { status: 'success', message: 'Recovered' },
    ];

    outcomes.forEach((outcome) => controller.record(outcome));

    const logs = controller.getLogs();
    expect(logs).toHaveLength(3);
    expect(logs[0]).toMatchObject({
      attempt: 1,
      status: 'retry',
      message: 'First retry',
      delayMs: 150,
      timestamp: new Date(0).toISOString(),
    });
    expect(logs[1]).toMatchObject({
      attempt: 2,
      status: 'locked',
      message: 'Lock enforced',
      timestamp: new Date(1000).toISOString(),
    });
    expect(logs[2]).toMatchObject({
      attempt: 3,
      status: 'success',
      message: 'Recovered',
      timestamp: new Date(2000).toISOString(),
    });
  });
});
