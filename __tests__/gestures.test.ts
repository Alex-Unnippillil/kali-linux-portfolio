import { addPeekStateListener, initializePeekGestures } from '../src/system/gestures';

describe('peek gesture detection', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('emits peek state while the meta key is held', () => {
    const events: boolean[] = [];
    const removeListener = addPeekStateListener(({ active }) => {
      events.push(active);
    });

    const cleanup = initializePeekGestures({ holdDelay: 100 });

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Meta' }));
    jest.advanceTimersByTime(50);
    expect(events).toEqual([]);

    jest.advanceTimersByTime(60);
    expect(events).toEqual([true]);

    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Meta' }));
    expect(events).toEqual([true, false]);

    removeListener();
    cleanup();
  });

  it('cancels the peek if the key is released before the hold delay', () => {
    const events: boolean[] = [];
    const removeListener = addPeekStateListener(({ active }) => {
      events.push(active);
    });

    const cleanup = initializePeekGestures({ holdDelay: 120 });

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Meta' }));
    jest.advanceTimersByTime(60);
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Meta' }));

    expect(events).toEqual([]);

    removeListener();
    cleanup();
  });
});
