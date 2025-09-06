import wmEvents from '../src/wm/eventLayer';

describe('wm event layer', () => {
  jest.useFakeTimers();

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('prevents keyboard focus from overriding recent mouse focus', () => {
    const handler = jest.fn();
    wmEvents.on('focus', handler);
    wmEvents.focus({ id: 'mouse', source: 'mouse' });
    wmEvents.focus({ id: 'keyboard', source: 'keyboard' });
    jest.advanceTimersByTime(60);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ id: 'mouse', source: 'mouse' });
    wmEvents.off('focus', handler);
  });
});
