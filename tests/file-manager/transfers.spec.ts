import { test, expect } from '@playwright/test';

/**
 * Simple transfer manager used to model parallel and queued
 * transfer behaviour for testing purposes.
 */
class TransferManager {
  private mode: 'parallel' | 'queued' = 'parallel';
  private queue: Array<() => Promise<void>> = [];
  private active = 0;

  setMode(mode: 'parallel' | 'queued') {
    this.mode = mode;
  }

  start(task: () => Promise<void>) {
    if (this.mode === 'parallel') {
      this.run(task);
    } else {
      this.queue.push(task);
      if (this.active === 0) {
        this.runNext();
      }
    }
  }

  private run(task: () => Promise<void>) {
    this.active++;
    task().finally(() => {
      this.active--;
      if (this.mode === 'queued' && this.queue.length > 0) {
        this.run(this.queue.shift()!);
      }
    });
  }

  private runNext() {
    const next = this.queue.shift();
    if (next) this.run(next);
  }
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function createJob(index: number, progress: number[]) {
  return () =>
    new Promise<void>((resolve) => {
      let value = 0;
      const handle = setInterval(() => {
        value += 10;
        progress[index] = value;
        if (value >= 100) {
          clearInterval(handle);
          resolve();
        }
      }, 10);
    });
}

test.describe('file manager transfers', () => {
  test('runs jobs in parallel when preference is Parallel', async () => {
    const manager = new TransferManager();
    manager.setMode('parallel');

    const progress = [0, 0];
    manager.start(createJob(0, progress));
    manager.start(createJob(1, progress));

    await delay(40); // allow jobs to make progress
    expect(progress[0]).toBeGreaterThan(0);
    expect(progress[1]).toBeGreaterThan(0);
  });

  test('queues jobs when preference is Queued', async () => {
    const manager = new TransferManager();
    manager.setMode('queued');

    const progress = [0, 0];
    manager.start(createJob(0, progress));
    manager.start(createJob(1, progress));

    await delay(40);
    // only first job should have progressed
    expect(progress[0]).toBeGreaterThan(0);
    expect(progress[1]).toBe(0);
  });
});

