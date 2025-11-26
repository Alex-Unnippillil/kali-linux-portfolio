import { createCancelScope, type CancelReason } from '../utils/cancel';

describe('cancel scopes', () => {
  test('propagate cancellation to child scope quickly', () => {
    const parent = createCancelScope('parent', { meta: { test: true } });
    const child = parent.child('child', { step: 'leaf' });

    const start = Date.now();
    parent.abort({ message: 'stop' });
    const elapsed = Date.now() - start;
    const reason = child.reason as CancelReason;

    expect(child.signal.aborted).toBe(true);
    expect(elapsed).toBeLessThanOrEqual(200);
    expect(reason.scope).toEqual(['parent', 'child']);
    expect(reason.message).toBe('stop');
    expect(reason.meta).toMatchObject({ test: true, step: 'leaf' });

    child.dispose();
    parent.dispose();
  });

  test('cleans up listeners after abort', () => {
    const parent = createCancelScope('parent');
    const addSpy = jest.spyOn(parent.signal, 'addEventListener');
    const removeSpy = jest.spyOn(parent.signal, 'removeEventListener');
    const child = parent.child('child');

    const abortCall = addSpy.mock.calls.find(([type]) => type === 'abort');
    expect(abortCall).toBeDefined();
    child.abort({ message: 'done' });

    const listener = abortCall?.[1] as EventListener;
    expect(removeSpy).toHaveBeenCalledWith('abort', listener);

    child.dispose();
    parent.dispose();
    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
