import { queueActions, queueStore } from '../../../apps/beef/state/queueStore';

describe('BeEF queue store', () => {
  beforeEach(() => {
    queueActions.resetQueue();
  });

  test('enqueues commands with default state', () => {
    const item = queueActions.enqueueCommand('Collect DOM snapshot');
    const { items } = queueStore.getState();

    expect(items).toHaveLength(1);
    expect(item.status).toBe('queued');
    expect(item.retries).toBe(0);
    expect(item.failures).toHaveLength(0);
  });

  test('tracks failures with retry counters and logs', () => {
    const item = queueActions.enqueueCommand('Deploy payload', { maxRetries: 3 });
    queueActions.markCommandRunning(item.id);

    queueActions.markCommandFailure(item.id, 'Sandbox refused inline script execution.');
    queueActions.markCommandFailure(item.id, 'Content-Security-Policy blocked injection.');

    const [stored] = queueStore.getState().items;
    expect(stored.status).toBe('failed');
    expect(stored.retries).toBe(2);
    expect(stored.failures).toHaveLength(2);
    expect(stored.failures[0].attempt).toBe(1);
    expect(stored.failures[1].message).toContain('Content-Security-Policy');
  });

  test('retry only succeeds while attempts remain', () => {
    const item = queueActions.enqueueCommand('Escalate privileges', { maxRetries: 2 });
    queueActions.markCommandFailure(item.id, 'First failure');

    const retried = queueActions.retryCommand(item.id);
    expect(retried?.status).toBe('queued');

    queueActions.markCommandFailure(item.id, 'Second failure');
    const rejected = queueActions.retryCommand(item.id);

    expect(rejected).toBeUndefined();
    const [stored] = queueStore.getState().items;
    expect(stored.retries).toBe(2);
    expect(stored.status).toBe('failed');
  });

  test('remove command clears it from the queue', () => {
    const first = queueActions.enqueueCommand('Stage hook');
    const second = queueActions.enqueueCommand('Await callbacks');

    queueActions.removeCommand(first.id);
    const { items } = queueStore.getState();

    expect(items).toHaveLength(1);
    expect(items[0].id).toBe(second.id);
  });

  test('success clears any last error', () => {
    const item = queueActions.enqueueCommand('Collect screenshot');
    queueActions.markCommandFailure(item.id, 'DOM snapshot timed out.');

    queueActions.markCommandSuccess(item.id);
    const [stored] = queueStore.getState().items;

    expect(stored.status).toBe('success');
    expect(stored.lastError).toBeUndefined();
  });
});
